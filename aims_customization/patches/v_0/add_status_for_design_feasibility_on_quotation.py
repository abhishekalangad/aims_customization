import frappe

def execute():
    # Check if field already exists
    if not frappe.db.exists("Custom Field", "Quotation-feasibility_status"):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Quotation",
            "fieldname": "feasibility_status",
            "label": "Feasibility Status",
            "fieldtype": "Select",
            "options": "\n1. Feasible\n2. Under Review\n3. Not Feasible\n4. Requires Clarification",
            "insert_after": "order_type"
        }).insert()
