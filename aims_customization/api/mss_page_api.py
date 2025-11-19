import frappe
from datetime import datetime

# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------
def safe(val):
    return val if val not in (None, "") else ""

def _month_str_from_date(dt):
    if not dt:
        return ""
    if isinstance(dt, str):
        try:
            dt = datetime.strptime(dt, "%Y-%m-%d")
        except Exception:
            return ""
    return dt.strftime("%b-%y")  # e.g. Jul-25

def _get_bin_totals(item_code):
    row = frappe.db.sql("""
        SELECT 
            IFNULL(SUM(actual_qty),0) AS actual_qty,
            IFNULL(SUM(stock_value),0) AS stock_value
        FROM `tabBin`
        WHERE item_code = %s
    """, (item_code,), as_dict=True)
    return row[0] if row else {"actual_qty": 0, "stock_value": 0}

def _get_dispatched_totals(sales_order, item_code):
    row = frappe.db.sql("""
        SELECT 
            IFNULL(SUM(dni.qty),0) AS qty,
            IFNULL(SUM(dni.amount),0) AS amount
        FROM `tabDelivery Note Item` dni
        INNER JOIN `tabDelivery Note` dn ON dn.name = dni.parent
        WHERE dni.against_sales_order = %s
          AND dni.item_code = %s
          AND dn.docstatus = 1
    """, (sales_order, item_code), as_dict=True)
    return row[0] if row else {"qty": 0, "amount": 0}

def _get_production_totals(sales_order, item_code):
    row = frappe.db.sql("""
        SELECT 
            IFNULL(SUM(produced_qty),0) AS produced_qty,
            IFNULL(SUM(material_transferred_for_manufacturing),0) AS material_transferred_for_manufacturing
        FROM `tabWork Order`
        WHERE sales_order = %s
          AND production_item = %s
    """, (sales_order, item_code), as_dict=True)
    return row[0] if row else {"produced_qty": 0, "material_transferred_for_manufacturing": 0}

def _get_jobcard_consumed_for_wo(wo_name, item_code):
    row = frappe.db.sql("""
        SELECT IFNULL(SUM(sei.qty),0) AS consumed_qty
        FROM `tabStock Entry Detail` sei
        INNER JOIN `tabStock Entry` se ON se.name = sei.parent
        WHERE se.job_card IN (
            SELECT name FROM `tabJob Card` WHERE work_order = %s
        )
        AND sei.item_code = %s
        AND se.docstatus = 1
        AND se.purpose IN ('Manufacture', 'Material Consumption for Manufacture')
    """, (wo_name, item_code), as_dict=True)
    return row[0]["consumed_qty"] if row else 0

def _get_reserved_qty(item_code):
    row = frappe.db.sql("""
        SELECT IFNULL(SUM(actual_qty),0) AS reserved
        FROM `tabMaterial Request Item`
        WHERE item_code = %s
    """, (item_code,), as_dict=True)
    return row[0]["reserved"] if row else 0

def _get_incoming_qty(item_code):
    row = frappe.db.sql("""
        SELECT IFNULL(SUM(pii.qty - IFNULL(pii.received_qty,0)),0) AS incoming
        FROM `tabPurchase Order Item` pii
        INNER JOIN `tabPurchase Order` po ON po.name = pii.parent
        WHERE pii.item_code = %s
          AND po.docstatus = 1
          AND po.status NOT IN ('Completed', 'Closed')
    """, (item_code,), as_dict=True)
    return row[0]["incoming"] if row else 0

# ----------------------------------------------------------------------
# LEVEL 1: Get Sales Orders
# ----------------------------------------------------------------------
@frappe.whitelist()
def get_sales_orders(search_text=None, month=None, customer=None, limit=200):
    """
    Returns list of sales orders summarised (name, customer, month, transaction_date, blanket qty if present)
    """
    params = []
    sql = """
        SELECT name, customer, customer_name, transaction_date, delivery_date, status
        FROM `tabSales Order`
        WHERE docstatus = 1
    """

    if customer:
        sql += " AND customer = %s"
        params.append(customer)

    if search_text:
        sql += " AND (name LIKE %s OR customer_name LIKE %s)"
        params.extend([f"%{search_text}%", f"%{search_text}%"])

    if month:
        # accept 'Jul-25' or 'YYYY-MM'
        try:
            if "-" in month and len(month.split("-")[-1]) == 2:
                dt = datetime.strptime(month, "%b-%y")
            else:
                dt = datetime.strptime(month, "%Y-%m")
            sql += " AND YEAR(transaction_date) = %s AND MONTH(transaction_date) = %s"
            params.extend([dt.year, dt.month])
        except Exception:
            # ignore month filter if parse fails
            pass

    sql += " ORDER BY transaction_date DESC LIMIT %s"
    params.append(int(limit))

    rows = frappe.db.sql(sql, tuple(params), as_dict=True) or []

    result = []
    for r in rows:
        result.append({
            "name": r.get("name"),
            "customer": r.get("customer"),
            "customer_name": r.get("customer_name"),
            "transaction_date": r.get("transaction_date"),
            "month": _month_str_from_date(r.get("transaction_date")),
            # attempt to pick blanket field if available
            # "blanket_order_qty": frappe.get_value("Sales Order", r.get("name"), "blanket_order_qty") or 0
        })
    return result

# ----------------------------------------------------------------------
# LEVEL 2: Items for a Sales Order
# ----------------------------------------------------------------------
@frappe.whitelist()
def get_items_for_sales_order(sales_order):
    """
    Returns list of item lines for a sales order with stock/dispatch/production computed.
    """
    if not sales_order:
        return []

    soi_list = frappe.get_all(
        "Sales Order Item",
        filters={"parent": sales_order},
        fields=["name", "item_code", "item_name", "qty", "rate", "bom_no", "warehouse"]
    )

    items = []
    for line in soi_list:
        bin_tot = _get_bin_totals(line.item_code)
        dispatched = _get_dispatched_totals(sales_order, line.item_code)
        production = _get_production_totals(sales_order, line.item_code)

        produced_stock_nos = production.get("produced_qty", 0)
        produced_stock_amt = (produced_stock_nos or 0) * (line.rate or 0)

        material_transferred = production.get("material_transferred_for_manufacturing", 0)
        wip_stock_nos = max((material_transferred or 0) - (produced_stock_nos or 0), 0)
        wip_stock_amt = wip_stock_nos * (line.rate or 0)

        total_stock_nos = bin_tot["actual_qty"] + wip_stock_nos
        total_stock_amt = (bin_tot["stock_value"] or 0) + wip_stock_amt

        balance_to_produce_qty = (line.qty or 0) - (produced_stock_nos or 0)
        balance_to_deliver_qty = (line.qty or 0) - (dispatched.get("qty", 0) or 0)

        # item attributes
        cavity = frappe.get_value("Item", line.item_code, "cavity") or None
        pcs_wt = frappe.get_value("Item", line.item_code, "pcs_wt") or None
        runner_wt = frappe.get_value("Item", line.item_code, "runner_wt") or None
        shot_wt = frappe.get_value("Item", line.item_code, "shot_wt") or None
        weight_per_unit = frappe.get_value("Item", line.item_code, "weight_per_unit") or None

        items.append({
            "so_name": sales_order,
            "item_code": line.item_code,
            "item_name": line.item_name,
            "order_qty": line.qty,
            "rate": line.rate,
            "bom_no": safe(line.bom_no),
            "warehouse": safe(line.warehouse),

            "cavity": safe(cavity),
            "pcs_wt": safe(pcs_wt),
            "runner_wt": safe(runner_wt),
            "shot_wt": safe(shot_wt),
            "weight_per_unit": safe(weight_per_unit),

            "available_stock_nos": bin_tot.get("actual_qty", 0),
            "available_stock_amt": bin_tot.get("stock_value", 0),
            "dispatched_qty_nos": dispatched.get("qty", 0),
            "dispatched_amt": dispatched.get("amount", 0),
            "produced_stock_nos": produced_stock_nos,
            "produced_stock_amt": produced_stock_amt,
            "wip_stock_nos": wip_stock_nos,
            "wip_stock_amt": wip_stock_amt,
            "total_stock_nos": total_stock_nos,
            "total_stock_amt": total_stock_amt,
            "total_plus_produced_nos": total_stock_nos + produced_stock_nos,
            "total_plus_produced_amt": total_stock_amt + produced_stock_amt,
            "balance_to_produce_qty": balance_to_produce_qty,
            "balance_to_produce_amt": (balance_to_produce_qty or 0) * (line.rate or 0),
            "balance_to_deliver_qty": balance_to_deliver_qty,
            "balance_to_deliver_amt": (balance_to_deliver_qty or 0) * (line.rate or 0),

            "reserved_qty": _get_reserved_qty(line.item_code),
            "incoming_qty": _get_incoming_qty(line.item_code)
        })

    return items

# ----------------------------------------------------------------------
# LEVEL 3: List ALL BOMs for an Item
# ----------------------------------------------------------------------
@frappe.whitelist()
def get_boms_for_item(item_code, so_qty=0):
    """
    Returns ALL active BOMs for an item and BOM items scaled by SO Qty.
    """
    if not item_code:
        return []

    # Get all BOMs linked to Item
    bom_list = frappe.get_all(
        "BOM",
        filters={"item": item_code, "is_active": 1},
        fields=["name as bom_no", "item", "quantity as bom_qty"]
    )

    result = []

    for bom in bom_list:
        bom_items = frappe.db.sql("""
            SELECT 
                bi.item_code,
                bi.item_name,
                bi.stock_qty AS bom_item_qty,
                bi.rate,
                (bi.stock_qty * %s) AS required_qty
            FROM `tabBOM Item` bi
            WHERE bi.parent = %s
        """, (float(so_qty), bom.bom_no), as_dict=True)

        result.append({
            "bom_no": bom.bom_no,
            "bom_qty": bom.bom_qty,
            "item_code": item_code,
            "bom_items": bom_items
        })

    return result

# ----------------------------------------------------------------------
# LEVEL 4: Raw materials for a BOM
# ----------------------------------------------------------------------
@frappe.whitelist()
def get_raw_materials_for_bom(bom_no, so_qty=0):
    """
    Return BOM Item lines enriched with available and consumed qty.
    """
    if not bom_no:
        return []

    # join bin for available qty
    rows = frappe.db.sql("""
        SELECT 
            bi.item_code AS bom_item_code,
            bi.item_name AS bom_item_name,
            bi.stock_qty AS bom_qty,
            (bi.stock_qty * %s) AS required_qty,
            IFNULL(bin.actual_qty,0) AS available_qty
        FROM `tabBOM Item` bi
        LEFT JOIN `tabBin` bin ON bin.item_code = bi.item_code
        WHERE bi.parent = %s
    """, (float(so_qty), bom_no), as_dict=True)

    # add consumed qty per RM from Stock Entry (manufacture)
    result = []
    for r in rows:
        consumed = frappe.db.sql("""
            SELECT IFNULL(SUM(sei.qty),0) AS consumed_qty
            FROM `tabStock Entry Detail` sei
            INNER JOIN `tabStock Entry` se ON se.name = sei.parent
            WHERE sei.item_code = %s
              AND se.docstatus = 1
              AND se.purpose IN ('Manufacture', 'Material Consumption for Manufacture')
        """, (r.get("bom_item_code"),), as_dict=True)
        consumed_val = consumed[0].get("consumed_qty") if consumed else 0
        rec = {
            "bom_item_code": r.get("bom_item_code"),
            "bom_item_name": r.get("bom_item_name"),
            "bom_qty": r.get("bom_qty"),
            "required_qty": r.get("required_qty"),
            "available_qty": r.get("available_qty"),
            "consumed_qty": consumed_val
        }
        result.append(rec)
    return result

# ----------------------------------------------------------------------
# LEVEL 5: Work Orders for Sales Order
# ----------------------------------------------------------------------
@frappe.whitelist()
def get_work_orders_for_sales_order(sales_order):
    if not sales_order:
        return []
    wo_list = frappe.get_all("Work Order", filters={"sales_order": sales_order}, fields=["name", "production_item", "qty", "produced_qty", "status", "planned_start_date"])
    result = []
    for wo in wo_list:
        result.append({
            "wo_name": wo.name,
            "production_item": wo.production_item,
            "wo_qty": wo.qty,
            "produced_qty": wo.produced_qty,
            "status": wo.status,
            "planned_start_date": safe(wo.planned_start_date)
        })
    return result

# ----------------------------------------------------------------------
# LEVEL 6: Job Cards for Work Order (ERPNext 15 FIX)
# ----------------------------------------------------------------------
@frappe.whitelist()
def get_job_cards_for_work_order(work_order):
    if not work_order:
        return []

    # ERPNext v15 uses "production_order" instead of "work_order"
    jc_list = frappe.get_all(
        "Job Card",
        filters={"work_order": work_order},
        fields=["name", "status", "workstation", "operation", "for_quantity"]
    )

    result = []
    for jc in jc_list:

        # Job Card Items
        jc_items = frappe.get_all(
            "Job Card Item",
            filters={"parent": jc.name},
            fields=["item_code", "item_name", "required_qty AS qty"]
        )

        for jci in jc_items:
            consumed = _get_jobcard_consumed_for_wo(work_order, jci.item_code)

            result.append({
                "job_card": jc.name,
                "job_card_status": jc.status,
                "operation": jc.operation,
                "workstation": jc.workstation,

                "rm_item_code": jci.item_code,
                "rm_item_name": jci.item_name,

                "required_qty": jci.qty,
                "available_qty": _get_bin_totals(jci.item_code)["actual_qty"],
                "consumed_qty": consumed
            })

    return result
