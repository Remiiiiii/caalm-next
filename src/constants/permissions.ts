/**
 * Permission Definitions
 * Global permission keys organized by category
 * These permissions are shared across all organizations
 */

export const PERMISSIONS = {
	// Calendar Permissions
	CALENDAR: {
		VIEW_OWN: "calendar.view_own",
		VIEW_TEAM: "calendar.view_team",
		VIEW_ALL: "calendar.view_all",
		CREATE: "calendar.create",
		EDIT_OWN: "calendar.edit_own",
		EDIT_ALL: "calendar.edit_all",
		DELETE_OWN: "calendar.delete_own",
		DELETE_ALL: "calendar.delete_all",
	},

	// Event Management Permissions
	EVENTS: {
		CREATE: "events.create",
		INVITE: "events.invite",
		APPROVE: "events.approve",
		RESCHEDULE: "events.reschedule",
		CANCEL: "events.cancel",
	},

	// Contract Permissions
	CONTRACTS: {
		VIEW: "contracts.view",
		VIEW_OWN: "contracts.view_own",
		VIEW_DEPARTMENT: "contracts.view_department",
		VIEW_ALL: "contracts.view_all",
		CREATE: "contracts.create",
		EDIT: "contracts.edit",
		REVIEW: "contracts.review",
		APPROVE: "contracts.approve",
		SIGN: "contracts.sign",
	},

	// Integration Permissions
	INTEGRATIONS: {
		OUTLOOK_CONNECT: "integrations.outlook.connect",
		OUTLOOK_SYNC: "integrations.outlook.sync",
		MANAGE: "integrations.manage",
	},

	// User Management Permissions
	USERS: {
		VIEW: "users.view",
		INVITE: "users.invite",
		EDIT: "users.edit",
		ASSIGN_ROLES: "users.assign_roles",
		DEACTIVATE: "users.deactivate",
	},

	// Organization Settings Permissions
	SETTINGS: {
		VIEW: "settings.view",
		EDIT: "settings.edit",
		BILLING: "settings.billing",
		INTEGRATIONS: "settings.integrations",
	},

	// AI Assistant Permissions
	AI: {
		CHAT: "ai.chat",
		DOCUMENT_ANALYSIS: "ai.document_analysis",
		MEETING_PREP: "ai.meeting_prep",
		IMAGE_GENERATE: "ai.image_generate",
	},

	// Audit Permissions
	AUDIT: {
		VIEW: "audit.view",
		EXPORT: "audit.export",
	},

	// IT/Software Engineering Permissions
	IT: {
		VIEW_RATE_LIMITS: "it.view_rate_limits",
		VIEW_SYSTEM_LOGS: "it.view_system_logs",
		MANAGE_API_KEYS: "it.manage_api_keys",
		VIEW_ANALYTICS: "it.view_analytics",
		MANAGE_DEPLOYMENTS: "it.manage_deployments",
		VIEW_MONITORING: "it.view_monitoring",
		MANAGE_CI_CD: "it.manage_ci_cd",
		VIEW_SECURITY: "it.view_security",
		MANAGE_DATABASE: "it.manage_database",
		VIEW_INCIDENTS: "it.view_incidents",
		VIEW_RUNBOOKS: "it.view_runbooks",
		MANAGE_RUNBOOKS: "it.manage_runbooks",
		VIEW_ROADMAP: "it.view_roadmap",
		MANAGE_ROADMAP: "it.manage_roadmap",
	},

	// News Permissions
	NEWS: {
		CREATE: "news.create",
		READ: "news.read",
		UPDATE: "news.update",
		DELETE: "news.delete",
		PUBLISH: "news.publish",
	},

	// License Permissions
	LICENSES: {
		VIEW: "licenses.view",
		VIEW_OWN: "licenses.view_own",
		VIEW_DEPARTMENT: "licenses.view_department",
		VIEW_ALL: "licenses.view_all",
		CREATE: "licenses.create",
		EDIT: "licenses.edit",
		DELETE: "licenses.delete",
		ALLOCATE: "licenses.allocate",
		RENEW: "licenses.renew",
		APPROVE: "licenses.approve",
	},

	// Approval workflow overrides (explicit; never inferred from role names)
	APPROVALS: {
		OVERRIDE: "approvals.override",
	},

	// Tickets / support queue
	TICKETS: {
		VIEW: "tickets.view",
		CREATE: "tickets.create",
		EDIT: "tickets.edit",
		DELETE: "tickets.delete",
		ASSIGN: "tickets.assign",
		RESOLVE: "tickets.resolve",
	},

	/**
	 * Funding & Retention — dollar-ranked retention + pursuit pipeline.
	 * Separate from CONTRACTS so capture/finance roles can be scoped without
	 * granting full contract edit/approve powers.
	 */
	FUNDING: {
		VIEW: "funding.view",
		MANAGE: "funding.manage",
	},

	// Platform / break-glass capabilities (Super Admin only by default)
	PLATFORM: {
		DIAGNOSE: "platform.diagnose",
		MANAGE_SCHEMA: "platform.manage_schema",
		FORCE_DELETE: "platform.force_delete",
		VIEW_ALL_ORGS: "platform.view_all_orgs",
		SYSTEM_SETTINGS: "platform.system_settings",
		ELEVATE: "platform.elevate",
	},
} as const;

/** Permissions that should show a Sensitive badge in the admin UI */
export const SENSITIVE_PERMISSIONS: readonly string[] = [
	PERMISSIONS.USERS.ASSIGN_ROLES,
	PERMISSIONS.USERS.DEACTIVATE,
	PERMISSIONS.SETTINGS.BILLING,
	PERMISSIONS.CONTRACTS.APPROVE,
	PERMISSIONS.CONTRACTS.SIGN,
	PERMISSIONS.LICENSES.APPROVE,
	PERMISSIONS.LICENSES.DELETE,
	PERMISSIONS.APPROVALS.OVERRIDE,
	PERMISSIONS.TICKETS.DELETE,
	PERMISSIONS.TICKETS.ASSIGN,
	PERMISSIONS.TICKETS.RESOLVE,
	PERMISSIONS.IT.MANAGE_DATABASE,
	PERMISSIONS.IT.MANAGE_API_KEYS,
	PERMISSIONS.IT.MANAGE_DEPLOYMENTS,
	PERMISSIONS.PLATFORM.DIAGNOSE,
	PERMISSIONS.PLATFORM.MANAGE_SCHEMA,
	PERMISSIONS.PLATFORM.FORCE_DELETE,
	PERMISSIONS.PLATFORM.VIEW_ALL_ORGS,
	PERMISSIONS.PLATFORM.SYSTEM_SETTINGS,
	PERMISSIONS.PLATFORM.ELEVATE,
] as const;

// Flatten all permissions into a single array
export const ALL_PERMISSIONS = Object.values(PERMISSIONS).flatMap((category) =>
	Object.values(category),
) as string[];

// Permission metadata for seeding
export const PERMISSION_DEFINITIONS = [
	// Calendar
	{
		key: PERMISSIONS.CALENDAR.VIEW_OWN,
		name: "View Own Calendar",
		category: "calendar",
		description: "View own calendar events",
	},
	{
		key: PERMISSIONS.CALENDAR.VIEW_TEAM,
		name: "View Team Calendar",
		category: "calendar",
		description: "View team calendar events",
	},
	{
		key: PERMISSIONS.CALENDAR.VIEW_ALL,
		name: "View All Calendars",
		category: "calendar",
		description: "View all organization calendars",
	},
	{
		key: PERMISSIONS.CALENDAR.CREATE,
		name: "Create Calendar Events",
		category: "calendar",
		description: "Create new calendar events",
	},
	{
		key: PERMISSIONS.CALENDAR.EDIT_OWN,
		name: "Edit Own Events",
		category: "calendar",
		description: "Edit own calendar events",
	},
	{
		key: PERMISSIONS.CALENDAR.EDIT_ALL,
		name: "Edit All Events",
		category: "calendar",
		description: "Edit any calendar event",
	},
	{
		key: PERMISSIONS.CALENDAR.DELETE_OWN,
		name: "Delete Own Events",
		category: "calendar",
		description: "Delete own calendar events",
	},
	{
		key: PERMISSIONS.CALENDAR.DELETE_ALL,
		name: "Delete All Events",
		category: "calendar",
		description: "Delete any calendar event",
	},

	// Events
	{
		key: PERMISSIONS.EVENTS.CREATE,
		name: "Create Events",
		category: "events",
		description: "Create new events",
	},
	{
		key: PERMISSIONS.EVENTS.INVITE,
		name: "Invite Participants",
		category: "events",
		description: "Invite participants to events",
	},
	{
		key: PERMISSIONS.EVENTS.APPROVE,
		name: "Approve Events",
		category: "events",
		description: "Approve event requests",
	},
	{
		key: PERMISSIONS.EVENTS.RESCHEDULE,
		name: "Reschedule Events",
		category: "events",
		description: "Reschedule events",
	},
	{
		key: PERMISSIONS.EVENTS.CANCEL,
		name: "Cancel Events",
		category: "events",
		description: "Cancel events",
	},

	// Contracts
	{
		key: PERMISSIONS.CONTRACTS.VIEW,
		name: "View Contracts",
		category: "contracts",
		description: "View contracts (base gate)",
	},
	{
		key: PERMISSIONS.CONTRACTS.VIEW_OWN,
		name: "View Own Contracts",
		category: "contracts",
		description: "List only contracts you own",
	},
	{
		key: PERMISSIONS.CONTRACTS.VIEW_DEPARTMENT,
		name: "View Department Contracts",
		category: "contracts",
		description: "List contracts in your department",
	},
	{
		key: PERMISSIONS.CONTRACTS.VIEW_ALL,
		name: "View All Organization Contracts",
		category: "contracts",
		description: "List all contracts in the organization",
	},
	{
		key: PERMISSIONS.CONTRACTS.CREATE,
		name: "Create Contracts",
		category: "contracts",
		description: "Create new contracts",
	},
	{
		key: PERMISSIONS.CONTRACTS.EDIT,
		name: "Edit Contracts",
		category: "contracts",
		description: "Edit contracts",
	},
	{
		key: PERMISSIONS.CONTRACTS.REVIEW,
		name: "Review Contracts",
		category: "contracts",
		description: "Review and comment on contracts",
	},
	{
		key: PERMISSIONS.CONTRACTS.APPROVE,
		name: "Approve Contracts",
		category: "contracts",
		description: "Approve contracts",
	},
	{
		key: PERMISSIONS.CONTRACTS.SIGN,
		name: "Sign Contracts",
		category: "contracts",
		description: "Sign contracts",
	},

	// Integrations
	{
		key: PERMISSIONS.INTEGRATIONS.OUTLOOK_CONNECT,
		name: "Connect Outlook",
		category: "integrations",
		description: "Connect Outlook account",
	},
	{
		key: PERMISSIONS.INTEGRATIONS.OUTLOOK_SYNC,
		name: "Sync Outlook",
		category: "integrations",
		description: "Sync with Outlook",
	},
	{
		key: PERMISSIONS.INTEGRATIONS.MANAGE,
		name: "Manage Integrations",
		category: "integrations",
		description: "Manage all integrations",
	},

	// Users
	{
		key: PERMISSIONS.USERS.VIEW,
		name: "View Users",
		category: "users",
		description: "View user list",
	},
	{
		key: PERMISSIONS.USERS.INVITE,
		name: "Invite Users",
		category: "users",
		description: "Invite new users",
	},
	{
		key: PERMISSIONS.USERS.EDIT,
		name: "Edit Users",
		category: "users",
		description: "Edit user details",
	},
	{
		key: PERMISSIONS.USERS.ASSIGN_ROLES,
		name: "Assign Roles",
		category: "users",
		description: "Assign roles to users",
	},
	{
		key: PERMISSIONS.USERS.DEACTIVATE,
		name: "Deactivate Users",
		category: "users",
		description: "Deactivate users",
	},

	// Settings
	{
		key: PERMISSIONS.SETTINGS.VIEW,
		name: "View Settings",
		category: "settings",
		description: "View organization settings",
	},
	{
		key: PERMISSIONS.SETTINGS.EDIT,
		name: "Edit Settings",
		category: "settings",
		description: "Edit organization settings",
	},
	{
		key: PERMISSIONS.SETTINGS.BILLING,
		name: "Manage Billing",
		category: "settings",
		description: "Manage billing",
	},
	{
		key: PERMISSIONS.SETTINGS.INTEGRATIONS,
		name: "Configure Integrations",
		category: "settings",
		description: "Configure integrations",
	},

	// AI
	{
		key: PERMISSIONS.AI.CHAT,
		name: "Use AI Chat",
		category: "ai",
		description: "Use AI chat feature",
	},
	{
		key: PERMISSIONS.AI.DOCUMENT_ANALYSIS,
		name: "AI Document Analysis",
		category: "ai",
		description: "Use AI for document analysis",
	},
	{
		key: PERMISSIONS.AI.MEETING_PREP,
		name: "AI Meeting Prep",
		category: "ai",
		description: "Get AI meeting preparation suggestions",
	},

	// Audit
	{
		key: PERMISSIONS.AUDIT.VIEW,
		name: "View Audit Logs",
		category: "audit",
		description: "View audit logs",
	},
	{
		key: PERMISSIONS.AUDIT.EXPORT,
		name: "Export Audit Logs",
		category: "audit",
		description: "Export audit logs",
	},

	// IT/Software Engineering
	{
		key: PERMISSIONS.IT.VIEW_RATE_LIMITS,
		name: "View Rate Limits",
		category: "it",
		description: "Access to rate limit monitoring dashboard",
	},
	{
		key: PERMISSIONS.IT.VIEW_SYSTEM_LOGS,
		name: "View System Logs",
		category: "it",
		description: "Access to system logs",
	},
	{
		key: PERMISSIONS.IT.MANAGE_API_KEYS,
		name: "Manage API Keys",
		category: "it",
		description: "Manage API keys",
	},
	{
		key: PERMISSIONS.IT.VIEW_ANALYTICS,
		name: "View Analytics",
		category: "it",
		description: "Access to analytics dashboard",
	},
	{
		key: PERMISSIONS.IT.MANAGE_DEPLOYMENTS,
		name: "Manage Deployments",
		category: "it",
		description: "Manage deployments",
	},
	{
		key: PERMISSIONS.IT.VIEW_MONITORING,
		name: "View Monitoring",
		category: "it",
		description: "View monitoring dashboards",
	},
	{
		key: PERMISSIONS.IT.MANAGE_CI_CD,
		name: "Manage CI/CD",
		category: "it",
		description: "Manage CI/CD pipelines",
	},
	{
		key: PERMISSIONS.IT.VIEW_SECURITY,
		name: "View Security",
		category: "it",
		description: "View security dashboard",
	},
	{
		key: PERMISSIONS.IT.MANAGE_DATABASE,
		name: "Manage Database",
		category: "it",
		description: "Database administration",
	},
	{
		key: PERMISSIONS.IT.VIEW_INCIDENTS,
		name: "View Incidents",
		category: "it",
		description: "View incident management",
	},
	{
		key: PERMISSIONS.IT.VIEW_RUNBOOKS,
		name: "View Runbooks",
		category: "it",
		description: "View operational runbooks in the IT portal",
	},
	{
		key: PERMISSIONS.IT.MANAGE_RUNBOOKS,
		name: "Manage Runbooks",
		category: "it",
		description: "Create, edit, publish, and archive IT runbooks",
	},
	{
		key: PERMISSIONS.IT.VIEW_ROADMAP,
		name: "View CLM Roadmap",
		category: "it",
		description: "View the in-app CLM completion roadmap and progress",
	},
	{
		key: PERMISSIONS.IT.MANAGE_ROADMAP,
		name: "Manage CLM Roadmap",
		category: "it",
		description: "Start roadmap tasks and bind branches/PRs (cannot force-complete)",
	},

	// News
	{
		key: PERMISSIONS.NEWS.CREATE,
		name: "Create News Articles",
		category: "news",
		description: "Create new news articles for the company feed",
	},
	{
		key: PERMISSIONS.NEWS.READ,
		name: "View News Articles",
		category: "news",
		description: "View news articles including drafts",
	},
	{
		key: PERMISSIONS.NEWS.UPDATE,
		name: "Edit News Articles",
		category: "news",
		description: "Edit existing news articles",
	},
	{
		key: PERMISSIONS.NEWS.DELETE,
		name: "Delete News Articles",
		category: "news",
		description: "Delete news articles",
	},
	{
		key: PERMISSIONS.NEWS.PUBLISH,
		name: "Publish News Articles",
		category: "news",
		description: "Publish or unpublish news articles",
	},

	// AI Image Generation
	{
		key: PERMISSIONS.AI.IMAGE_GENERATE,
		name: "Generate AI Images",
		category: "ai",
		description: "Access to AI image generation feature for news thumbnails",
	},

	// Licenses
	{
		key: PERMISSIONS.LICENSES.VIEW,
		name: "View Licenses",
		category: "licenses",
		description: "View licenses (base gate)",
	},
	{
		key: PERMISSIONS.LICENSES.VIEW_OWN,
		name: "View Own Licenses",
		category: "licenses",
		description: "List only licenses you own or are allocated",
	},
	{
		key: PERMISSIONS.LICENSES.VIEW_DEPARTMENT,
		name: "View Department Licenses",
		category: "licenses",
		description: "List licenses in your department",
	},
	{
		key: PERMISSIONS.LICENSES.VIEW_ALL,
		name: "View All Organization Licenses",
		category: "licenses",
		description: "List all licenses in the organization",
	},
	{
		key: PERMISSIONS.LICENSES.CREATE,
		name: "Create Licenses",
		category: "licenses",
		description: "Create new licenses",
	},
	{
		key: PERMISSIONS.LICENSES.EDIT,
		name: "Edit Licenses",
		category: "licenses",
		description: "Edit licenses",
	},
	{
		key: PERMISSIONS.LICENSES.DELETE,
		name: "Delete Licenses",
		category: "licenses",
		description: "Delete licenses",
	},
	{
		key: PERMISSIONS.LICENSES.ALLOCATE,
		name: "Allocate Licenses",
		category: "licenses",
		description: "Allocate licenses to users or departments",
	},
	{
		key: PERMISSIONS.LICENSES.RENEW,
		name: "Renew Licenses",
		category: "licenses",
		description: "Renew licenses",
	},
	{
		key: PERMISSIONS.LICENSES.APPROVE,
		name: "Approve Licenses",
		category: "licenses",
		description: "Approve license requests and renewals",
	},

	// Approvals
	{
		key: PERMISSIONS.APPROVALS.OVERRIDE,
		name: "Override Approvals",
		category: "approvals",
		description:
			"Decide approval steps outside the normal assignee chain (break-glass)",
	},

	// Tickets
	{
		key: PERMISSIONS.TICKETS.VIEW,
		name: "View Tickets",
		category: "tickets",
		description: "View support and operations tickets",
	},
	{
		key: PERMISSIONS.TICKETS.CREATE,
		name: "Create Tickets",
		category: "tickets",
		description: "Create new tickets",
	},
	{
		key: PERMISSIONS.TICKETS.EDIT,
		name: "Edit Tickets",
		category: "tickets",
		description: "Update ticket details and status",
	},
	{
		key: PERMISSIONS.TICKETS.DELETE,
		name: "Delete Tickets",
		category: "tickets",
		description: "Delete tickets",
	},
	{
		key: PERMISSIONS.TICKETS.ASSIGN,
		name: "Assign Tickets",
		category: "tickets",
		description: "Assign tickets to users or teams",
	},
	{
		key: PERMISSIONS.TICKETS.RESOLVE,
		name: "Resolve Tickets",
		category: "tickets",
		description: "Trigger AI resolution on tickets assigned to you",
	},

	// Funding & Retention
	{
		key: PERMISSIONS.FUNDING.VIEW,
		name: "View Funding & Retention",
		category: "funding",
		description:
			"See dollar-ranked retention streams and the funding pursuit pipeline",
	},
	{
		key: PERMISSIONS.FUNDING.MANAGE,
		name: "Manage Funding & Retention",
		category: "funding",
		description:
			"Create/edit pursuits and obligations, mark wins, and spawn proposals from won bids",
	},

	// Platform
	{
		key: PERMISSIONS.PLATFORM.DIAGNOSE,
		name: "RBAC Diagnostics",
		category: "platform",
		description: "Run RBAC diagnostics and clear permission caches",
	},
	{
		key: PERMISSIONS.PLATFORM.MANAGE_SCHEMA,
		name: "Manage Database Schema",
		category: "platform",
		description: "Create or modify database collections and attributes",
	},
	{
		key: PERMISSIONS.PLATFORM.FORCE_DELETE,
		name: "Force Delete Files",
		category: "platform",
		description: "Force-delete files bypassing normal ownership checks",
	},
	{
		key: PERMISSIONS.PLATFORM.VIEW_ALL_ORGS,
		name: "View All Organizations",
		category: "platform",
		description: "Access data across organizations (platform operators)",
	},
	{
		key: PERMISSIONS.PLATFORM.SYSTEM_SETTINGS,
		name: "System Settings",
		category: "platform",
		description: "Manage platform-wide system settings",
	},
	{
		key: PERMISSIONS.PLATFORM.ELEVATE,
		name: "Request Privileged Elevation",
		category: "platform",
		description: "Eligible to request time-boxed privileged access",
	},
] as const;

export type PermissionKey = (typeof ALL_PERMISSIONS)[number];

/** Org Admin baseline: everything except platform break-glass keys */
export function getOrganizationAdminPermissionKeys(): string[] {
	const platformKeys = new Set<string>(Object.values(PERMISSIONS.PLATFORM));
	return ALL_PERMISSIONS.filter((key) => !platformKeys.has(key));
}
