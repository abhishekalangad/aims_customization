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
    if not frappe.db.exists("Custom Field", {"dt": "Item", "fieldname": "mould_details_section"}):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Item",
            "fieldname": "mould_details_section",
            "label": "Mould Details Section",
            "fieldtype": "Section Break",
            "insert_after": "mould_details_tab"
        }).insert(ignore_permissions=True)

    # Step 3: Create custom fields under the section
    custom_fields = [
        
        {
            "fieldname": "dia",
            "label": "Dia",
            "fieldtype": "Data",
            "insert_after": "mould_details_section"
        },
        # {
        #     "fieldname": "material_type",
        #     "label": "Material Type",
        #     "fieldtype": "Select",
        #     "options": "\nSteel\nAluminium\nBrass\nCopper",
        #     "insert_after": "dia"
        # },
        # {
        #     "fieldname": "weight_approx",
        #     "label": "Weight Approx (Kg)",
        #     "fieldtype": "Data",
        #     "insert_after": "material_type"
        # }
    ]

    for field in custom_fields:
        if not frappe.db.exists("Custom Field", {"dt": "Item", "fieldname": field["fieldname"]}):
            frappe.get_doc({
                "doctype": "Custom Field",
                "dt": "Item",
                **field
            }).insert(ignore_permissions=True)

    frappe.db.commit()
