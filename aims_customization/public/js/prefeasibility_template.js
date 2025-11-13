frappe.ui.form.on("Pre Feasibility", {
    feasibility_template: function (frm) {
        if (frm.doc.feasibility_template) {
            frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Checklist Template",
                    name: frm.doc.feasibility_template
                },
                callback: function (r) {
                    if (r.message) {
                        // Clear existing rows
                        frm.clear_table("feasibility_checklist");

                        // Fetch child table "checklist" from Checklist Template
                        (r.message.checklist || []).forEach(row => {
                            let child = frm.add_child("feasibility_checklist");
                            child.checklist = row.checklist;   // field name in child
                            child.feasibility = row.feasibility; // if present
                            child.comment = row.comment;
                            child.check_point_type = row.check_point_type;// if present
                        });

                        frm.refresh_field("feasibility_checklist");
                    }
                }
            });
        } else {
            frm.clear_table("feasibility_checklist");
            frm.refresh_field("feasibility_checklist");
        }
    }
});
