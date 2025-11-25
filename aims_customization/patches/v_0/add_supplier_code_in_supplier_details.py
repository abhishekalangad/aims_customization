import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
 
def execute():

    custom_fields = {

        # -------------------------  
        # SALES INVOICE  
        # -------------------------
        "Sales Invoice": [
            dict(
                fieldname="vendor",
                label="Vendor",
                fieldtype="Link",
                options="Supplier",
                insert_after="customer",
                reqd=0
            ),

            # NEW FIELD 1 — Declaration (under Terms tab)
            dict(
                fieldname="declaration",
                label="Declaration",
                fieldtype="Small Text",
                insert_after="terms",   # under Terms tab
                reqd=0
            ),

            # NEW FIELD 2 — Subject To (under Declaration field)
            # dict(
            #     fieldname="subject_to",
            #     label="Subject To",
            #     fieldtype="Data",
            #     insert_after="declaration",
            #     reqd=0,
            #     description="E.g. Pune jurisdiction."
            # ),
        ],

        # -------------------------
        # SALES INVOICE ITEM
        # -------------------------
        "Sales Invoice Item": [
            dict(
                fieldname="packing",
                label="Packing",
                fieldtype="Data",
                insert_after="gst_hsn_code",
                reqd=0
            )
        ],

        # -------------------------
        # SUPPLIER
        # -------------------------
        "Supplier": [
            dict(
                fieldname="supplier_code",
                label="Supplier Code",
                fieldtype="Data",
                insert_after="country",
                reqd=1
            )
        ]
    }

    # Create or update fields
    create_custom_fields(custom_fields)
    frappe.db.commit()
