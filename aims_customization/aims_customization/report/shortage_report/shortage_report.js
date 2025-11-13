
// frappe.query_reports["Shortage Report"] = {
 
//     filters: [
//         {
//             fieldname: "supplier",
//             label: "Supplier",
//             fieldtype: "Link",
//             options: "Supplier",
//             reqd: 0,
//             onchange: function () {
//                 frappe.query_report.refresh();
//             }
//         }
//     ],
 
//     get_datatable_options(options) {
//         options.checkboxColumn = true;
//         return options;
//     },
 
//     onload: function (report) {
 
//         report.page.add_inner_button(
//             __("Create Request"),
//             function () {
 
//                 let checked_rows = [];
 
//                 try {
//                     // ---- 1) Latest Frappe v15 selection API
//                     try {
//                         const sel = report.datatable?.selection?.getChecked?.();
//                         if (sel && sel.length) {
//                             if (typeof sel[0] === "number") {
//                                 checked_rows = sel.map(i => report.data[i]).filter(Boolean);
//                             } else if (typeof sel[0] === "object") {
//                                 checked_rows = sel.map(s => {
//                                     if (typeof s === "number") return report.data[s];
//                                     if (s.rowIndex !== undefined) return report.data[s.rowIndex];
//                                     if (s.index !== undefined) return report.data[s.index];
//                                     if (s.id !== undefined && report.data[s.id]) return report.data[s.id];
//                                     return null;
//                                 }).filter(Boolean);
//                             }
//                         }
//                     } catch (e) {
//                         console.warn("selection.getChecked failed", e);
//                     }
 
//                     // ---- 2) Frappe v14 rowmanager fallback
//                     if (!checked_rows.length) {
//                         try {
//                             const rm = report.datatable?.rowmanager?.getChecked?.();
//                             if (rm && rm.length) {
//                                 checked_rows = rm.map(i => report.data[i]).filter(Boolean);
//                             }
//                         } catch (e) {
//                             console.warn("rowmanager.getChecked failed", e);
//                         }
//                     }
 
//                     // ---- 3) Last DOM fallback — rarely used but kept
//                     if (!checked_rows.length) {
//                         try {
//                             let $wrapper = null;
 
//                             if (report.datatable?.wrapper)
//                                 $wrapper = $(report.datatable.wrapper);
//                             else if (report.$parent)
//                                 $wrapper = report.$parent;
//                             else if (report.$wrapper)
//                                 $wrapper = report.$wrapper;
//                             else if (report.page)
//                                 $wrapper = $(report.page.wrapper);
 
//                             if ($wrapper && $wrapper.length) {
//                                 const $checked = $wrapper.find('input[type="checkbox"]:checked');
//                                 const rows = [];
 
//                                 $checked.each(function () {
//                                     const $cb = $(this);
//                                     const $row = $cb.closest('[data-row-index], .datatable-row, .dt-row, .datatable-body-row');
//                                     let idx;
 
//                                     if ($row.attr('data-row-index') !== undefined)
//                                         idx = parseInt($row.attr('data-row-index'), 10);
//                                     else if ($cb.attr('data-row-index') !== undefined)
//                                         idx = parseInt($cb.attr('data-row-index'), 10);
//                                     else if ($row.attr('data-index') !== undefined)
//                                         idx = parseInt($row.attr('data-index'), 10);
//                                     else idx = $row.index();
 
//                                     if (Number.isFinite(idx) && report.data?.[idx])
//                                         rows.push(report.data[idx]);
//                                     else {
//                                         const maybeItem = $row.find('[data-fieldname="item_code"], [data-fieldname="item"]').text();
//                                         if (maybeItem) {
//                                             const found = (report.data || []).find(
//                                                 d => d.item_code === maybeItem || d.item === maybeItem
//                                             );
//                                             if (found) rows.push(found);
//                                         }
//                                     }
//                                 });
 
//                                 checked_rows = rows.filter(Boolean);
//                             }
//                         } catch (e) {
//                             console.warn("DOM fallback failed", e);
//                         }
//                     }
 
//                 } catch (e) {
//                     console.error("Error while detecting checked rows:", e);
//                 }
 
//                 console.log("Final checked_rows ->", checked_rows);
 
//                 if (!checked_rows.length) {
//                     frappe.msgprint(__("Please select at least one item using the checkbox."));
//                     return;
//                 }
 
//                 let supplier = frappe.query_report.get_filter_value("supplier");
 
//                 frappe.prompt(
//                     [
//                         {
//                             fieldname: "select_type",
//                             label: "Select Request Type",
//                             fieldtype: "Select",
//                             options: "\nMaterial Request\nPurchase Order",
//                             reqd: 1
//                         }
//                     ],
 
//                     function (values) {
 
//                         let doctype = values.select_type === "Material Request"
//                             ? "Material Request"
//                             : "Purchase Order";
 
//                         frappe.new_doc(doctype);
 
//                         frappe.ui.form.on(doctype, {
//                             refresh: function (frm) {
 
//                                 if (frm.is_new() && !frm.is_items_added) {
 
//                                     frm.clear_table("items");
 
//                                     if (doctype === "Purchase Order" && supplier) {
//                                         frm.set_value("supplier", supplier);
//                                     }
 
//                                     checked_rows.forEach((data) => {
//                                         let item_code = data.item_code || data.item;
//                                         let qty = Math.abs(
//                                             parseFloat(data.projected_qty || data.projected_quantity) || 0
//                                         );
//                                         let warehouse = data.warehouse;
 
//                                         let child = frm.add_child("items", {
//                                             item_code: item_code,
//                                             qty: qty,
//                                             warehouse: warehouse,
//                                             schedule_date: frappe.datetime.now_date(),
//                                         });
 
//                                         frappe.call({
//                                             method: "frappe.client.get_value",
//                                             args: {
//                                                 doctype: "Item",
//                                                 filters: { name: item_code },
//                                                 fieldname: "stock_uom",
//                                             },
//                                             callback: function (r) {
//                                                 if (r.message) {
//                                                     frappe.model.set_value(
//                                                         child.doctype,
//                                                         child.name,
//                                                         "uom",
//                                                         r.message.stock_uom
//                                                     );
//                                                 }
//                                             },
//                                         });
//                                     });
 
//                                     frm.refresh_field("items");
//                                     frm.is_items_added = true;
 
//                                     // Auto save + submit (for PO)
//                                     if (doctype === "Purchase Order") {
//                                         frm.save().then(() => {
//                                             frappe.call({
//                                                 method: "frappe.client.submit",
//                                                 args: { doc: frm.doc },
//                                                 callback: function (r) {
//                                                     if (!r.exc && r.message) {
 
//                                                         frappe.show_alert({
//                                                             message: __("Purchase Order <b>" + r.message.name + "</b> has been submitted successfully."),
//                                                             indicator: "green"
//                                                         }, 5);
 
//                                                         frappe.set_route("Form", "Purchase Order", r.message.name);
 
//                                                         frappe.after_ajax(() => {
//                                                             frappe.model.with_doc("Purchase Order", r.message.name, function () {
//                                                                 frappe.get_doc("Purchase Order", r.message.name);
//                                                                 cur_frm.reload_doc();
//                                                             });
//                                                         });
//                                                     }
//                                                 }
//                                             });
//                                         });
//                                     }
//                                 }
//                             },
//                         });
//                     },
 
//                     "Create Request",
//                     "Proceed"
//                 );
//             },
//             __("")
//         );
//     }
// };
 

frappe.query_reports["Shortage Report"] = {
    filters: [
        {
            fieldname: "supplier",
            label: "Supplier",
            fieldtype: "Link",
            options: "Supplier",
            reqd: 0,
            onchange: function () {
                frappe.query_report.refresh();
            },
        },
    ],

    get_datatable_options(options) {
        options.checkboxColumn = true;
        return options;
    },

    onload: function (report) {
        // Helper to get selected rows
        function get_checked_rows(report) {
            let checked_rows = [];
            try {
                const sel = report.datatable?.selection?.getChecked?.();
                if (sel && sel.length) {
                    if (typeof sel[0] === "number") {
                        checked_rows = sel.map(i => report.data[i]).filter(Boolean);
                    } else if (typeof sel[0] === "object") {
                        checked_rows = sel.map(s => {
                            if (typeof s === "number") return report.data[s];
                            if (s.rowIndex !== undefined) return report.data[s.rowIndex];
                            if (s.index !== undefined) return report.data[s.index];
                            if (s.id !== undefined && report.data[s.id]) return report.data[s.id];
                            return null;
                        }).filter(Boolean);
                    }
                }
            } catch (e) {
                console.warn("selection.getChecked failed", e);
            }

            // DOM fallback
            if (!checked_rows.length) {
                const $wrapper = $(report.datatable?.wrapper || report.page?.wrapper);
                const $checked = $wrapper.find('input[type="checkbox"]:checked');
                $checked.each(function () {
                    const idx = parseInt($(this).closest("[data-row-index]").attr("data-row-index"), 10);
                    if (!isNaN(idx) && report.data?.[idx]) checked_rows.push(report.data[idx]);
                });
            }

            return checked_rows;
        }

        // Core document creation logic
        function create_doc(doctype, checked_rows, supplier) {
            if (!checked_rows.length) {
                frappe.msgprint(__("Please select at least one item using the checkbox."));
                return;
            }

            frappe.new_doc(doctype);

            frappe.ui.form.on(doctype, {
                refresh: function (frm) {
                    if (frm.is_new() && !frm.is_items_added) {
                        frm.clear_table("items");

                        // Set supplier in Purchase Order
                        if (doctype === "Purchase Order" && supplier) {
                            frm.set_value("supplier", supplier);
                        }

                        // Add checked items
                        checked_rows.forEach((data) => {
                            let item_code = data.item_code || data.item;
                            let qty = Math.abs(
                                parseFloat(data.projected_qty || data.projected_quantity) || 0
                            );
                            let warehouse = data.warehouse;

                            let child = frm.add_child("items", {
                                item_code: item_code,
                                qty: qty,
                                warehouse: warehouse,
                                schedule_date: frappe.datetime.now_date(),
                            });

                            frappe.call({
                                method: "frappe.client.get_value",
                                args: {
                                    doctype: "Item",
                                    filters: { name: item_code },
                                    fieldname: "stock_uom",
                                },
                                callback: function (r) {
                                    if (r.message) {
                                        frappe.model.set_value(
                                            child.doctype,
                                            child.name,
                                            "uom",
                                            r.message.stock_uom
                                        );
                                    }
                                },
                            });
                        });

                        frm.refresh_field("items");
                        frm.is_items_added = true;

                        // Auto save + submit for PO
                        if (doctype === "Purchase Order") {
                            frm.save().then(() => {
                                frappe.call({
                                    method: "frappe.client.submit",
                                    args: { doc: frm.doc },
                                    callback: function (r) {
                                        if (!r.exc && r.message) {
                                            frappe.show_alert({
                                                message: __(
                                                    "Purchase Order <b>" +
                                                        r.message.name +
                                                        "</b> has been submitted successfully."
                                                ),
                                                indicator: "green",
                                            }, 5);

                                            frappe.set_route("Form", "Purchase Order", r.message.name);

                                            frappe.after_ajax(() => {
                                                frappe.model.with_doc(
                                                    "Purchase Order",
                                                    r.message.name,
                                                    function () {
                                                        frappe.get_doc("Purchase Order", r.message.name);
                                                        cur_frm.reload_doc();
                                                    }
                                                );
                                            });
                                        }
                                    },
                                });
                            });
                        }
                    }
                },
            });
        }

        // --- Button: Purchase Order ---
        report.page.add_inner_button(__("Purchase Order"), function () {
            const checked_rows = get_checked_rows(report);
            const supplier = frappe.query_report.get_filter_value("supplier");
            create_doc("Purchase Order", checked_rows, supplier);
        });

        // --- Button: Material Request ---
        report.page.add_inner_button(__("Material Request"), function () {
            const checked_rows = get_checked_rows(report);
            create_doc("Material Request", checked_rows);
        });
    },
};
