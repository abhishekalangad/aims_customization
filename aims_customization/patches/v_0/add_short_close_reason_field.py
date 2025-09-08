import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Sales Order": [
            dict(
                fieldname="short_close_reason",
                label="Short Close Reason",
                fieldtype="Small Text",
                insert_after="has_unit_price_items"  # change to whichever field you want it after
            )
        ]
    }

    create_custom_fields(custom_fields, update=True)
