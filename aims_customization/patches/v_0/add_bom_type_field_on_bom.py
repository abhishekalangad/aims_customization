import frappe

def execute():
    """Patch to add 'BOM Type' field to BOM doctype"""

    if not frappe.db.exists("Custom Field", "BOM-bom_type"):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "BOM",
            "fieldname": "bom_type",
            "label": "BOM Type",
            "fieldtype": "Select",
            "options": "\nFG\nSFG",
            "reqd": 1,
            "insert_after": "image",  # change position if needed
        }).insert(ignore_permissions=True)

        frappe.db.commit()
