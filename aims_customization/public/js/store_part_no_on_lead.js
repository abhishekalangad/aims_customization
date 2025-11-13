frappe.ui.form.on("Pre Feasibility", {
    after_save(frm) {
        if (!frm.doc.lead || !frm.doc.part_no) {
            return;
        }

        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Lead",
                filters: { name: frm.doc.lead },
                fieldname: "custom_feasibility_items"
            },
            callback: function (r) {
                let existing_items = r?.message?.custom_feasibility_items || "";

                // append new part number on next line
                let updated_items = existing_items
                    ? existing_items + "\n" + frm.doc.part_no
                    : frm.doc.part_no;

                frappe.call({
                    method: "frappe.client.set_value",
                    args: {
                        doctype: "Lead",
                        name: frm.doc.lead,
                        fieldname: "custom_feasibility_items",
                        value: updated_items
                    },
                    callback: function () {
                        // frappe.msgprint("✔ Part number added to Lead.");
                    }
                });
            }
        });
    }
});


