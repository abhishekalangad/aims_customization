import frappe

def execute():
    # Step 1: Create Tab Break for "Mould Details"
    if not frappe.db.exists("Custom Field", {"dt": "Item", "fieldname": "mould_details_tab"}):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Item",
            "fieldname": "mould_details_tab",
            "label": "Mould Details",
            "fieldtype": "Tab Break",
            "insert_after": "total_projected_qty"
        }).insert(ignore_permissions=True)

    # Step 2: Create Section Break inside Mould Details tab
    if not frappe.db.exists("Custom Field", {"dt": "Item", "fieldname": "Mould_details_section"}):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Item",
            "fieldname": "Mould_details_section",
            "label": "Mould Details Section",
            "fieldtype": "Section Break",
            "insert_after": "mould_details_tab"
        }).insert(ignore_permissions=True)

    

    

    # Step 3: Create custom fields under the section
    custom_fields = [
        
        {
        "fieldname": "mould_type",
        "fieldtype": "Link",
        "label": "Mould Type",
        "options": "Mould Type",
        "insert_after": "Mould_details_section"
        },
        {
        "fieldname": "total_shot",
        "fieldtype": "Data",
        "label": "Total Shot Count",
         "insert_after": "mould_type"
        },
        {
            "fieldname": "cavity_coun",
            "fieldtype": "Float",
            "label": "No of Cavity",
            "insert_after": "total_shot"
        },
        {
        "fieldname": "mould_lif",
        "fieldtype": "Data",
        "label": "Mould Life (Years)",
        "insert_after": "cavity_coun"
        }
                        
        
    ]

    


    for field in custom_fields:
        if not frappe.db.exists("Custom Field", {"dt": "Item", "fieldname": field["fieldname"]}):
            frappe.get_doc({
                "doctype": "Custom Field",
                "dt": "Item",
                **field
            }).insert(ignore_permissions=True)

    frappe.db.commit()
