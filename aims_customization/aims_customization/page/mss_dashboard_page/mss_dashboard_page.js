// ===========================================================================
// MSS Dashboard — Cascinating Multi-Select w/ Pagination (20 rows/page)
// ===========================================================================

frappe.pages["mss_dashboard_page"] = frappe.pages["mss_dashboard_page"] || {};

frappe.pages["mss_dashboard_page"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "MSS Dashboard Page",
		single_column: true,
	});

	$(page.body).html(get_layout_html());
	load_customers();
	load_sales_order_dropdown();
	load_sales_orders(); // fetch initial data
};

// ---------------- layout + helpers ----------------
function get_layout_html() {
	return `
    <div class="card p-3 mb-3">
        <h4>Filters</h4>
        <div class="row">
            <div class="col-md-3">
                <label>Customer</label>
                <select id="filter-customer" class="form-control"><option value="">-- All Customers --</option></select>
            </div>
            <div class="col-md-3">
                <label>Sales Order</label>
                <select id="filter-sales-order" class="form-control"><option value="">-- All Sales Orders --</option></select>
            </div>
            <div class="col-md-2"><label>From Date</label><input type="date" id="filter-from-date" class="form-control"></div>
            <div class="col-md-2"><label>To Date</label><input type="date" id="filter-to-date" class="form-control"></div>
            <div class="col-md-1"><label>Month</label><select id="filter-month" class="form-control"><option value="">--</option>
                <option>Jan</option><option>Feb</option><option>Mar</option><option>Apr</option><option>May</option><option>Jun</option>
                <option>Jul</option><option>Aug</option><option>Sep</option><option>Oct</option><option>Nov</option><option>Dec</option>
            </select></div>
            <div class="col-md-1"><label>Year</label><select id="filter-year" class="form-control"><option value="">--</option>${get_year_options()}</select></div>
        </div> 
        <button class="btn btn-primary mt-3" onclick="load_sales_orders(true)">Apply Filters</button>
    </div>

    <div class="card p-3 mb-3">
        <h4>Sales Orders</h4>
        <div id="sales-order-controls" class="mb-2"></div>
        <div id="sales-order-list"></div>
        <div id="sales-order-load-more" class="mt-2 text-center"></div>
    </div>

    <div class="card p-3 mb-3">
        <h4>Finish Good Items</h4>
        <div id="item-controls" class="mb-2"></div>
        <div id="item-list"></div>
        <div id="item-load-more" class="mt-2 text-center"></div>
    </div>

    <div class="card p-3 mb-3">
        <h4>BOMs (Aggregated from selected Items)</h4>
        <div id="bom-controls" class="mb-2"></div>
        <div id="bom-list"></div>
        <div id="bom-load-more" class="mt-2 text-center"></div>
    </div>

    <div class="card p-3 mb-3">
        <h4>Raw Materials (Aggregated from selected BOMs/items)</h4>
        <div id="rm-controls" class="mb-2"></div>
        <div id="rm-list"></div>
        <div id="rm-load-more" class="mt-2 text-center"></div>
    </div>

    <div class="card p-3 mb-3">
        <h4>Work Orders (Aggregated from selected Sales Orders)</h4>
        <div id="wo-controls" class="mb-2"></div>
        <div id="wo-list"></div>
        <div id="wo-load-more" class="mt-2 text-center"></div>
    </div>

    <div class="card p-3 mb-3">
        <h4>Job Cards (Aggregated from selected Work Orders)</h4>
        <div id="jc-controls" class="mb-2"></div>
        <div id="jc-list"></div>
        <div id="jc-load-more" class="mt-2 text-center"></div>
    </div>
    `;
}
function get_year_options() {
	let html = "";
	for (let y = 2020; y <= 2030; y++) html += `<option>${y}</option>`;
	return html;
}

// ---------------- load dropdowns ----------------
function load_customers() {
	frappe.db
		.get_list("Customer", { fields: ["name"], limit: 9999 })
		.then((res) =>
			res.forEach((r) => $("#filter-customer").append(`<option>${r.name}</option>`))
		);
}
function load_sales_order_dropdown() {
	frappe.db
		.get_list("Sales Order", { fields: ["name"], limit: 9999 })
		.then((res) =>
			res.forEach((r) => $("#filter-sales-order").append(`<option>${r.name}</option>`))
		);
}

// ---------------- selection state + pagination ----------------
const PAGE_LIMIT = 20;

// raw storage of fetched arrays (client-side pagination)
let salesOrdersData = [];
let salesOrdersPage = 0;
let itemsData = [];
let itemsPage = 0;
let bomsData = [];
let bomsPage = 0;
let wosData = [];
let wosPage = 0;
let jcsData = [];
let jcsPage = 0;

// selection sets (persist across pages)
let selected_sales_orders = new Set();
let selected_item_keys = new Set(); // unique key so||item_code||idx
let selected_boms = new Set(); // bom_no
let selected_rm_items = new Set();
let selected_work_orders = new Set();
let selected_job_cards = new Set();

function set_to_array(s) {
	return Array.from(s);
}

// ---------------- LEVEL 1: SALES ORDERS w/ pagination ----------------
function load_sales_orders(reset = false) {
	// reset flag true means re-fetch from server and reset client pagination
	if (reset) {
		salesOrdersData = [];
		salesOrdersPage = 0;
	}

	// Clear selected sales orders
	selected_sales_orders.clear();

	// Clear downstream levels (items, BOMs, RM, Job Cards, etc.)
	itemsData = [];
	itemsPage = 0;
	selected_item_keys.clear();
	$("#item-list, #item-controls, #item-load-more").empty();

	$("#bom-list, #rm-list, #wo-list, #jc-list").empty();

	// fetch full page-chunk from server (we ask for many results but still paginate client-side)
	const search_filters = {
		search_text: $("#filter-sales-order").val() || null,
		customer: $("#filter-customer").val() || null,
		month: $("#filter-month").val()
			? $("#filter-month").val() + "-" + String($("#filter-year").val()).slice(-2)
			: null,
	};

	// show loading text
	$("#sales-order-list").html("<p>Loading sales orders...</p>");

	frappe.call({
		method: "aims_customization.api.mss_page_api.get_sales_orders",
		args: search_filters,
		callback: function (r) {
			salesOrdersData = r.message || [];
			salesOrdersPage = 0;
			renderSalesOrdersPage(true);
		},
	});
}

function renderSalesOrdersPage(resetRender = false) {
	// determine slice for this page
	const start = salesOrdersPage * PAGE_LIMIT;
	const pageSlice = salesOrdersData.slice(0, start + PAGE_LIMIT); // we append progressively (so show all up to page)
	// build table
	let html = `
        <div>
            <button class="btn btn-sm btn-primary mr-1" onclick="select_all_so_on_page()">Select All (Page)</button>
            <button class="btn btn-sm btn-secondary" onclick="unselect_all_so_on_page()">Unselect All (Page)</button>
            <span class="ml-3 text-muted">Selected SO: <b id="so-selected-count">${selected_sales_orders.size}</b></span>
        </div>
        <table class="table table-bordered mt-2"><thead>
            <tr><th style="width:40px;">✔</th><th>Sales Order</th><th>Customer</th><th>Date</th><th>Month</th><th>Delivery</th><th>Status</th></tr>
        </thead><tbody>
    `;
	pageSlice.forEach((row) => {
		const checked = selected_sales_orders.has(row.name) ? "checked" : "";
		html += `<tr>
            <td><input type="checkbox" class="so-checkbox" data-so="${row.name}" ${checked} onclick="event.stopPropagation()"/></td>
            <td onclick="toggle_and_reload_items('${row.name}')">${row.name}</td>
            <td onclick="toggle_and_reload_items('${row.name}')">${row.customer_name}</td>
            <td onclick="toggle_and_reload_items('${row.name}')">${row.transaction_date}</td>
            <td onclick="toggle_and_reload_items('${row.name}')">${row.month}</td>
            <td onclick="toggle_and_reload_items('${row.name}')">${row.delivery_date}</td>
            <td onclick="toggle_and_reload_items('${row.name}')">${row.status}</td>
        </tr>`;
	});
	html += `</tbody></table>`;
	$("#sales-order-list").html(html);

	// attach change handler
	$(".so-checkbox")
		.off("change")
		.on("change", function () {
			const so = $(this).data("so");
			if ($(this).prop("checked")) selected_sales_orders.add(so);
			else selected_sales_orders.delete(so);
			$("#so-selected-count").text(selected_sales_orders.size);
			// refresh aggregated downstreams
			load_items_for_selected_sos(true); // reset items pagination
			load_work_orders_for_selected_sos(true);
		});

	// load more button
	const totalPages = Math.ceil(salesOrdersData.length / PAGE_LIMIT);
	if (salesOrdersPage + 1 < totalPages) {
		$("#sales-order-load-more").html(
			`<button class="btn btn-sm btn-outline-primary" onclick="salesOrdersPage++; renderSalesOrdersPage();">Load more Sales Orders</button>`
		);
	} else {
		$("#sales-order-load-more").empty();
	}
}
function select_all_so_on_page() {
	$("#sales-order-list .so-checkbox").prop("checked", true).trigger("change");
}
function unselect_all_so_on_page() {
	$("#sales-order-list .so-checkbox").prop("checked", false).trigger("change");
}
function toggle_and_reload_items(so) {
	const cb = $(`.so-checkbox[data-so='${so}']`);
	cb.prop("checked", !cb.prop("checked")).trigger("change");
}

// ---------------- LEVEL 2: ITEMS aggregated from selected SOs ----------------
function load_items_for_selected_sos(reset = false) {
	const so_list = set_to_array(selected_sales_orders);
	if (!so_list.length) {
		$("#item-controls, #item-list, #item-load-more").empty();
		itemsData = [];
		itemsPage = 0;
		selected_item_keys.clear();
		$("#bom-card").hide();
		return;
	}

	if (reset) {
		itemsData = [];
		itemsPage = 0;
		selected_item_keys.clear();
	}

	$("#item-controls").html(`
        <button class="btn btn-sm btn-primary mr-1" onclick="select_all_items_on_page()">Select All (Page)</button>
        <button class="btn btn-sm btn-secondary" onclick="unselect_all_items_on_page()">Unselect All (Page)</button>
        <button class="btn btn-sm btn-success ml-2" onclick="show_boms_for_selected_items()">Show BOMs for Selected Items</button>
        <span class="ml-3 text-muted">Selected items: <b id="items-selected-count">${selected_item_keys.size}</b></span>
    `);

	if (itemsData.length) {
		renderItemsPage();
		return;
	}

	$("#item-list").html("<p>Loading items...</p>");
	frappe.call({
		method: "aims_customization.api.mss_page_api.get_items_for_sales_orders",
		args: { so_list: JSON.stringify(so_list) },
		callback: function (r) {
			itemsData = r.message || [];
			itemsPage = 0;
			renderItemsPage();
		},
	});
}

function renderItemsPage() {
	const endIndex = (itemsPage + 1) * PAGE_LIMIT;
	const pageSlice = itemsData.slice(0, endIndex);

	let html = `<div class="table-responsive"><table class="table table-bordered table-sm"><thead><tr>
        <th style="min-width:40px;">Select</th>
        <th style="min-width:120px;">Sales Order</th>
        <th style="min-width:150px;">Item</th>
        <th style="min-width:80px;">Order Qty</th>
        <th style="min-width:80px;">Rate</th>
        <th style="min-width:100px;">BOM</th>
        <th style="min-width:100px;">Warehouse</th>
        <th style="min-width:100px;">Available Qty</th>
        <th style="min-width:100px;">Available Amt</th>
        <th style="min-width:100px;">Dispatched Qty</th>
        <th style="min-width:100px;">Dispatched Amt</th>
        <th style="min-width:100px;">Produced Qty</th>
        <th style="min-width:100px;">Produced Amt</th>
        <th style="min-width:100px;">WIP Qty</th>
        <th style="min-width:100px;">WIP Amt</th>
        <th style="min-width:120px;">Total Stock Qty</th>
        <th style="min-width:120px;">Total Stock Amt</th>
        <th style="min-width:120px;">Total+Produced Qty</th>
        <th style="min-width:120px;">Total+Produced Amt</th>
        <th style="min-width:120px;">Balance to Produce Qty</th>
        <th style="min-width:120px;">Balance to Produce Amt</th>
        <th style="min-width:120px;">Balance to Deliver Qty</th>
        <th style="min-width:120px;">Balance to Deliver Amt</th>
        <th style="min-width:100px;">Reserved Qty</th>
        <th style="min-width:100px;">Incoming Qty</th>
        <th style="min-width:80px;">Cavity</th>
        <th style="min-width:80px;">PCS Wt</th>
        <th style="min-width:80px;">Runner Wt</th>
        <th style="min-width:80px;">Shot Wt</th>
        <th style="min-width:100px;">Weight/Unit</th>
    </tr></thead><tbody>`;

	pageSlice.forEach((row, idx) => {
		const key = `${row.so_name}||${row.item_code}||${idx}`;
		const checked = selected_item_keys.has(key) ? "checked" : "";
		html += `<tr>
           <td onclick="event.stopPropagation()">
                <input type="checkbox" class="item-row-chk" 
                    data-item='${escapeHtml(
						JSON.stringify({
							item_code: row.item_code,
							qty: row.balance_to_produce_qty || row.order_qty || 0,
							bom_no: row.bom_no || null,
						})
					)}'
                    data-key="${key}" 
                    ${checked}>
            </td>

            <td>${row.so_name}</td>
            <td>${row.item_code} - ${row.item_name || ""}</td>
            <td>${row.order_qty || 0}</td>
            <td>${row.rate || 0}</td>
            <td>${row.bom_no || ""}</td>
            <td>${row.warehouse || ""}</td>
            <td>${row.available_stock_nos || 0}</td>
            <td>${row.available_stock_amt || 0}</td>
            <td>${row.dispatched_qty_nos || 0}</td>
            <td>${row.dispatched_amt || 0}</td>
            <td>${row.produced_stock_nos || 0}</td>
            <td>${row.produced_stock_amt || 0}</td>
            <td>${row.wip_stock_nos || 0}</td>
            <td>${row.wip_stock_amt || 0}</td>
            <td>${row.total_stock_nos || 0}</td>
            <td>${row.total_stock_amt || 0}</td>
            <td>${row.total_plus_produced_nos || 0}</td>
            <td>${row.total_plus_produced_amt || 0}</td>
            <td>${row.balance_to_produce_qty || 0}</td>
            <td>${row.balance_to_produce_amt || 0}</td>
            <td>${row.balance_to_deliver_qty || 0}</td>
            <td>${row.balance_to_deliver_amt || 0}</td>
            <td>${row.reserved_qty || 0}</td>
            <td>${row.incoming_qty || 0}</td>
            <td>${row.cavity || ""}</td>
            <td>${row.pcs_wt || ""}</td>
            <td>${row.runner_wt || ""}</td>
            <td>${row.shot_wt || ""}</td>
            <td>${row.weight_per_unit || ""}</td>
        </tr>`;
	});

	html += `</tbody></table></div>`;
	$("#item-list").html(html);

	// Checkbox change handler
	$(".item-row-chk")
		.off("change")
		.on("change", function () {
			const key = $(this).data("key");
			const itemData = JSON.parse(unescapeHtml($(this).data("item"))); // { item_code, qty, bom_no }

			if ($(this).prop("checked")) {
				selected_item_keys.add(key);
				// Optionally store itemData somewhere if needed for later
			} else {
				selected_item_keys.delete(key);
			}

			$("#items-selected-count").text(selected_item_keys.size);

			// Auto show BOMs if at least 1 item selected
			if (selected_item_keys.size > 0) {
				// Collect all selected items in JSON format for BOM loading
				const selectedRows = [];
				$(".item-row-chk:checked").each(function () {
					const data = JSON.parse(unescapeHtml($(this).data("items")));
					selectedRows.push({
						item_code: data.item_code,
						required_for_selected_qty: data.qty,
						bom_no: data.bom_no,
					});
				});
				load_boms_for_selected_items(selectedRows, true);
			} else {
				$("#bom-card").hide();
			}
		});

	// Load more
	const totalPages = Math.ceil(itemsData.length / PAGE_LIMIT);
	if (itemsPage + 1 < totalPages) {
		$("#item-load-more").html(
			`<button class="btn btn-sm btn-outline-primary" onclick="itemsPage++; renderItemsPage();">Load more Items</button>`
		);
	} else {
		$("#item-load-more").empty();
	}
}

// Select / Unselect All for page
function select_all_items_on_page() {
	$("#item-list .item-row-chk").prop("checked", true).trigger("change");
}
function unselect_all_items_on_page() {
	$("#item-list .item-row-chk").prop("checked", false).trigger("change");
}

// Open BOMs for a single row click
function open_boms_for_row(item_code, qty, bom_no = null) {
	const selectedRow = [
		{
			item_code: item_code,
			required_for_selected_qty: qty,
			bom_no: bom_no,
		},
	];

	load_boms_for_selected_items(selectedRow, true);
}
// ---------------- LEVEL 3: BOMs aggregated from selected Items ----------------
function show_boms_for_selected_items() {
	const selected_rows = [];
	$(".item-row-chk:checked").each(function () {
		const itemData = JSON.parse(unescapeHtml($(this).data("items"))); // { item_code, qty, bom_no }
		selected_rows.push({
			item_code: itemData.item_code,
			required_for_selected_qty: itemData.qty,
			bom_no: itemData.bom_no,
		});
	});

	if (!selected_rows.length) {
		frappe.msgprint("Select one or more items");
		$("#bom-card").hide();
		return;
	}

	load_boms_for_selected_items(selected_rows, true);
}

function load_boms_for_selected_items(selected_rows, reset = false) {
	if (reset) {
		bomsData = [];
		bomsPage = 0;
		selected_boms.clear();
	}

	$("#bom-card").show();

	$("#bom-controls").html(`
        <button class="btn btn-sm btn-primary mr-1" onclick="select_all_boms_on_page()">Select All (Page)</button>
        <button class="btn btn-sm btn-secondary" onclick="unselect_all_boms_on_page()">Unselect All (Page)</button>
        <button class="btn btn-sm btn-success ml-2" onclick="show_rm_for_selected_boms()">Show Raw Materials for Selected BOMs</button>
        <span class="ml-3 text-muted">Selected BOMs: <b id="bom-selected-count">${selected_boms.size}</b></span>
    `);

	$("#bom-list").html(`<p>Loading BOMs...${JSON.stringify(selected_rows)}</p>`);
     
	frappe.call({
		method: "aims_customization.api.mss_page_api.get_boms_for_items",
		args: { items: JSON.stringify(selected_rows) },
		callback: function (r) {
			const newBoms = r.message || [];

			// Aggregate BOMs without duplicates
			const existingBOMNos = new Set(bomsData.map((b) => b.bom_no));
			newBoms.forEach((b) => {
				if (!existingBOMNos.has(b.bom_no)) {
					bomsData.push(b);
				}
			});

			bomsPage = 0;
			renderBOMsPage();
		},
	});
}

function renderBOMsPage() {
	const endIndex = (bomsPage + 1) * PAGE_LIMIT;
	const pageSlice = bomsData.slice(0, endIndex);

	let html = `<div class="table-responsive"><table class="table table-bordered table-sm"><thead><tr>
        <th style="min-width:40px;">Select</th>
        <th style="min-width:150px;">Item</th>
        <th style="min-width:120px;">BOM No</th>
        <th style="min-width:100px;">BOM Qty</th>
        <th style="min-width:150px;">Required For Selected Qty</th>
    </tr></thead><tbody>`;

	pageSlice.forEach((b) => {
		const checked = selected_boms.has(b.bom_no) ? "checked" : "";
		html += `<tr>
            <td onclick="event.stopPropagation()">
                <input type="checkbox" class="bom-chk" data-bom='${escapeHtml(
					JSON.stringify(b)
				)}' data-bomno="${b.bom_no}" ${checked}>
            </td>
            <td>${b.item_code}</td>
            <td>${b.bom_no}</td>
            <td>${b.bom_qty}</td>
            <td>${b.required_for_selected_qty || 0}</td>
        </tr>`;
	});

	html += `</tbody></table></div>`;
	$("#bom-list").html(html);

	// Checkbox change handler
	$(".bom-chk")
		.off("change")
		.on("change", function () {
			const bomno = $(this).data("bomno");
			if ($(this).prop("checked")) selected_boms.add(bomno);
			else selected_boms.delete(bomno);

			$("#bom-selected-count").text(selected_boms.size);

			// Clear RM panel whenever selection changes
			$("#rm-list").empty();
			selected_rm_items.clear();
		});

	// Load more button
	const totalPages = Math.ceil(bomsData.length / PAGE_LIMIT);
	if (bomsPage + 1 < totalPages) {
		$("#bom-load-more").html(`
            <button class="btn btn-sm btn-outline-primary" onclick="bomsPage++; renderBOMsPage();">Load more BOMs</button>
        `);
	} else {
		$("#bom-load-more").empty();
	}
}

// Select / Unselect All checkboxes on page
function select_all_boms_on_page() {
	$("#bom-list .bom-chk").prop("checked", true).trigger("change");
}
function unselect_all_boms_on_page() {
	$("#bom-list .bom-chk").prop("checked", false).trigger("change");
}

// Show Raw Materials for currently selected BOMs
function show_rm_for_selected_boms() {
	if (selected_boms.size === 0) {
		frappe.msgprint("Select at least one BOM to view raw materials");
		return;
	}

	const boms_to_show = bomsData.filter((b) => selected_boms.has(b.bom_no));
	render_rm_items(boms_to_show); // Assuming you have this function
}

// ---------------- LEVEL 4: RAW MATERIALS aggregated from selected BOMs ----------------
function show_rm_for_selected_boms(reset = false) {
	// build array from all selected checkboxes across pages (we rely on selected_boms set)
	const bom_list = [];
	// The full object of each bom is in bomsData; grab those where bom_no in selected_boms
	if (!bomsData.length) {
		frappe.msgprint("No BOM data present. Select items and load BOMs first.");
		return;
	}

	// prefer using the selected checkboxes present on page, but also include selected_boms not on page
	// Build list using bomsData entries that match selected_boms
	selected_boms.forEach((bn) => {
		const found = bomsData.find((x) => x.bom_no === bn);
		if (found) {
			bom_list.push({
				bom_no: found.bom_no,
				required_for_selected_qty: found.required_for_selected_qty || 0,
			});
		} else {
			// if not in current bomsData (maybe paginated out), still send minimal entry
			bom_list.push({ bom_no: bn, required_for_selected_qty: 0 });
		}
	});

	if (!bom_list.length) {
		frappe.msgprint("Select BOMs first");
		return;
	}

	$("#rm-controls").html(`
        <button class="btn btn-sm btn-primary mr-1" onclick="select_all_rm_on_page()">Select All (Page)</button>
        <button class="btn btn-sm btn-secondary" onclick="unselect_all_rm_on_page()">Unselect All (Page)</button>
        <span class="ml-3 text-muted">Selected RM: <b id="rm-selected-count">${selected_rm_items.size}</b></span>
    `);

	$("#rm-list").html("<p>Loading raw materials...</p>");
	frappe.call({
		method: "aims_customization.api.mss_page_api.get_raw_materials_for_boms",
		args: { boms: JSON.stringify(bom_list) },
		callback: function (r) {
			const rms = r.message || [];
			// save to bomsData? We keep separate; implement local pagination for RM as well
			// we store into bomsData_rm for rendering pages
			window._rmResults = rms; // store globally for pagination
			renderRMPage(0); // show first page
		},
	});
}

function renderRMPage(pageIndex) {
	if (!window._rmResults) {
		$("#rm-list").html("<p>No RM data.</p>");
		return;
	}
	const start = pageIndex * PAGE_LIMIT;
	const pageSlice = window._rmResults.slice(0, (pageIndex + 1) * PAGE_LIMIT);
	// store current page pointer
	window._rmPageIndex = pageIndex;

	let html = `<table class="table table-bordered table-sm"><thead><tr>
        <th>Select</th><th>RM Item</th><th>Total Required Qty</th><th>Available Qty</th><th>Consumed Qty</th>
    </tr></thead><tbody>`;

	pageSlice.forEach((row) => {
		const checked = selected_rm_items.has(row.rm_item_code) ? "checked" : "";
		html += `<tr>
            <td onclick="event.stopPropagation()"><input type="checkbox" class="rm-chk" data-rm='${escapeHtml(
				JSON.stringify(row)
			)}' data-rmcode="${row.rm_item_code}" ${checked}></td>
            <td>${row.rm_item_code} - ${row.rm_item_name || ""}</td>
            <td>${row.total_required_qty}</td>
            <td>${row.available_qty}</td>
            <td>${row.consumed_qty}</td>
        </tr>`;
	});

	html += `</tbody></table>`;
	$("#rm-list").html(html);

	$(".rm-chk")
		.off("change")
		.on("change", function () {
			const rc = $(this).data("rmcode");
			if ($(this).prop("checked")) selected_rm_items.add(rc);
			else selected_rm_items.delete(rc);
			$("#rm-selected-count").text(selected_rm_items.size);
		});

	// load more control for RM
	const totalPages = Math.ceil(window._rmResults.length / PAGE_LIMIT);
	if (pageIndex + 1 < totalPages) {
		$("#rm-load-more").html(
			`<button class="btn btn-sm btn-outline-primary" onclick="renderRMPage(window._rmPageIndex + 1)">Load more RM</button>`
		);
	} else {
		$("#rm-load-more").empty();
	}
}
function select_all_rm_on_page() {
	$("#rm-list .rm-chk").prop("checked", true).trigger("change");
}
function unselect_all_rm_on_page() {
	$("#rm-list .rm-chk").prop("checked", false).trigger("change");
}

// ---------------- LEVEL 5: WORK ORDERS aggregated from selected SOs ----------------
function load_work_orders_for_selected_sos(reset = false) {
	const so_list = set_to_array(selected_sales_orders);
	if (!so_list.length) {
		$("#wo-list").empty();
		wosData = [];
		wosPage = 0;
		selected_work_orders.clear();
		return;
	}

	if (reset) {
		wosData = [];
		wosPage = 0;
	}

	$("#wo-controls").html(`
        <button class="btn btn-sm btn-primary mr-1" onclick="select_all_wos_on_page()">Select All (Page)</button>
        <button class="btn btn-sm btn-secondary" onclick="unselect_all_wos_on_page()">Unselect All (Page)</button>
        <span class="ml-3 text-muted">Selected WOs: <b id="wo-selected-count">${selected_work_orders.size}</b></span>
    `);

	// fetch once and paginate client-side
	if (wosData.length) {
		renderWOsPage();
		return;
	}

	$("#wo-list").html("<p>Loading work orders...</p>");
	frappe.call({
		method: "aims_customization.api.mss_page_api.get_work_orders_for_sales_orders",
		args: { so_list: JSON.stringify(so_list) },
		callback: function (r) {
			wosData = r.message || [];
			wosPage = 0;
			renderWOsPage();
		},
	});
}

function renderWOsPage() {
	const endIndex = (wosPage + 1) * PAGE_LIMIT;
	const pageSlice = wosData.slice(0, endIndex);

	let html = `<table class="table table-bordered table-sm"><thead><tr><th>Select</th><th>WO</th><th>Item</th><th>Qty</th><th>Produced</th></tr></thead><tbody>`;
	pageSlice.forEach((w) => {
		const checked = selected_work_orders.has(w.wo_name) ? "checked" : "";
		html += `<tr onclick="toggle_wo_and_load_jcs('${w.wo_name}')">
            <td onclick="event.stopPropagation()"><input type="checkbox" class="wo-chk" data-wo='${escapeHtml(
				JSON.stringify(w)
			)}' data-woname="${w.wo_name}" ${checked}></td>
            <td>${w.wo_name}</td><td>${w.production_item}</td><td>${w.wo_qty}</td><td>${
			w.produced_qty
		}</td>
        </tr>`;
	});
	html += `</tbody></table>`;
	$("#wo-list").html(html);

	$(".wo-chk")
		.off("change")
		.on("change", function () {
			const woname = $(this).data("woname");
			if ($(this).prop("checked")) selected_work_orders.add(woname);
			else selected_work_orders.delete(woname);
			$("#wo-selected-count").text(selected_work_orders.size);
		});

	const totalPages = Math.ceil(wosData.length / PAGE_LIMIT);
	if (wosPage + 1 < totalPages) {
		$("#wo-load-more").html(
			`<button class="btn btn-sm btn-outline-primary" onclick="wosPage++; renderWOsPage();">Load more WOs</button>`
		);
	} else {
		$("#wo-load-more").empty();
	}
}
function select_all_wos_on_page() {
	$("#wo-list .wo-chk").prop("checked", true).trigger("change");
}
function unselect_all_wos_on_page() {
	$("#wo-list .wo-chk").prop("checked", false).trigger("change");
}
function toggle_wo_and_load_jcs(wo) {
	const cb = $(`.wo-chk[data-woname='${wo}']`);
	cb.prop("checked", !cb.prop("checked")).trigger("change");
	load_job_cards_for_selected_wos(true);
}

// ---------------- LEVEL 6: JOB CARDS aggregated from selected WOs ----------------
function load_job_cards_for_selected_wos(reset = false) {
	const wo_list = set_to_array(selected_work_orders);
	if (!wo_list.length) {
		$("#jc-list").empty();
		jcsData = [];
		jcsPage = 0;
		selected_job_cards.clear();
		return;
	}

	if (reset) {
		jcsData = [];
		jcsPage = 0;
	}

	$("#jc-controls").html(`
        <button class="btn btn-sm btn-primary mr-1" onclick="select_all_jc_on_page()">Select All (Page)</button>
        <button class="btn btn-sm btn-secondary" onclick="unselect_all_jc_on_page()">Unselect All (Page)</button>
        <span class="ml-3 text-muted">Selected JCs: <b id="jc-selected-count">${selected_job_cards.size}</b></span>
    `);

	if (jcsData.length) {
		renderJCsPage();
		return;
	}

	$("#jc-list").html("<p>Loading job cards...</p>");
	frappe.call({
		method: "aims_customization.api.mss_page_api.get_job_cards_for_work_orders",
		args: { wo_list: JSON.stringify(wo_list) },
		callback: function (r) {
			jcsData = r.message || [];
			jcsPage = 0;
			renderJCsPage();
		},
	});
}

function renderJCsPage() {
	const endIndex = (jcsPage + 1) * PAGE_LIMIT;
	const pageSlice = jcsData.slice(0, endIndex);

	let html = `<div class="table-scroll-container"><table class="table table-bordered table-sm"><thead><tr>
        <th>Select</th><th>Job Card</th><th>Status</th><th>Operation</th><th>Workstation</th><th>RM Item</th><th>Required</th><th>Available</th><th>Consumed</th>
    </tr></thead><tbody>`;
	pageSlice.forEach((rw) => {
		const checked = selected_job_cards.has(rw.job_card) ? "checked" : "";
		html += `<tr>
            <td onclick="event.stopPropagation()"><input type="checkbox" class="jc-chk" data-jc='${escapeHtml(
				JSON.stringify(rw)
			)}' data-jcname="${rw.job_card}" ${checked}></td>
            <td>${rw.job_card}</td><td>${rw.job_card_status}</td><td>${rw.operation}</td><td>${
			rw.workstation
		}</td>
            <td>${rw.rm_item_code}</td><td>${rw.required_qty}</td><td>${
			rw.available_qty
		}</td><td>${rw.consumed_qty}</td>
        </tr>`;
	});
	html += `</tbody></table></div>`;
	$("#jc-list").html(html);

	$(".jc-chk")
		.off("change")
		.on("change", function () {
			const jcname = $(this).data("jcname");
			if ($(this).prop("checked")) selected_job_cards.add(jcname);
			else selected_job_cards.delete(jcname);
			$("#jc-selected-count").text(selected_job_cards.size);
		});

	const totalPages = Math.ceil(jcsData.length / PAGE_LIMIT);
	if (jcsPage + 1 < totalPages) {
		$("#jc-load-more").html(
			`<button class="btn btn-sm btn-outline-primary" onclick="jcsPage++; renderJCsPage();">Load more Job Cards</button>`
		);
	} else {
		$("#jc-load-more").empty();
	}
}
function select_all_jc_on_page() {
	$("#jc-list .jc-chk").prop("checked", true).trigger("change");
}
function unselect_all_jc_on_page() {
	$("#jc-list .jc-chk").prop("checked", false).trigger("change");
}

// ---------------- utilities ----------------
function escapeHtml(str) {
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/'/g, "&#39;")
		.replace(/\"/g, "&quot;");
}
function unescapeHtml(str) {
	return String(str)
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&");
}

// ---------------- external getters ----------------
function getSelectedSalesOrders() {
	return set_to_array(selected_sales_orders);
}
function getSelectedItemRows() {
	const rows = [];
	$(".item-row-chk:checked").each(function () {
		rows.push(JSON.parse(unescapeHtml($(this).data("row"))));
	});
	return rows;
}
function getSelectedBOMs() {
	return set_to_array(selected_boms);
}
function getSelectedRMItems() {
	return set_to_array(selected_rm_items);
}
function getSelectedWOs() {
	return set_to_array(selected_work_orders);
}
function getSelectedJobCards() {
	return set_to_array(selected_job_cards);
}

// ---------------- init ----------------
$(document).ready(function () {
	/* initial load handled in on_page_load */
});
