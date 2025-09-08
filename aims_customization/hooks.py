app_name = "aims_customization"
app_title = "Aims Customization"
app_publisher = "Assimilate Technologies"
app_description = "For aims common and core customozation"
app_email = "info@assimilatetechnologies.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "aims_customization",
# 		"logo": "/assets/aims_customization/logo.png",
# 		"title": "Aims Customization",
# 		"route": "/aims_customization",
# 		"has_permission": "aims_customization.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/aims_customization/css/aims_customization.css"
# app_include_js = "/assets/aims_customization/js/aims_customization.js"

# include js, css files in header of web template
# web_include_css = "/assets/aims_customization/css/aims_customization.css"
# web_include_js = "/assets/aims_customization/js/aims_customization.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "aims_customization/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "aims_customization/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "aims_customization.utils.jinja_methods",
# 	"filters": "aims_customization.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "aims_customization.install.before_install"
# after_install = "aims_customization.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "aims_customization.uninstall.before_uninstall"
# after_uninstall = "aims_customization.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "aims_customization.utils.before_app_install"
# after_app_install = "aims_customization.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "aims_customization.utils.before_app_uninstall"
# after_app_uninstall = "aims_customization.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "aims_customization.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"aims_customization.tasks.all"
# 	],
# 	"daily": [
# 		"aims_customization.tasks.daily"
# 	],
# 	"hourly": [
# 		"aims_customization.tasks.hourly"
# 	],
# 	"weekly": [
# 		"aims_customization.tasks.weekly"
# 	],
# 	"monthly": [
# 		"aims_customization.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "aims_customization.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "aims_customization.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "aims_customization.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["aims_customization.utils.before_request"]
# after_request = ["aims_customization.utils.after_request"]

# Job Events
# ----------
# before_job = ["aims_customization.utils.before_job"]
# after_job = ["aims_customization.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"aims_customization.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

after_migrate = [
    "aims_customization.patches.v_0.make_lead_submittable.execute",
    "aims_customization.patches.v_0.add_pre_feasibility_link.execute",
    "aims_customization.patches.v_0.add_design_document_field_on_lead.execute",
    "aims_customization.patches.v_0.add_short_close_field_on_lead.execute",
    "aims_customization.patches.v_0.add_rejection_details_field_on_quotation.execute",
    "aims_customization.patches.v_0.add_field_customer_approval_email_on_quotation.execute",
    "aims_customization.patches.v_0.add_customer_po_attachment_field_on_sales_order.execute",
    "aims_customization.patches.v_0.add_short_close_reason_field.execute",
    
    
    
]
doctype_js = {
	"Lead": ["public/js/add_pre_feasibility_option_on_lead.js",
    "public/js/workflow_state_submitand_closed_hide_feasibility_button.js",
    "public/js/hide_workflow_action_closed_lead.js",
    "public/js/short_close_field_show_only_feasibility_reject.js"],
    "Pre Feasibility":"public/js/fetched_current_login_user_name_on_preparedby_field_on_pre_feasibility.js",
    "Sales Order":"public/js/on_sales_order_hide_buttons_when_workflow_state_pending_for_approval.js"
    
    
    
    
}


doc_events = {
    "Lead": {
        "on_submit": "aims_customization.api.make_pre_feasibility_mandatory.before_submit_check_pre_feasibility",
        "on_update": "aims_customization.api.update_workflow_state_based_on_link_prefeasibility.before_save"

    },
    "Quotation": {
       
        
        "validate": "aims_customization.api.before_quote_reject_mandatory_rejection_detail.validate_quotation_workflow"
    },
    "Sales Order": {
        "validate": "aims_customization.api.short_close_reason_mandatory_when_sales_order_rejected.validate_rejection_details"
    }

    
}