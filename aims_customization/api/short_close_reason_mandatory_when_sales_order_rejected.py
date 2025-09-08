# import frappe

# def validate_rejection_details(doc, method):
#     if doc.workflow_state == "Rejected" and not doc.short_close_reason:
#         frappe.throw("Short Close Reason is mandatory before sales order rejection")


import frappe

def validate_rejection_details(doc, method):
    # Case 1: If workflow state is set to Rejected but reason is missing
    if doc.workflow_state == "Rejected" and not doc.short_close_reason:
        frappe.throw("Short Close Reason is mandatory before sales order rejection")

    # Case 2: If reason is filled but workflow state is not set, then update workflow state
    if doc.short_close_reason and doc.workflow_state != "Rejected":
        doc.workflow_state = "Closed"
