frappe.ui.form.on("BOM Item", {

    rm_percentage: function(frm, cdt, cdn) {
        calculate_qty(frm, cdt, cdn);
    }

});

function calculate_qty(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    // Fetch Gross WT from BOM parent
    let gross_wt = frm.doc.gross_wt || 0;
    let rm_percentage = row.rm_percentage || 0;

    // Calculate qty
    row.qty = gross_wt * (rm_percentage/100);

    // Refresh the field in the child table row
    frm.refresh_field("items");
}
