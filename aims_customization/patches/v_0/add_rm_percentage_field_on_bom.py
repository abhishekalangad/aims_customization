import frappe

def execute():
    # Check if custom field already exists
    if not frappe.db.exists("Custom Field", "BOM Item-rm_percentage"):
        custom_field = frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "BOM Item",              # Doctype name
            "fieldname": "rm_percentage",  # Fieldname
            "label": "RM Percentage",      # Label
            "fieldtype": "Data",            # Field Type
            "insert_after": "item_code",   # Insert after item_code
            "in_list_view": 1           # ✅ Show in list view
                                
        })
        custom_field.insert(ignore_permissions=True)
        frappe.db.commit()
