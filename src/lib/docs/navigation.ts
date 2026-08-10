import type { DocsNavGroup } from "./types";

/**
 * Canonical docs IA — modeled after react.dev (Learn + Reference + Guides),
 * adapted to CAALM’s compliance / ops product surface.
 */
export const DOCS_NAV: DocsNavGroup[] = [
	{
		id: "learn",
		title: "Learn",
		description: "Start here. Get oriented, then get productive.",
		items: [
			{
				title: "Welcome to CAALM Docs",
				slug: "learn/welcome",
				path: "learn/welcome",
				summary: "What this documentation is for and how to use it.",
			},
			{
				title: "What is CAALM?",
				slug: "learn/what-is-caalm",
				path: "learn/what-is-caalm",
				summary: "The job CAALM does for your organization.",
			},
			{
				title: "Quick start",
				slug: "learn/quick-start",
				path: "learn/quick-start",
				summary: "From invite or demo to your first useful action.",
			},
			{
				title: "Your first week",
				slug: "learn/first-week",
				path: "learn/first-week",
				summary: "A practical checklist by role.",
			},
			{
				title: "Try the demo sandbox",
				slug: "learn/demo-sandbox",
				path: "learn/demo-sandbox",
				summary: "Explore safely without affecting production data.",
			},
		],
	},
	{
		id: "concepts",
		title: "Concepts",
		description: "How CAALM thinks — the mental models that unlock everything else.",
		items: [
			{
				title: "Mental model",
				slug: "concepts/mental-model",
				path: "concepts/mental-model",
				summary: "Documents, deadlines, ownership, and proof.",
			},
			{
				title: "Roles and home dashboards",
				slug: "concepts/roles-and-dashboards",
				path: "concepts/roles-and-dashboards",
				summary: "What each role sees first, and why.",
			},
			{
				title: "Permissions (not role shortcuts)",
				slug: "concepts/permissions",
				path: "concepts/permissions",
				summary: "How access really works in CAALM.",
			},
			{
				title: "Organizations, departments, and divisions",
				slug: "concepts/org-structure",
				path: "concepts/org-structure",
				summary: "How work is scoped across the org.",
			},
			{
				title: "Lifecycle of a record",
				slug: "concepts/lifecycle",
				path: "concepts/lifecycle",
				summary: "Upload → review → approve → monitor → renew.",
			},
			{
				title: "Notifications and deadlines",
				slug: "concepts/notifications-deadlines",
				path: "concepts/notifications-deadlines",
				summary: "How CAALM keeps renewals from becoming surprises.",
			},
			{
				title: "Security and 2FA",
				slug: "concepts/security-2fa",
				path: "concepts/security-2fa",
				summary: "Sessions, two-factor auth, and safe defaults.",
			},
		],
	},
	{
		id: "guides",
		title: "Guides by role",
		description: "Step-by-step playbooks for the people who use CAALM every day.",
		items: [
			{
				title: "Executive / Super Admin",
				slug: "guides/super-admin",
				path: "guides/super-admin",
				summary:
					"Platform operators and break-glass access — keep this role rare.",
			},
			{
				title: "Organization Admin",
				slug: "guides/organization-admin",
				path: "guides/organization-admin",
				summary:
					"Run the company in CAALM: invites, roles, settings, and day-to-day ops.",
			},
			{
				title: "Department Manager",
				slug: "guides/department-manager",
				path: "guides/department-manager",
				summary: "Own your division’s contracts and licenses.",
			},
			{
				title: "Viewer",
				slug: "guides/viewer",
				path: "guides/viewer",
				summary: "Read, monitor, and escalate without editing.",
			},
			{
				title: "Content Creator",
				slug: "guides/content-creator",
				path: "guides/content-creator",
				summary: "Publish company news people actually read.",
			},
			{
				title: "IT staff",
				slug: "guides/it-staff",
				path: "guides/it-staff",
				summary: "Operate the IT portal and support the platform.",
			},
		],
	},
	{
		id: "reference",
		title: "Feature reference",
		description: "Deep pages for every major area of the product.",
		items: [
			{
				title: "Dashboards",
				slug: "reference/dashboards",
				path: "reference/dashboards",
				summary: "Home screens, widgets, and what to act on first.",
			},
			{
				title: "Contracts",
				slug: "reference/contracts",
				path: "reference/contracts",
				summary: "Browse, upload, assign, review, and renew contracts.",
			},
			{
				title: "Licenses",
				slug: "reference/licenses",
				path: "reference/licenses",
				summary: "Track credentials and renewals that keep you legal.",
			},
			{
				title: "Approvals and proposals",
				slug: "reference/approvals",
				path: "reference/approvals",
				summary: "Queues, decision flows, and separation of duties.",
			},
			{
				title: "Calendar",
				slug: "reference/calendar",
				path: "reference/calendar",
				summary: "Events, shared calendars, and deadline visibility.",
			},
			{
				title: "Files library",
				slug: "reference/files",
				path: "reference/files",
				summary: "Uploads, documents, images, media, and sharing.",
			},
			{
				title: "Audits and compliance",
				slug: "reference/audits",
				path: "reference/audits",
				summary: "Compliance status, KRIs, and audit logs.",
			},
			{
				title: "Analytics and reports",
				slug: "reference/analytics",
				path: "reference/analytics",
				summary: "Overview, quick view, C-suite, and division views.",
			},
			{
				title: "Company news",
				slug: "reference/company-news",
				path: "reference/company-news",
				summary: "Read the feed; author and publish articles.",
			},
			{
				title: "Notifications",
				slug: "reference/notifications",
				path: "reference/notifications",
				summary: "In-app center, email/SMS, and preference controls.",
			},
			{
				title: "Search",
				slug: "reference/search",
				path: "reference/search",
				summary: "Find records across the protected app.",
			},
			{
				title: "CAALM Assistant",
				slug: "reference/assistant",
				path: "reference/assistant",
				summary: "Chat, document analysis, and meeting prep.",
			},
			{
				title: "Team and user management",
				slug: "reference/team",
				path: "reference/team",
				summary: "Invite users, manage roles, assign tasks.",
			},
			{
				title: "Settings and profile",
				slug: "reference/settings",
				path: "reference/settings",
				summary: "Personal settings, 2FA, and View My Access.",
			},
			{
				title: "Billing and integrations",
				slug: "reference/billing-integrations",
				path: "reference/billing-integrations",
				summary: "Plans, usage, Outlook, and API keys.",
			},
			{
				title: "SAM.gov advanced resources",
				slug: "reference/sam-gov",
				path: "reference/sam-gov",
				summary: "Search federal opportunities from CAALM.",
			},
			{
				title: "IT portal",
				slug: "reference/it-portal",
				path: "reference/it-portal",
				summary: "Monitoring, security, CI/CD, incidents, and more.",
			},
			{
				title: "Permissions catalog",
				slug: "reference/permissions-catalog",
				path: "reference/permissions-catalog",
				summary: "Every permission key, in plain language.",
			},
		],
	},
	{
		id: "admin",
		title: "Admin playbooks",
		description: "Setup and governance tasks for people who run CAALM.",
		items: [
			{
				title: "Stand up a new organization",
				slug: "admin/standup",
				path: "admin/standup",
				summary: "The first 10 things after you get keys to the kingdom.",
			},
			{
				title: "Invite and onboard users",
				slug: "admin/invite-onboard",
				path: "admin/invite-onboard",
				summary: "Invites, roles, divisions, and first-login success.",
			},
			{
				title: "Design a permission model",
				slug: "admin/permission-model",
				path: "admin/permission-model",
				summary: "Assign permissions without painting yourself into a corner.",
			},
			{
				title: "Require and recover 2FA",
				slug: "admin/require-2fa",
				path: "admin/require-2fa",
				summary: "Org policy, setup, and unlock paths.",
			},
			{
				title: "Configure billing and plans",
				slug: "admin/billing",
				path: "admin/billing",
				summary: "Tiers, invoices, and usage meters.",
			},
			{
				title: "Connect Outlook and integrations",
				slug: "admin/integrations",
				path: "admin/integrations",
				summary: "Calendar sync and org API keys.",
			},
		],
	},
	{
		id: "runbooks",
		title: "Runbooks",
		description:
			"How operational runbooks work in CAALM — and where IT keeps the live ones.",
		items: [
			{
				title: "What are runbooks?",
				slug: "runbooks/overview",
				path: "runbooks/overview",
				summary: "Action guides for production problems, not product manuals.",
			},
			{
				title: "Using the IT Runbooks CMS",
				slug: "runbooks/using-the-cms",
				path: "runbooks/using-the-cms",
				summary: "Find, open, create, and update live runbooks in the IT portal.",
			},
			{
				title: "Writing a good runbook",
				slug: "runbooks/writing",
				path: "runbooks/writing",
				summary: "Symptoms, steps, verification, and escalation that work at 2 a.m.",
			},
			{
				title: "Integrations",
				slug: "runbooks/integrations",
				path: "runbooks/integrations",
				summary: "How PagerDuty, Opsgenie, and monitoring hooks attach later.",
			},
			{
				title: "Admin setup",
				slug: "runbooks/admin-setup",
				path: "runbooks/admin-setup",
				summary: "Permissions, Appwrite collection, and first published runbooks.",
			},
		],
	},
	{
		id: "troubleshooting",
		title: "Troubleshooting",
		description: "When something looks wrong — start here.",
		items: [
			{
				title: "I can’t sign in",
				slug: "troubleshooting/cant-sign-in",
				path: "troubleshooting/cant-sign-in",
				summary: "Session, password, invite, and 2FA issues.",
			},
			{
				title: "I can’t see a contract or license",
				slug: "troubleshooting/missing-records",
				path: "troubleshooting/missing-records",
				summary: "Scope, permissions, and filters that hide work.",
			},
			{
				title: "Permission denied / locked items",
				slug: "troubleshooting/permission-denied",
				path: "troubleshooting/permission-denied",
				summary: "What locks mean and who can unlock them.",
			},
			{
				title: "Missed renewal or quiet notifications",
				slug: "troubleshooting/missed-renewals",
				path: "troubleshooting/missed-renewals",
				summary: "Fix the alert path before the next deadline.",
			},
			{
				title: "2FA locked out",
				slug: "troubleshooting/2fa-lockout",
				path: "troubleshooting/2fa-lockout",
				summary: "Recover access without weakening security.",
			},
			{
				title: "Demo vs production differences",
				slug: "troubleshooting/demo-vs-production",
				path: "troubleshooting/demo-vs-production",
				summary: "Why the sandbox behaves differently.",
			},
		],
	},
];

export function flattenDocsNav() {
	return DOCS_NAV.flatMap((group) =>
		group.items.map((item) => ({
			...item,
			section: group.id,
			sectionTitle: group.title,
		})),
	);
}

export function getDocsNavItem(slug: string) {
	return flattenDocsNav().find((item) => item.slug === slug) ?? null;
}
