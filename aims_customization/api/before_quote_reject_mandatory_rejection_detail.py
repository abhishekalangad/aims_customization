

# import frappe
 
# def validate_rejection_before_reject(doc, method):
#     if doc.workflow_state == "Quotation Rejected" and not doc.rejection_details:
#         frappe.throw("Rejection Details is mandatory before customer rejection")
#     # Case 2: If reason is filled but workflow state is not set, then update workflow state
#     if doc.rejection_details and doc.workflow_state != "Quotation Rejected":
#         doc.workflow_state = "Quotation Rejected"
 

import frappe

def validate_quotation_workflow(doc, method):
    # Case 1: Quotation Rejection validation
    if doc.workflow_state == "Quotation Rejected" and not doc.rejection_details:
        frappe.throw("Rejection Details is mandatory before customer rejection")

    # Case 2: Auto update workflow state if rejection details are filled
    if doc.rejection_details and doc.workflow_state != "Quotation Rejected":
        doc.workflow_state = "Quotation Rejected"

    # Case 3: Customer Approval validation
    if doc.workflow_state == "Customer Approved" and not doc.customer_approval_email:
        frappe.throw("Before Approval Please Attach Customer Approval Email")
