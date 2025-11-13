import frappe

def execute():
    
    # Step 2: Create Section Break inside Mould Details tab
    if not frappe.db.exists("Custom Field", {"dt": "BOM", "fieldname": "part_specification_section"}):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "BOM",
            "fieldname": "part_specification_section",
            "label": "Part Specification Section",
            "fieldtype": "Section Break",
            "insert_after": "conversion_rate"
        }).insert(ignore_permissions=True)

    
   
    # Step 3: Create custom fields under the section
    custom_fields = [
        
        {
            "fieldname": "cavity",
            "label": "Cavity",
            "fieldtype": "Int",
            "insert_after": "part_specification_section",
            "read_only":1,
            "fetch_from": "item.cavity"
        },
        {
            "fieldname": "pcs_wt",
            "label": "PCS Weight",
            "fieldtype": "Data",
            "insert_after": "cavity",
            "read_only":1,
            "fetch_from": "item.pcs_wt"
        },
        {
            "fieldname": "runner_wt",
            "label": "Runner Weight",
            "fieldtype": "Data",
            "insert_after": "pcs_wt",
            "read_only":1,
            "fetch_from": "item.runner_wt"
        },
        {
            "fieldname": "shot_wt",
            "label": "Shot Weight",
            "fieldtype": "Data",
            "insert_after": "runner_wt",
            "read_only":1,
            "fetch_from": "item.shot_wt"
        },
        {
            "fieldname": "gross_wt",
            "label": "Gross Weight",
            "fieldtype": "Data",
            "insert_after": "shot_wt",
            "read_only":1,
            "fetch_from": "item.gross_wt"
        },
        {
            "fieldname": "cycle_time",
            "label": "Cycle Time",
            "fieldtype": "Data",
            "insert_after": "gross_wt",
            "read_only":1,
            "fetch_from": "item.cycle_time"
        }

        
    ]

    


    for field in custom_fields:
        if not frappe.db.exists("Custom Field", {"dt": "BOM", "fieldname": field["fieldname"]}):
            frappe.get_doc({
                "doctype": "Custom Field",
                "dt": "BOM",
                **field
            }).insert(ignore_permissions=True)

    frappe.db.commit()
