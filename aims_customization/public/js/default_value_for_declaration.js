frappe.ui.form.on("Sales Invoice", {
    refresh(frm) {
        // Set default text only when the form is new and the field is empty
        if (frm.is_new() && !frm.doc.declaration) {
            frm.set_value("declaration",
                "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."
            );
        }
    }
});
