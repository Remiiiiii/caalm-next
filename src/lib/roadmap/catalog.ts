/**
 * Seed catalog for the CLM Completion Roadmap (Sections 0–15).
 * Sourced from the Full CLM Buildout plan — stable taskCodes for branch/PR binding.
 */

import type { RoadmapCatalogSection } from "./types";

function t(
	taskCode: string,
	title: string,
	description: string,
	acceptanceCriteria: string[],
	children?: RoadmapCatalogSection["tasks"][number]["children"],
): RoadmapCatalogSection["tasks"][number] {
	return {
		taskCode,
		title,
		description,
		acceptanceCriteria,
		testSuiteRef: `tests/roadmap/${taskCode.replace(/\./g, "-")}.test.ts`,
		children,
	};
}

export const ROADMAP_CATALOG: RoadmapCatalogSection[] = [
	{
		sectionNumber: 0,
		title: "Roadmap Engine",
		sourceRef: "Section 0 — Plan Engine prerequisite",
		tasks: [
			t(
				"0.1",
				"Data model",
				"Create roadmap_sections, roadmap_tasks, roadmap_task_status collections with nesting support and seed all Sections/Tasks.",
				[
					"Schema supports arbitrary nesting depth for child tasks",
					"Seed loads all Sections/Tasks from the buildout plan",
				],
			),
			t(
				"0.2",
				"Locking engine",
				"Implement computeUnlocked() so tasks/sections open only when prerequisites are complete.",
				[
					"Unit tests prove a task stays locked if parent or prior section is incomplete",
					"Unlocks the instant the prerequisite flips to complete",
				],
			),
			t(
				"0.3",
				"Progress bar component",
				"Global + per-section progress bars computed live from task status counts.",
				[
					"Bar re-renders correctly with 0, partial, and 100% completion",
					"Percentage matches complete/total exactly",
				],
			),
			t(
				"0.4",
				"Checklist UI",
				"Section list → expandable task tree with read-only status indicators; locked tasks greyed with lock tooltip.",
				[
					"No click handler can set status=complete",
					"Force-complete API without verified merge returns 403",
				],
			),
			t(
				"0.5",
				"PR/branch binding",
				"When a developer starts a task, record branch name and PR URL; show live PR status.",
				["Task detail view shows live PR status (open/merged/closed) from GitHub API"],
			),
			t(
				"0.6",
				"Automated test-gate webhook",
				"CI callback stores pass/fail and posts cleared-to-merge only when tests pass on HEAD.",
				[
					"Failing suite keeps status in_review with no merge clearance",
					"Passing suite posts bot comment and unblocks merge messaging",
				],
			),
			t(
				"0.7",
				"Merge → auto-complete hook",
				"Post-merge webhook verifies commit on main, re-confirms tests green, flips complete, runs computeUnlocked().",
				[
					"E2E: open PR → tests pass → merge → task complete → next unlocks without manual DB write",
				],
			),
			t(
				"0.8",
				"Roadmap audit trail",
				"Every status transition logged (who, when, commit sha, test run id).",
				["Status history endpoint returns full trail for a task"],
			),
		],
	},
	{
		sectionNumber: 1,
		title: "Trust & Security Foundations",
		sourceRef: "Gap & Flaw → Security; Quick wins #2–4",
		tasks: [
			t(
				"1.1",
				"Eliminate 2FA cookie-as-session",
				"Require real Appwrite session verification as the sole trusted identity path.",
				["Auth integration tests confirm session cannot be forged via cookie manipulation"],
			),
			t(
				"1.2",
				"Remove 2FA test-mode bypass",
				"Delete or hard-gate unknown-user bypass behind a non-prod-only flag.",
				["Bypass path unreachable when NODE_ENV=production"],
			),
			t(
				"1.3",
				"Authz on /api/contracts/dismiss",
				"Require authenticated permission-checked caller; dismiss must update contract status.",
				[
					"Unauthenticated/unauthorized calls return 401/403",
					"Authorized dismiss transitions contract status",
				],
			),
			t(
				"1.4",
				"Close authz gaps on AI routes",
				"Gate extract-data, contract-analysis, ai-analyze (and license equivalents).",
				["Every listed route has positive + negative authz tests"],
			),
			t(
				"1.5",
				"Fix multi-tenant data bleed",
				"Add orgId filtering to all_org list scope so VIEW_ALL cannot cross tenants.",
				["VIEW_ALL for Org A never returns Org B rows"],
			),
			t(
				"1.6",
				"Session-audit on revoke/reset",
				"Capture session revoke and password/2FA reset in the audit log.",
				["Revoke/reset actions produce verifiable audit events"],
			),
		],
	},
	{
		sectionNumber: 2,
		title: "Audit, Compliance Evidence & Theater Removal",
		sourceRef: "Incomplete/fragile #1, #8–10; Quick wins #1, #5, #6",
		tasks: [
			t(
				"2.1",
				"Wire /api/audits/logs",
				"Connect Audit Logs UI filters/export to real getAuditLogs data.",
				["E2E filter returns real rows; export matches row count"],
			),
			t(
				"2.2",
				"Default USE_AUDIT_MOCK_DATA=false outside development",
				"Fail build if mock defaults true outside development; show DEMO badge if ever true.",
				["Config test fails build if flag defaults true outside development"],
			),
			t(
				"2.3",
				"Eliminate remaining mock analytics",
				"Replace or badge mockData in org charts and dashboards.",
				["Inventory test asserts each widget is live or sample-data badged"],
			),
			t(
				"2.4",
				"Fix HR dashboard",
				"Replace hardcoded metrics with real aggregation or remove from nav.",
				["HR metrics match seeded source-of-truth data"],
			),
			t(
				"2.5",
				"Fix Profile settings save",
				"Persist real profile edits; remove John Doe/TODO placeholder.",
				["Edit profile, reload, confirm persistence"],
			),
			t(
				"2.6",
				"Gate ITPlaceholderPage routes",
				"Hide Coming online stubs from primary nav until built.",
				["Nav inventory confirms no placeholder linked while feature incomplete"],
			),
			t(
				"2.7",
				"Remove/gate debug routes and dead Quick Actions",
				"No dead/debug routes reachable in production build.",
				["Route inventory test confirms production build has no dead/debug surfaces"],
			),
		],
	},
	{
		sectionNumber: 3,
		title: "Monetization Enforcement",
		sourceRef: "Business readiness; Quick win #7",
		tasks: [
			t("3.1", "Enforce maxUsers", "Block over-limit invites with upgrade prompt.", [
				"Org at tier limit rejects next invite with actionable error",
			]),
			t("3.2", "Enforce maxContracts", "Block over-limit contract create.", [
				"Org at tier limit rejects next contract create",
			]),
			t("3.3", "Enforce storage limits at upload", "Reject uploads that exceed tier storage.", [
				"Over-limit upload rejected with actionable error",
			]),
			t("3.4", "Usage metering scaffolding", "Event counters per org via internal usage API.", [
				"Metering counters increment on each billable action",
			]),
		],
	},
	{
		sectionNumber: 4,
		title: "Scalability & Technical Debt Remediation",
		sourceRef: "Scalability; Incomplete #14",
		tasks: [
			t("4.1", "Paginate expiry processor", "Replace limit(1000)-then-loop with cursor batches.", [
				"Correct at 10x expected record volume",
			]),
			t("4.2", "Fix auto-renew notification scan", "Replace limit(100) user scan with scalable targets.", [
				"Notification targeting scales without full user scan",
			]),
			t("4.3", "Split ContractUploadForm", "Composable sub-components/hooks with unit tests.", [
				"Regression suite passes with no behavior change",
			]),
			t("4.4", "Split OutlookStyleCalendar", "Composable sub-components/hooks with unit tests.", [
				"Regression suite passes with no behavior change",
			]),
		],
	},
	{
		sectionNumber: 5,
		title: "Execution: Real E-Signature",
		sourceRef: "Incomplete #2; Mid-term #1",
		tasks: [
			t("5.1", "Integrate e-signature provider", "Real DocuSign or Dropbox Sign SDK usage.", [
				"SDK path replaces dropdown-label placeholders",
			]),
			t("5.2", "Send-for-signature flow", "From an approved contract/license.", [
				"Approved document can be sent for signature in sandbox mode",
			]),
			t("5.3", "Signature status webhooks", "sent/viewed/signed/declined listener.", [
				"Webhook updates envelope status for each lifecycle event",
			]),
			t("5.4", "Activate on fully-signed", "Webhook transitions status to activated.", [
				"Fully-signed webhook flips contract/license to activated with audit event",
			]),
			t(
				"5.5",
				"Distinguish acknowledgment vs execution",
				"Rename/scope canvas dismiss signature so it is never confused with legal execution.",
				["UI and APIs clearly separate acknowledgment from e-sign execution"],
			),
		],
	},
	{
		sectionNumber: 6,
		title: "Obligation Management System",
		sourceRef: "CLM lifecycle — Obligation tracking; Mid-term #2",
		tasks: [
			t("6.1", "Obligations entity", "Structured fields: description, owner, due, status, link, reminders.", [
				"CRUD works against obligations collection",
			]),
			t("6.2", "Migrate keyObligations text arrays", "Move legacy text into structured records.", [
				"Row-count and field-mapping parity with legacy text data",
			]),
			t("6.3", "Obligation queue/dashboard", "By owner, due date, overdue flagging.", [
				"Queue filters by owner and overdue correctly",
			]),
			t("6.4", "Obligation reminders", "Wire into existing notification channels.", [
				"Reminder fires at configured offset before due date",
			]),
			t("6.5", "Link obligations to renewals", "Renewal view surfaces open/overdue obligations.", [
				"Renewal view lists linked open/overdue obligations",
			]),
		],
	},
	{
		sectionNumber: 7,
		title: "Configurable Approval Workflows",
		sourceRef: "CLM lifecycle — Approval; Mid-term #3",
		tasks: [
			t("7.1", "Extract approval config schema", "Steps, roles, thresholds, SoD without breaking defaults.", [
				"Default workflow behaves identically after refactor",
			]),
			t("7.2", "Admin UI for approval templates", "By department and/or dollar threshold.", [
				"Admin can define and save a custom template",
			]),
			t("7.3", "Apply template at create", "Correct template based on org config.", [
				"Custom threshold routing honored end-to-end",
			]),
			t("7.4", "Preserve SoD in configurable model", "Separation of duties still enforced.", [
				"SoD violation attempts are still blocked",
			]),
		],
	},
	{
		sectionNumber: 8,
		title: "Growth-Tier API, Webhooks & IT/HR Surface",
		sourceRef: "Integrations row; Incomplete #7",
		tasks: [
			t("8.1", "Customer REST API", "Contracts/licenses read + scoped write; Growth/Enterprise gated.", [
				"Starter tier rejected; Growth authorized paths pass",
			]),
			t("8.2", "Outbound webhooks", "Activated, approval, renewal, obligation overdue + retries.", [
				"Mock receiver gets events; retry-on-failure works",
			]),
			t("8.3", "Build or remove IT placeholder pages", "No Coming online stubs in sellable product.", [
				"Every former placeholder has feature test or is removed from routing/nav",
			]),
			t("8.4", "Replace IT dashboard mock API", "Real monitoring/health data.", [
				"IT dashboard returns non-mock payload in production paths",
			]),
		],
	},
	{
		sectionNumber: 9,
		title: "Negotiation & Authoring Workspace",
		sourceRef: "CLM lifecycle — Drafting/Negotiation; Strategic #2",
		tasks: [
			t("9.1", "Build-vs-partner decision", "Document redline approach and rationale.", [
				"Decision artifact recorded on the task",
			]),
			t("9.2", "Document versioning + diff", "Diff view between versions.", [
				"Version diff renders correctly for two seeded versions",
			]),
			t("9.3", "Inline commenting/redlining", "On a contract draft.", [
				"Comment/redline round-trip persists on draft",
			]),
			t("9.4", "Counterparty access", "Scoped external view/comment link.", [
				"External link allows comment without full tenant access",
			]),
			t("9.5", "Wire lifecycleStatus negotiation", "Gate real negotiation activity.", [
				"Status transitions only when negotiation is resolved",
			]),
		],
	},
	{
		sectionNumber: 10,
		title: "Clause Library, Templates & AI Playbooks",
		sourceRef: "AI-assisted review; Strategic #4",
		tasks: [
			t("10.1", "Clause library data model", "Org-owned standard clauses, categorized, versioned.", [
				"CRUD on clause library with versioning",
			]),
			t("10.2", "Contract templates", "Templates referencing clause library entries.", [
				"Template from clause library produces a valid draft",
			]),
			t("10.3", "Playbook deviation scoring", "Gemini compares extracted clauses to standards.", [
				"Off-standard clause flagged; matching standard passes",
			]),
			t("10.4", "Surface deviations in review UI", "Severity flags in contract review.", [
				"Review UI shows severity for seeded deviations",
			]),
		],
	},
	{
		sectionNumber: 11,
		title: "CRM/ERP Origin Integrations",
		sourceRef: "Integrations row; Strategic #3",
		tasks: [
			t("11.1", "Salesforce connector", "Opportunity → contract draft trigger.", [
				"Sandbox opportunity stage creates populated draft",
			]),
			t("11.2", "HubSpot connector", "Second CRM option for origination.", [
				"HubSpot deal stage creates populated draft",
			]),
			t("11.3", "Configurable field mapping", "CRM fields → CAALM metadata per org.", [
				"Mapped fields land on draft metadata correctly",
			]),
		],
	},
	{
		sectionNumber: 12,
		title: "Enterprise Identity: SSO / SAML / SCIM",
		sourceRef: "Business readiness; Strategic #1",
		tasks: [
			t("12.1", "SAML SSO", "At least Okta and/or Azure AD.", [
				"Test IdP login succeeds through hardened auth path",
			]),
			t("12.2", "SCIM provisioning", "Automated user lifecycle from IdP.", [
				"SCIM create/deactivate provisions/deprovisions CAALM accounts",
			]),
			t("12.3", "SSO uses Section 1 auth path", "No parallel weaker auth route.", [
				"SSO sessions require the hardened session verifier",
			]),
			t("12.4", "Integrations UI reflects real SSO state", "Not when provisioned stubs.", [
				"UI shows connected/disconnected from real IdP state",
			]),
		],
	},
	{
		sectionNumber: 13,
		title: "Data Portability & Regulatory Readiness",
		sourceRef: "GDPR/CCPA; security questionnaire",
		tasks: [
			t("13.1", "Tenant data export", "Full org data, machine-readable.", [
				"Export row counts match source across org-scoped collections",
			]),
			t("13.2", "Tenant deletion workflow", "Confirmation, grace period, audit trail.", [
				"Data unreachable post-grace; deletion audit persists",
			]),
			t("13.3", "Security questionnaire evidence pack", "Document only controls that exist in code.", [
				"Evidence pack cross-references completed tasks/tests",
			]),
		],
	},
	{
		sectionNumber: 14,
		title: "Operational Readiness: SLA, Status, SOC 2",
		sourceRef: "Business readiness; Strategic #5",
		tasks: [
			t("14.1", "Public status page", "Real uptime monitoring, not a static claim.", [
				"Status page reflects real health-check pings",
			]),
			t("14.2", "SLA tiers + incident runbooks", "Match pricing claims with real IR capability.", [
				"SLA doc reviewed against actual incident-response runbooks",
			]),
			t("14.3", "SOC 2 Type II control groundwork", "Access reviews, change mgmt evidence, retention.", [
				"SOC2 checklist cross-references completed roadmap tasks/tests",
			]),
		],
	},
	{
		sectionNumber: 15,
		title: "Positioning & Packaging Cleanup",
		sourceRef: "Mid-term #7; overall verdict",
		tasks: [
			t("15.1", "Update marketing/pricing copy", "Only claim features that are now real.", [
				"No sold-but-not-built language remains in pricing/marketing",
			]),
			t(
				"15.2",
				"Final verification checklist automation",
				"Grep banned placeholders; hit key routes asserting non-mock responses.",
				["Script greps banned patterns and asserts live routes; roadmap at 100% only when green"],
			),
		],
	},
];
