import frappe

def execute():
    # Check if the field exists
    field = frappe.db.get_value(
        "Custom Field",
        {"dt": "Item", "fieldname": "dia"},
        "name"
    )

    if field:
        # Update field properties
        frappe.db.set_value(
            "Custom Field",
            field,
            {
                "reqd": 1,  # make mandatory
                "depends_on": 'eval:doc.item_group == "Tool Room RM Round"',
            },
        )
        frappe.clear_cache(doctype="Item")
