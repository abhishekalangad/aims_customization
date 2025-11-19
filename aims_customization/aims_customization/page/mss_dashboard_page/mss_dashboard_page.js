// ===========================================================================
// MSS Page – Sales Order → Items → BOM → RM → WO → Job Cards
// ===========================================================================

frappe.pages["mss_dashboard_page"] = frappe.pages["mss_dashboard_page"] || {};

frappe.pages["mss_dashboard_page"].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "MSS Dashboard Page",
        single_column: true
    });

    $(page.body).html(get_layout_html());

    // Load filter dropdowns
    load_customers();
    load_sales_order_dropdown();

    // Initial fetch
    load_sales_orders();
};

// ===========================================================================
// HTML LAYOUT
// ===========================================================================
function get_layout_html() {
    return `
    <div class="card p-3 mb-3">
        <h4>Filters</h4>

        <div class="row">
            <div class="col-md-3">
                <label>Customer</label>
                <select id="filter-customer" class="form-control">
                    <option value="">-- All Customers --</option>
                </select>
            </div>

            <div class="col-md-3">
                <label>Sales Order</label>
                <select id="filter-sales-order" class="form-control">
                    <option value="">-- All Sales Orders --</option>
                </select>
            </div>

            <div class="col-md-2">
                <label>From Date</label>
                <input type="date" id="filter-from-date" class="form-control">
            </div>

            <div class="col-md-2">
                <label>To Date</label>
                <input type="date" id="filter-to-date" class="form-control">
            </div>

            <div class="col-md-1">
                <label>Month</label>
                <select id="filter-month" class="form-control">
                    <option value="">--</option>
                    <option>Jan</option><option>Feb</option><option>Mar</option>
                    <option>Apr</option><option>May</option><option>Jun</option>
                    <option>Jul</option><option>Aug</option><option>Sep</option>
                    <option>Oct</option><option>Nov</option><option>Dec</option>
                </select>
            </div>

            <div class="col-md-1">
                <label>Year</label>
                <select id="filter-year" class="form-control">
                    <option value="">--</option>
                    ${get_year_options()}
                </select>
            </div>
        </div>

        <button class="btn btn-primary mt-3" onclick="load_sales_orders()">Apply Filters</button>
    </div>

    <div class="card p-3 mb-3">
        <h4>Sales Orders</h4>
        <div id="sales-order-list"></div>
    </div>

    <div class="card p-3 mb-3">
        <h4>Items</h4>
        <div id="item-list"></div>
    </div>

    <div class="card p-3 mb-3">
        <h4>BOMs</h4>
        <div id="bom-list"></div>
    </div>

    <div class="card p-3 mb-3">
        <h4>Raw Materials</h4>
        <div id="rm-list"></div>
    </div>

    <div class="card p-3 mb-3">
        <h4>Work Orders</h4>
        <div id="wo-list"></div>
    </div>

    <div class="card p-3 mb-3">
        <h4>Job Cards</h4>
        <div id="jc-list"></div>
    </div>
    `;
}

function get_year_options() {
    let html = "";
    for (let y = 2020; y <= 2030; y++) html += `<option>${y}</option>`;
    return html;
}

// ===========================================================================
// LOAD FILTER DROPDOWNS
// ===========================================================================
function load_customers() {
    frappe.db.get_list("Customer", { fields: ["name"], limit: 9999 })
        .then(res => {
            res.forEach(r => {
                $("#filter-customer").append(`<option>${r.name}</option>`);
            });
        });
}

function load_sales_order_dropdown() {
    frappe.db.get_list("Sales Order", { fields: ["name"], limit: 9999 })
        .then(res => {
            res.forEach(r => {
                $("#filter-sales-order").append(`<option>${r.name}</option>`);
            });
        });
}

// ===========================================================================
// LEVEL 1 — SALES ORDERS WITH FILTERS
// ===========================================================================
function load_sales_orders() {
    const search_filters = {
        search_text: $("#filter-sales-order").val() || null,
        customer: $("#filter-customer").val() || null,
        month: $("#filter-month").val()
            ? $("#filter-month").val() + "-" + String($("#filter-year").val()).slice(-2)
            : null
    };

    frappe.call({
        method: "aims_customization.api.mss_page_api.get_sales_orders",
        args: search_filters,
        callback: function (r) {
            const data = r.message || [];

            let html = `
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Sales Order</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Month</th>
                    </tr>
                </thead>
                <tbody>
            `;

            data.forEach(row => {
                html += `
                    <tr onclick="load_items('${row.name}')">
                        <td>${row.name}</td>
                        <td>${row.customer_name}</td>
                        <td>${row.transaction_date}</td>
                        <td>${row.month}</td>
                    </tr>`;
            });

            html += "</tbody></table>";
            $("#sales-order-list").html(html);

            $("#item-list").empty();
            $("#bom-list").empty();
            $("#rm-list").empty();
            $("#wo-list").empty();
            $("#jc-list").empty();
        }
    });
}

// ===========================================================================
// LEVEL 2 — ITEMS (SHOW ALL FIELDS + SCROLLABLE TABLE)
// ===========================================================================
function load_items(sales_order) {
    frappe.call({
        method: "aims_customization.api.mss_page_api.get_items_for_sales_order",
        args: { sales_order },
        callback: function (r) {
            const items = r.message || [];

            let html = `
            <h5>Items for: ${sales_order}</h5>

            <style>
                .table-scroll-container {
                    width: 100%;
                    overflow-x: auto;
                    overflow-y: hidden;
                    display: block;
                    white-space: nowrap;
                }
                .table-scroll-container table {
                    min-width: 2200px; /* ensures scroll activates */
                }
            </style>

            <div class="table-scroll-container">
            <table class="table table-bordered table-sm">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Order Qty</th>
                        <th>Rate</th>

                        <th>Available Stock Nos</th>
                        <th>Available Stock Amt</th>

                        <th>Reserved Qty</th>
                        <th>Incoming Qty</th>

                        <th>Produced Nos</th>
                        <th>Produced Amt</th>

                        <th>WIP Nos</th>
                        <th>WIP Amt</th>

                        <th>Total Stock Nos</th>
                        <th>Total Stock Amt</th>

                        <th>Total + Produced Nos</th>
                        <th>Total + Produced Amt</th>

                        <th>Dispatched Nos</th>
                        <th>Dispatched Amt</th>

                        <th>Balance to Produce Nos</th>
                        <th>Balance to Produce Amt</th>

                        <th>Balance to Deliver Nos</th>
                        <th>Balance to Deliver Amt</th>

                        <th>Cavity</th>
                        <th>PCS WT</th>
                        <th>Runner WT</th>
                        <th>Shot WT</th>
                        <th>Weight/Unit</th>

                        <th>Warehouse</th>
                        <th>BOM</th>
                    </tr>
                </thead>
                <tbody>
            `;

            items.forEach(row => {
                html += `
                    <tr onclick="load_boms('${row.item_code}', ${row.order_qty})">

                        <td>${row.item_code} - ${row.item_name}</td>
                        <td>${row.order_qty}</td>
                        <td>${row.rate}</td>

                        <td>${row.available_stock_nos}</td>
                        <td>${row.available_stock_amt}</td>

                        <td>${row.reserved_qty}</td>
                        <td>${row.incoming_qty}</td>

                        <td>${row.produced_stock_nos}</td>
                        <td>${row.produced_stock_amt}</td>

                        <td>${row.wip_stock_nos}</td>
                        <td>${row.wip_stock_amt}</td>

                        <td>${row.total_stock_nos}</td>
                        <td>${row.total_stock_amt}</td>

                        <td>${row.total_plus_produced_nos}</td>
                        <td>${row.total_plus_produced_amt}</td>

                        <td>${row.dispatched_qty_nos}</td>
                        <td>${row.dispatched_amt}</td>

                        <td>${row.balance_to_produce_qty}</td>
                        <td>${row.balance_to_produce_amt}</td>

                        <td>${row.balance_to_deliver_qty}</td>
                        <td>${row.balance_to_deliver_amt}</td>

                        <td>${row.cavity}</td>
                        <td>${row.pcs_wt}</td>
                        <td>${row.runner_wt}</td>
                        <td>${row.shot_wt}</td>
                        <td>${row.weight_per_unit}</td>

                        <td>${row.warehouse}</td>
                        <td>${row.bom_no}</td>

                    </tr>`;
            });

            html += "</tbody></table></div>";

            $("#item-list").html(html);

            // Clear sections below
            $("#bom-list, #rm-list, #wo-list, #jc-list").empty();

            // Load Work Orders for the Sales Order
            load_work_orders(sales_order);
        }
    });
}



// ===========================================================================
// LEVEL 3 — LIST MULTIPLE BOMs
// ===========================================================================
function load_boms(item_code, so_qty) {
    frappe.call({
        method: "aims_customization.api.mss_page_api.get_boms_for_item",
        args: { item_code, so_qty },
        callback: function (r) {
            const boms = r.message || [];

            if (!boms.length) {
                $("#bom-list").html(`<p>No BOMs found.</p>`);
                return;
            }

            let html = `
                <h5>BOMs for Item: ${item_code}</h5>
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>BOM No</th>
                            <th>BOM Qty</th>
                            <th>Required Qty (For SO)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            boms.forEach(b => {
                // Sum required qty from all components
                const total_required = b.bom_items.reduce(
                    (sum, x) => sum + (x.required_qty || 0), 0
                );

                html += `
                    <tr onclick="load_raw_materials('${b.bom_no}', ${so_qty})">
                        <td>${b.bom_no}</td>
                        <td>${b.bom_qty}</td>
                        <td>${total_required.toFixed(4)}</td>
                    </tr>
                `;
            });

            html += "</tbody></table>";

            $("#bom-list").html(html);
            $("#rm-list").empty();
        }
    });
}

// ===========================================================================
// LEVEL 4 — RAW MATERIALS
// ===========================================================================
function load_raw_materials(bom_no, so_qty) {
    frappe.call({
        method: "aims_customization.api.mss_page_api.get_raw_materials_for_bom",
        args: { bom_no, so_qty },
        callback: function (r) {
            const data = r.message || [];

            let html = `
            <h5>Raw Materials for BOM: ${bom_no}</h5>
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>RM Item</th>
                        <th>Required Qty</th>
                        <th>Available Qty</th>
                        <th>Consumed Qty</th>
                    </tr>
                </thead>
                <tbody>
            `;

            data.forEach(row => {
                html += `
                    <tr>
                        <td>${row.bom_item_code}</td>
                        <td>${row.required_qty}</td>
                        <td>${row.available_qty}</td>
                        <td>${row.consumed_qty}</td>
                    </tr>`;
            });

            html += "</tbody></table>";
            $("#rm-list").html(html);
        }
    });
}

// ===========================================================================
// LEVEL 5 — WORK ORDERS
// ===========================================================================
function load_work_orders(sales_order) {
    frappe.call({
        method: "aims_customization.api.mss_page_api.get_work_orders_for_sales_order",
        args: { sales_order },
        callback: function (r) {
            const data = r.message || [];

            let html = `
            <h5>Work Orders</h5>
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>WO</th>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Produced</th>
                    </tr>
                </thead>
                <tbody>
            `;

            data.forEach(row => {
                html += `
                    <tr onclick="load_job_cards('${row.wo_name}')">
                        <td>${row.wo_name}</td>
                        <td>${row.production_item}</td>
                        <td>${row.wo_qty}</td>
                        <td>${row.produced_qty}</td>
                    </tr>`;
            });

            html += "</tbody></table>";
            $("#wo-list").html(html);
            $("#jc-list").empty();
        }
    });
}

// ===========================================================================
// LEVEL 6 — JOB CARDS (SHOW ALL FIELDS)
// ===========================================================================
function load_job_cards(work_order) {
    frappe.call({
        method: "aims_customization.api.mss_page_api.get_job_cards_for_work_order",
        args: { work_order },
        callback: function (r) {
            const rows = r.message || [];

            let html = `
            <h5>Job Cards for Work Order: ${work_order}</h5>

            <style>
                .table-scroll-container {
                    width: 100%;
                    overflow-x: auto;
                    overflow-y: hidden;
                    display: block;
                    white-space: nowrap;
                }
                .table-scroll-container table {
                    min-width: 1400px;
                }
            </style>

            <div class="table-scroll-container">
            <table class="table table-bordered table-sm">
                <thead>
                    <tr>
                        <th>Job Card</th>
                        <th>Status</th>
                        <th>Operation</th>
                        <th>Workstation</th>

                        <th>RM Item</th>
                        <th>RM Item Name</th>

                        <th>Required Qty</th>
                        <th>Available Stock</th>
                        <th>Consumed Qty</th>
                    </tr>
                </thead>
                <tbody>
            `;

            rows.forEach(row => {
                html += `
                    <tr>
                        <td>${row.job_card}</td>
                        <td>${row.job_card_status}</td>
                        <td>${row.operation}</td>
                        <td>${row.workstation}</td>

                        <td>${row.rm_item_code}</td>
                        <td>${row.rm_item_name}</td>

                        <td>${row.required_qty}</td>
                        <td>${row.available_qty}</td>
                        <td>${row.consumed_qty}</td>
                    </tr>`;
            });

            html += "</tbody></table></div>";

            $("#jc-list").html(html);
        }
    });
}
