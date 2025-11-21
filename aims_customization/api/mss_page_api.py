# aims_customization/api/mss_page_api.py
from __future__ import annotations
import json
from datetime import datetime
import frappe

# ---------------- helpers ----------------
def safe(val): return val if val not in (None, "") else ""

def _month_str_from_date(dt):
    if not dt: return ""
    if isinstance(dt, str):
        try: dt = datetime.strptime(dt, "%Y-%m-%d")
        except Exception: return ""
    return dt.strftime("%b-%y")

def _get_bin_totals(item_code):
    row = frappe.db.sql("""
        SELECT IFNULL(SUM(actual_qty),0) AS actual_qty,
               IFNULL(SUM(stock_value),0) AS stock_value
        FROM `tabBin` WHERE item_code=%s
    """, (item_code,), as_dict=True)
    return row[0] if row else {"actual_qty":0,"stock_value":0}

def _get_dispatched_totals(sales_order, item_code):
    row = frappe.db.sql("""
        SELECT IFNULL(SUM(dni.qty),0) AS qty, IFNULL(SUM(dni.amount),0) AS amount
        FROM `tabDelivery Note Item` dni
        JOIN `tabDelivery Note` dn ON dn.name = dni.parent
        WHERE dni.against_sales_order=%s AND dni.item_code=%s AND dn.docstatus=1
    """, (sales_order, item_code), as_dict=True)
    return row[0] if row else {"qty":0,"amount":0}

def _get_production_totals(sales_order, item_code):
    row = frappe.db.sql("""
        SELECT IFNULL(SUM(produced_qty),0) AS produced_qty,
               IFNULL(SUM(material_transferred_for_manufacturing),0) AS material_transferred_for_manufacturing
        FROM `tabWork Order`
        WHERE sales_order=%s AND production_item=%s
    """, (sales_order, item_code), as_dict=True)
    return row[0] if row else {"produced_qty":0,"material_transferred_for_manufacturing":0}

def _get_jobcard_consumed_for_wo(wo_name, item_code):
    row = frappe.db.sql("""
        SELECT IFNULL(SUM(sei.qty),0) AS consumed_qty
        FROM `tabStock Entry Detail` sei
        JOIN `tabStock Entry` se ON se.name = sei.parent
        WHERE se.job_card IN (SELECT name FROM `tabJob Card` WHERE work_order=%s)
          AND sei.item_code=%s AND se.docstatus=1
          AND se.purpose IN ('Manufacture','Material Consumption for Manufacture')
    """, (wo_name, item_code), as_dict=True)
    return row[0].get("consumed_qty",0) if row else 0

def _get_reserved_qty(item_code):
    row = frappe.db.sql("""
        SELECT IFNULL(SUM(actual_qty),0) as reserved
        FROM `tabMaterial Request Item` WHERE item_code=%s
    """, (item_code,), as_dict=True)
    return row[0].get("reserved",0) if row else 0

def _get_incoming_qty(item_code):
    row = frappe.db.sql("""
        SELECT IFNULL(SUM(pii.qty - IFNULL(pii.received_qty,0)),0) as incoming
        FROM `tabPurchase Order Item` pii
        JOIN `tabPurchase Order` po ON po.name=pii.parent
        WHERE pii.item_code=%s AND po.docstatus=1 AND po.status NOT IN ('Completed','Closed')
    """, (item_code,), as_dict=True)
    return row[0].get("incoming",0) if row else 0

# ---------------- LEVEL 1: Sales Orders (existing) ----------------
@frappe.whitelist()
def get_sales_orders(search_text=None, month=None, customer=None, limit=200):
    params = []
    sql = """SELECT name, customer, customer_name, transaction_date, delivery_date, status
             FROM `tabSales Order` WHERE docstatus = 1"""
    if customer:
        sql += " AND customer = %s"; params.append(customer)
    if search_text:
        sql += " AND (name LIKE %s OR customer_name LIKE %s)"; params.extend([f"%{search_text}%", f"%{search_text}%"])
    if month:
        try:
            if "-" in month and len(month.split("-")[-1]) == 2:
                dt = datetime.strptime(month, "%b-%y")
            else:
                dt = datetime.strptime(month, "%Y-%m")
            sql += " AND YEAR(transaction_date)=%s AND MONTH(transaction_date)=%s"; params.extend([dt.year, dt.month])
        except Exception:
            pass
    sql += " ORDER BY transaction_date DESC LIMIT %s"; params.append(int(limit))
    rows = frappe.db.sql(sql, tuple(params), as_dict=True) or []
    result = []
    for r in rows:
        result.append({
            "name": r.get("name"),
            "customer": r.get("customer"),
            "customer_name": r.get("customer_name"),
            "transaction_date": r.get("transaction_date"),
            "month": _month_str_from_date(r.get("transaction_date")),
            "delivery_date": r.get("delivery_date"),
            "status": r.get("status")
        })
    return result

# ---------------- LEVEL 2: Items for multiple Sales Orders (SQL-optimized) ----------------
@frappe.whitelist()
def get_items_for_sales_orders(so_list=None):
    """
    so_list: JSON string array or comma-separated; returns all Sales Order Item lines for those SOs with stock/production/dispatch computed.
    """
    if not so_list:
        return []
    if isinstance(so_list, str):
        try:
            so_list = json.loads(so_list)
        except Exception:
            so_list = [s.strip() for s in so_list.split(",") if s.strip()]
    if not so_list: return []

    # parameterize IN clause
    placeholders = ",".join(["%s"] * len(so_list))
    sql = f"""
        SELECT soi.name, soi.parent as so_name, soi.item_code, soi.item_name, soi.qty as order_qty, soi.rate, soi.bom_no, soi.warehouse
        FROM `tabSales Order Item` soi
        WHERE soi.parent IN ({placeholders})
        ORDER BY soi.parent, soi.idx
    """
    rows = frappe.db.sql(sql, tuple(so_list), as_dict=True) or []

    result = []
    for line in rows:
        bin_tot = _get_bin_totals(line.item_code)
        dispatched = _get_dispatched_totals(line.so_name, line.item_code)
        production = _get_production_totals(line.so_name, line.item_code)
        produced_stock_nos = production.get("produced_qty", 0)
        produced_stock_amt = produced_stock_nos * (line.rate or 0)
        material_transferred = production.get("material_transferred_for_manufacturing", 0)
        wip_stock_nos = max((material_transferred or 0) - (produced_stock_nos or 0), 0)
        wip_stock_amt = wip_stock_nos * (line.rate or 0)
        total_stock_nos = (bin_tot.get("actual_qty",0) or 0) + wip_stock_nos
        total_stock_amt = (bin_tot.get("stock_value",0) or 0) + wip_stock_amt
        balance_to_produce_qty = (line.order_qty or 0) - (produced_stock_nos or 0)
        balance_to_deliver_qty = (line.order_qty or 0) - (dispatched.get("qty",0) or 0)

        # item attributes from Item table
        item_attrs = frappe.db.get_value("Item", line.item_code, ["cavity","pcs_wt","runner_wt","shot_wt","weight_per_unit"], as_dict=True) or {}

        result.append({
            "name": line.name,
            "so_name": line.so_name,
            "item_code": line.item_code,
            "item_name": line.item_name,
            "order_qty": line.order_qty,
            "rate": line.rate,
            "bom_no": safe(line.bom_no),
            "warehouse": safe(line.warehouse),
            "cavity": safe(item_attrs.get("cavity")),
            "pcs_wt": safe(item_attrs.get("pcs_wt")),
            "runner_wt": safe(item_attrs.get("runner_wt")),
            "shot_wt": safe(item_attrs.get("shot_wt")),
            "weight_per_unit": safe(item_attrs.get("weight_per_unit")),
            "available_stock_nos": bin_tot.get("actual_qty",0),
            "available_stock_amt": bin_tot.get("stock_value",0),
            "dispatched_qty_nos": dispatched.get("qty",0),
            "dispatched_amt": dispatched.get("amount",0),
            "produced_stock_nos": produced_stock_nos,
            "produced_stock_amt": produced_stock_amt,
            "wip_stock_nos": wip_stock_nos,
            "wip_stock_amt": wip_stock_amt,
            "total_stock_nos": total_stock_nos,
            "total_stock_amt": total_stock_amt,
            "total_plus_produced_nos": (total_stock_nos or 0) + (produced_stock_nos or 0),
            "total_plus_produced_amt": (total_stock_amt or 0) + (produced_stock_amt or 0),
            "balance_to_produce_qty": balance_to_produce_qty,
            "balance_to_produce_amt": (balance_to_produce_qty or 0) * (line.rate or 0),
            "balance_to_deliver_qty": balance_to_deliver_qty,
            "balance_to_deliver_amt": (balance_to_deliver_qty or 0) * (line.rate or 0),
            "reserved_qty": _get_reserved_qty(line.item_code),
            "incoming_qty": _get_incoming_qty(line.item_code)
        })
    return result

# ---------------- LEVEL 3: Get BOMs for a list of items (SQL-friendly) ----------------
@frappe.whitelist()
def get_boms_for_items(items=None):
    """
    items: JSON array of {item_code, qty, so, bom_no}
    returns list of BOM entries with bom_items and required_for_selected_qty
    """
    if not items: return []
    if isinstance(items, str):
        try: items = json.loads(items)
        except Exception: items = []

    result = []
    for it in items:
        item_code = it.get("item_code")
        required_qty = float(it.get("qty") or 0)
        forced_bom = it.get("bom_no") or None

        # choose BOMs
        boms = []
        if forced_bom:
            b = frappe.db.sql("""SELECT name as bom_no, item as item, quantity as bom_qty FROM `tabBOM` WHERE name=%s LIMIT 1""", (forced_bom,), as_dict=True)
            boms = b or []
        else:
            b = frappe.db.sql("""SELECT name as bom_no, item as item, quantity as bom_qty FROM `tabBOM` WHERE item=%s AND is_active=1""", (item_code,), as_dict=True)
            boms = b or []

        for b in boms:
            # fetch bom items
            bom_items = frappe.db.sql("""SELECT item_code as rm_item_code, item_name, stock_qty as qty_per_bom FROM `tabBOM Item` WHERE parent=%s ORDER BY idx""", (b.bom_no,), as_dict=True) or []
            # compute required_for_selected_qty (scale by required_qty)
            # required_for_selected_qty = required_qty (we keep that for clarity)
            result.append({
                "item_code": item_code,
                "bom_no": b.bom_no,
                "bom_qty": b.get("bom_qty") or 0,
                "bom_items": bom_items,
                "required_for_selected_qty": required_qty
            })
    return result

# ---------------- LEVEL 4: Raw materials for selected BOMs (aggregated) ----------------
@frappe.whitelist()
def get_raw_materials_for_boms(boms=None):
    """
    boms: JSON array [{bom_no, required_for_selected_qty}, ...]
    returns aggregated RM list with total_required_qty and available/consumed
    """
    if not boms: return []
    if isinstance(boms, str):
        try: boms = json.loads(boms)
        except Exception: boms = []

    rm_totals = {}
    for b in boms:
        bom_no = b.get("bom_no")
        req_qty = float(b.get("required_for_selected_qty") or 0)
        if not bom_no: continue

        bom = frappe.db.sql("""SELECT name, quantity as bom_qty FROM `tabBOM` WHERE name=%s LIMIT 1""", (bom_no,), as_dict=True) or []
        bom_qty = bom[0].get("bom_qty") if bom else 1.0

        components = frappe.db.sql("""SELECT item_code, item_name, stock_qty as qty FROM `tabBOM Item` WHERE parent=%s""", (bom_no,), as_dict=True) or []
        for comp in components:
            try:
                comp_required = (req_qty / (bom_qty or 1.0)) * (comp.get("qty") or 0.0)
            except Exception:
                comp_required = 0.0
            rm = comp.get("item_code")
            if rm not in rm_totals:
                rm_totals[rm] = {"rm_item_code": rm, "rm_item_name": comp.get("item_name") or "", "total_required_qty": 0.0}
            rm_totals[rm]["total_required_qty"] += comp_required

    res = []
    for rm, v in rm_totals.items():
        bin_tot = _get_bin_totals(rm)
        # consumed via stock entry approximation (could be improved)
        consumed_row = frappe.db.sql("""SELECT IFNULL(SUM(sei.qty),0) AS consumed_qty
                                        FROM `tabStock Entry Detail` sei
                                        JOIN `tabStock Entry` se ON se.name=sei.parent
                                        WHERE sei.item_code=%s AND se.docstatus=1 AND se.purpose IN ('Manufacture','Material Consumption for Manufacture')""", (rm,), as_dict=True)
        consumed = consumed_row[0].get("consumed_qty",0) if consumed_row else 0
        res.append({
            "rm_item_code": v["rm_item_code"],
            "rm_item_name": v["rm_item_name"],
            "total_required_qty": round(v["total_required_qty"],6),
            "available_qty": bin_tot.get("actual_qty",0),
            "consumed_qty": consumed
        })
    return res

# ---------------- LEVEL 5: Work Orders aggregated for selected Sales Orders ----------------
@frappe.whitelist()
def get_work_orders_for_sales_orders(so_list=None):
    if not so_list: return []
    if isinstance(so_list, str):
        try: so_list = json.loads(so_list)
        except Exception: so_list = [s.strip() for s in so_list.split(",") if s.strip()]
    if not so_list: return []
    placeholders = ",".join(["%s"] * len(so_list))
    sql = f"""SELECT name as wo_name, production_item, qty as wo_qty, IFNULL(produced_qty,0) as produced_qty, sales_order
              FROM `tabWork Order` WHERE sales_order IN ({placeholders}) AND docstatus=1 ORDER BY modified DESC"""
    rows = frappe.db.sql(sql, tuple(so_list), as_dict=True) or []
    return rows

# ---------------- LEVEL 6: Job Cards for selected work orders (aggregated) ----------------
@frappe.whitelist()
def get_job_cards_for_work_orders(wo_list=None):
    if not wo_list: return []
    if isinstance(wo_list, str):
        try: wo_list = json.loads(wo_list)
        except Exception: wo_list = [s.strip() for s in wo_list.split(",") if s.strip()]
    if not wo_list: return []
    placeholders = ",".join(["%s"] * len(wo_list))
    jcs = frappe.db.sql(f"""SELECT name as job_card, status as job_card_status, operation, workstation, work_order
                             FROM `tabJob Card` WHERE work_order IN ({placeholders})""", tuple(wo_list), as_dict=True) or []

    result = []
    for jc in jcs:
        jc_items = frappe.db.sql("""SELECT item_code, item_name, required_qty as qty FROM `tabJob Card Item` WHERE parent=%s""", (jc.job_card,), as_dict=True) or []
        if jc_items:
            for ji in jc_items:
                consumed = _get_jobcard_consumed_for_wo(jc.work_order, ji.get("item_code"))
                bin_tot = _get_bin_totals(ji.get("item_code"))
                result.append({
                    "job_card": jc.job_card,
                    "job_card_status": jc.job_card_status,
                    "operation": jc.operation,
                    "workstation": jc.workstation,
                    "rm_item_code": ji.get("item_code"),
                    "rm_item_name": ji.get("item_name"),
                    "required_qty": ji.get("qty"),
                    "available_qty": bin_tot.get("actual_qty",0),
                    "consumed_qty": consumed
                })
        else:
            result.append({
                "job_card": jc.job_card,
                "job_card_status": jc.job_card_status,
                "operation": jc.operation,
                "workstation": jc.workstation,
                "rm_item_code": "",
                "rm_item_name": "",
                "required_qty": 0,
                "available_qty": 0,
                "consumed_qty": 0
            })
    return result
