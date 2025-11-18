import frappe

def execute():
    # Update fieldtype of standard field in DocField
    frappe.db.set_value(
        "DocField",
        {"parent": "BOM Item", "fieldname": "qty"},
        "fieldtype",
        "Data"
    )

    # Clear cache for changes to apply
    frappe.clear_cache(doctype="BOM Item")

    # Reload the DocType so Frappe reads updated field definitions
    frappe.reload_doc("manufacturing", "doctype", "bom_item")
