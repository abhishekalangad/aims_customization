import frappe

def before_submit_check_pre_feasibility(doc,frm):
    if not frappe.db.exists("Pre Feasibility", {"lead": doc.name}):
        frappe.throw("Please create a Pre Feasibility record by clicking Pre Feasibility button before forwading for approval of Lead.")

