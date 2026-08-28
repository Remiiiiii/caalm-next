/**
 * Seed catalog for the CLM Completion Roadmap (Sections 0–15).
 *
 * Order is dependency-safe: later PRs build on earlier ones so they do not
 * land in unsplit god-files, unauthz routes, or mock-backed surfaces.
 *
 * 0 engine → 1 authz → 2 kill mocks → 3 split debt → 4 limits →
 * 5 templates → 6 CRM origin → 7 author → 8 approve → 9 sign →
 * 10 obligations → 11 APIs/webhooks → 12 SSO → 13 portability →
 * 14 ops → 15 packaging
 */

import type { RoadmapCatalogSection } from "./types";

function t(
	taskCode: string,
	title: string,
	description: string,
	acceptanceCriteria: string[],
	children?: RoadmapCatalogSection["tasks"][number]["children"],
	linkedPrNumber?: number,
): RoadmapCatalogSection["tasks"][number] {
	return {
		taskCode,
		title,
		description,
		acceptanceCriteria,
		testSuiteRef: `tests/roadmap/${taskCode.replace(/\./g, "-")}.test.ts`,
		children,
		linkedPrNumber,
	};
}

export const ROADMAP_CATALOG: RoadmapCatalogSection[] = [
	{
		sectionNumber: 0,
		title: "Roadmap Engine",
		sourceRef: "Section 0 — Plan Engine prerequisite",
		linkedPrNumbers: [49],
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
				[
					"Task detail view shows live PR status (open/merged/closed) from GitHub API",
				],
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
		linkedPrNumbers: [52, 54, 56, 59],
		tasks: [
			t(
				"1.1",
				"Eliminate 2FA cookie-as-session",
				"Require real Appwrite session verification as the sole trusted identity path.",
				[
					"Auth integration tests confirm session cannot be forged via cookie manipulation",
				],
				undefined,
				52,
			),
			t(
				"1.2",
				"Remove 2FA test-mode bypass",
				"Delete or hard-gate unknown-user bypass behind a non-prod-only flag.",
				["Bypass path unreachable when NODE_ENV=production"],
				undefined,
				54,
			),
			t(
				"1.3",
				"Authz on /api/contracts/dismiss",
				"Require authenticated permission-checked caller; dismiss must update contract status.",
				[
					"Unauthenticated/unauthorized calls return 401/403",
					"Authorized dismiss transitions contract status",
				],
				undefined,
				56,
			),
			t(
				"1.4",
				"Close authz gaps on AI routes",
				"Gate extract-data, contract-analysis, ai-analyze (and license equivalents).",
				["Every listed route has positive + negative authz tests"],
				undefined,
				59,
			),
			t(
				"1.5",
				"Fix multi-tenant data bleed",
				"Add orgId filtering to all_org list scope so VIEW_ALL cannot cross tenants.",
				["VIEW_ALL for Org A never returns Org B rows"],
				undefined,
				56,
			),
			t(
				"1.6",
				"Session-audit on revoke/reset",
				"Capture session revoke and password/2FA reset in the audit log.",
				["Revoke/reset actions produce verifiable audit events"],
				undefined,
				59,
			),
		],
	},
	{
		sectionNumber: 2,
		title: "Audit, Compliance Evidence & Theater Removal",
		sourceRef: "Incomplete/fragile #1, #8–10; Quick wins #1, #5, #6",
		linkedPrNumbers: [53],
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
				[
					"Nav inventory confirms no placeholder linked while feature incomplete",
				],
			),
			t(
				"2.7",
				"Remove/gate debug routes and dead Quick Actions",
				"No dead/debug routes reachable in production build.",
				[
					"Route inventory test confirms production build has no dead/debug surfaces",
				],
			),
		],
	},
	{
		sectionNumber: 3,
		title: "Scalability & Technical Debt Remediation",
		sourceRef: "Scalability; Incomplete #14",
		linkedPrNumbers: [51, 55, 57, 58, 60],
		tasks: [
			// No GitHub PR yet. These stay incomplete until a PR whose title
			// includes the task code (e.g. "3.1") or whose branch is
			// clm/3-3.1-* merges. Do not leave them unlinked forever: a
			// per-task section cannot finish while any task has no PR path.
			t(
				"3.1",
				"Extract calendar helpers and OverflowDialog",
				"Pull shared calendar helpers and OverflowDialog out of OutlookStyleCalendar.",
				["Regression suite passes with no behavior change"],
				undefined,
				51,
			),
			t(
				"3.2",
				"Extract MonthView, EventReviewDialog, DeleteEventDialog",
				"Split month view and event review/delete dialogs into composable modules.",
				["Regression suite passes with no behavior change"],
				undefined,
				55,
			),
			t(
				"3.3",
				"Extract ShareEventDialog",
				"Move ShareEventDialog into its own module with unit tests.",
				["Regression suite passes with no behavior change"],
				undefined,
				57,
			),
			t(
				"3.4",
				"Extract ConflictDialog",
				"Move ConflictDialog into its own module with unit tests.",
				["Regression suite passes with no behavior change"],
				undefined,
				58,
			),
			t(
				"3.5",
				"Extract ApprovalReviewDialog",
				"Move ApprovalReviewDialog into its own module with unit tests.",
				["Regression suite passes with no behavior change"],
				undefined,
				60,
			),
		],
	},
	{
		sectionNumber: 4,
		title: "Monetization Enforcement",
		sourceRef: "Business readiness; Quick win #7",
		linkedPrNumbers: [50],
		tasks: [
			t(
				"4.1",
				"Enforce maxUsers",
				"Block over-limit invites with upgrade prompt.",
				["Org at tier limit rejects next invite with actionable error"],
			),
			t("4.2", "Enforce maxContracts", "Block over-limit contract create.", [
				"Org at tier limit rejects next contract create",
			]),
			t(
				"4.3",
				"Enforce storage limits at upload",
				"Reject uploads that exceed tier storage.",
				["Over-limit upload rejected with actionable error"],
			),
			t(
				"4.4",
				"Usage metering scaffolding",
				"Event counters per org via internal usage API.",
				["Metering counters increment on each billable action"],
			),
		],
	},
	{
		sectionNumber: 5,
		title: "Clause Library, Templates & AI Playbooks",
		sourceRef: "AI-assisted review; Strategic #4",
		linkedPrNumbers: [67, 68, 69, 70],
		// PR #63 was a tracking stub merged by accident. Real 5.1 work is PR #67.
		// 68–70 are draft tracking PRs (not 61/62/64: those belong to sections 9/7/6).
		tasks: [
			t(
				"5.1",
				"Clause library data model",
				"Org-owned standard clauses, categorized, versioned.",
				["CRUD on clause library with versioning"],
				undefined,
				67,
			),
			t(
				"5.2",
				"Contract templates",
				"Templates referencing clause library entries.",
				["Template from clause library produces a valid draft"],
				undefined,
				68,
			),
			t(
				"5.3",
				"Playbook deviation scoring",
				"Gemini compares extracted clauses to standards.",
				["Off-standard clause flagged; matching standard passes"],
				undefined,
				69,
			),
			t(
				"5.4",
				"Surface deviations in review UI",
				"Severity flags in contract review.",
				["Review UI shows severity for seeded deviations"],
				undefined,
				70,
			),
		],
	},
	{
		sectionNumber: 6,
		title: "CRM/ERP Origin Integrations",
		sourceRef: "Integrations row; Strategic #3",
		linkedPrNumbers: [64],
		tasks: [
			t(
				"6.1",
				"Salesforce connector",
				"Opportunity → contract draft trigger.",
				["Sandbox opportunity stage creates populated draft"],
			),
			t("6.2", "HubSpot connector", "Second CRM option for origination.", [
				"HubSpot deal stage creates populated draft",
			]),
			t(
				"6.3",
				"Configurable field mapping",
				"CRM fields → CAALM metadata per org.",
				["Mapped fields land on draft metadata correctly"],
			),
		],
	},
	{
		sectionNumber: 7,
		title: "Negotiation & Authoring Workspace",
		sourceRef: "CLM lifecycle — Drafting/Negotiation; Strategic #2",
		linkedPrNumbers: [62],
		tasks: [
			t(
				"7.1",
				"Build-vs-partner decision",
				"Document redline approach and rationale.",
				["Decision artifact recorded on the task"],
			),
			t("7.2", "Document versioning + diff", "Diff view between versions.", [
				"Version diff renders correctly for two seeded versions",
			]),
			t("7.3", "Inline commenting/redlining", "On a contract draft.", [
				"Comment/redline round-trip persists on draft",
			]),
			t("7.4", "Counterparty access", "Scoped external view/comment link.", [
				"External link allows comment without full tenant access",
			]),
			t(
				"7.5",
				"Wire lifecycleStatus negotiation",
				"Gate real negotiation activity.",
				["Status transitions only when negotiation is resolved"],
			),
		],
	},
	{
		sectionNumber: 8,
		title: "Configurable Approval Workflows",
		sourceRef: "CLM lifecycle — Approval; Mid-term #3",
		linkedPrNumbers: [34],
		tasks: [
			t(
				"8.1",
				"Extract approval config schema",
				"Steps, roles, thresholds, SoD without breaking defaults.",
				["Default workflow behaves identically after refactor"],
			),
			t(
				"8.2",
				"Admin UI for approval templates",
				"By department and/or dollar threshold.",
				["Admin can define and save a custom template"],
			),
			t(
				"8.3",
				"Apply template at create",
				"Correct template based on org config.",
				["Custom threshold routing honored end-to-end"],
			),
			t(
				"8.4",
				"Preserve SoD in configurable model",
				"Separation of duties still enforced.",
				["SoD violation attempts are still blocked"],
			),
		],
	},
	{
		sectionNumber: 9,
		title: "Execution: Real E-Signature",
		sourceRef: "Incomplete #2; Mid-term #1",
		linkedPrNumbers: [61],
		tasks: [
			t(
				"9.1",
				"Integrate e-signature provider",
				"Real DocuSign or Dropbox Sign SDK usage.",
				["SDK path replaces dropdown-label placeholders"],
			),
			t(
				"9.2",
				"Send-for-signature flow",
				"From an approved contract/license.",
				["Approved document can be sent for signature in sandbox mode"],
			),
			t(
				"9.3",
				"Signature status webhooks",
				"sent/viewed/signed/declined listener.",
				["Webhook updates envelope status for each lifecycle event"],
			),
			t(
				"9.4",
				"Activate on fully-signed",
				"Webhook transitions status to activated.",
				[
					"Fully-signed webhook flips contract/license to activated with audit event",
				],
			),
			t(
				"9.5",
				"Distinguish acknowledgment vs execution",
				"Rename/scope canvas dismiss signature so it is never confused with legal execution.",
				["UI and APIs clearly separate acknowledgment from e-sign execution"],
			),
		],
	},
	{
		sectionNumber: 10,
		title: "Obligation Management System",
		sourceRef: "CLM lifecycle — Obligation tracking; Mid-term #2",
		linkedPrNumbers: [20, 27, 32],
		tasks: [
			t(
				"10.1",
				"Obligations entity",
				"Structured fields: description, owner, due, status, link, reminders.",
				["CRUD works against obligations collection"],
				undefined,
				20,
			),
			t(
				"10.2",
				"Migrate keyObligations text arrays",
				"Move legacy text into structured records.",
				["Row-count and field-mapping parity with legacy text data"],
				undefined,
				27,
			),
			t(
				"10.3",
				"Obligation queue/dashboard",
				"By owner, due date, overdue flagging.",
				["Queue filters by owner and overdue correctly"],
				undefined,
				32,
			),
			t(
				"10.4",
				"Obligation reminders",
				"Wire into existing notification channels.",
				["Reminder fires at configured offset before due date"],
				undefined,
				32,
			),
			t(
				"10.5",
				"Link obligations to renewals",
				"Renewal view surfaces open/overdue obligations.",
				["Renewal view lists linked open/overdue obligations"],
				undefined,
				32,
			),
		],
	},
	{
		sectionNumber: 11,
		title: "Growth-Tier API, Webhooks & IT/HR Surface",
		sourceRef: "Integrations row; Incomplete #7",
		linkedPrNumbers: [43],
		tasks: [
			t(
				"11.1",
				"Customer REST API",
				"Contracts/licenses read + scoped write; Growth/Enterprise gated.",
				["Starter tier rejected; Growth authorized paths pass"],
			),
			t(
				"11.2",
				"Outbound webhooks",
				"Activated, approval, renewal, obligation overdue + retries.",
				["Mock receiver gets events; retry-on-failure works"],
			),
			t(
				"11.3",
				"Build or remove IT placeholder pages",
				"No Coming online stubs in sellable product.",
				[
					"Every former placeholder has feature test or is removed from routing/nav",
				],
			),
			t(
				"11.4",
				"Replace IT dashboard mock API",
				"Real monitoring/health data.",
				["IT dashboard returns non-mock payload in production paths"],
			),
		],
	},
	{
		sectionNumber: 12,
		title: "Enterprise Identity: SSO / SAML / SCIM",
		sourceRef: "Business readiness; Strategic #1",
		linkedPrNumbers: [41],
		tasks: [
			t("12.1", "SAML SSO", "At least Okta and/or Azure AD.", [
				"Test IdP login succeeds through hardened auth path",
			]),
			t("12.2", "SCIM provisioning", "Automated user lifecycle from IdP.", [
				"SCIM create/deactivate provisions/deprovisions CAALM accounts",
			]),
			t(
				"12.3",
				"SSO uses Section 1 auth path",
				"No parallel weaker auth route.",
				["SSO sessions require the hardened session verifier"],
			),
			t(
				"12.4",
				"Integrations UI reflects real SSO state",
				"Not when provisioned stubs.",
				["UI shows connected/disconnected from real IdP state"],
			),
		],
	},
	{
		sectionNumber: 13,
		title: "Data Portability & Regulatory Readiness",
		sourceRef: "GDPR/CCPA; security questionnaire",
		linkedPrNumbers: [42],
		tasks: [
			t("13.1", "Tenant data export", "Full org data, machine-readable.", [
				"Export row counts match source across org-scoped collections",
			]),
			t(
				"13.2",
				"Tenant deletion workflow",
				"Confirmation, grace period, audit trail.",
				["Data unreachable post-grace; deletion audit persists"],
			),
			t(
				"13.3",
				"Security questionnaire evidence pack",
				"Document only controls that exist in code.",
				["Evidence pack cross-references completed tasks/tests"],
			),
		],
	},
	{
		sectionNumber: 14,
		title: "Operational Readiness: SLA, Status, SOC 2",
		sourceRef: "Business readiness; Strategic #5",
		linkedPrNumbers: [33],
		tasks: [
			t(
				"14.1",
				"Public status page",
				"Real uptime monitoring, not a static claim.",
				["Status page reflects real health-check pings"],
			),
			t(
				"14.2",
				"SLA tiers + incident runbooks",
				"Match pricing claims with real IR capability.",
				["SLA doc reviewed against actual incident-response runbooks"],
			),
			t(
				"14.3",
				"SOC 2 Type II control groundwork",
				"Access reviews, change mgmt evidence, retention.",
				["SOC2 checklist cross-references completed roadmap tasks/tests"],
			),
		],
	},
	{
		sectionNumber: 15,
		title: "Positioning & Packaging Cleanup",
		sourceRef: "Mid-term #7; overall verdict",
		linkedPrNumbers: [65],
		tasks: [
			t(
				"15.1",
				"Update marketing/pricing copy",
				"Only claim features that are now real.",
				["No sold-but-not-built language remains in pricing/marketing"],
			),
			t(
				"15.2",
				"Final verification checklist automation",
				"Grep banned placeholders; hit key routes asserting non-mock responses.",
				[
					"Script greps banned patterns and asserts live routes; roadmap at 100% only when green",
				],
			),
		],
	},
];

export function getCatalogLinkedPrNumbers(sectionNumber: number): number[] {
	return (
		ROADMAP_CATALOG.find((s) => s.sectionNumber === sectionNumber)
			?.linkedPrNumbers ?? []
	);
}

/** False for tracking-stub sections so a merge does not mark the work done. */
export function sectionCompletesOnMergedCatalogPr(
	sectionNumber: number,
): boolean {
	const section = ROADMAP_CATALOG.find((s) => s.sectionNumber === sectionNumber);
	return section?.completesOnMerge !== false;
}

export function getCatalogLinkedPrNumber(
	sectionNumber: number,
): number | undefined {
	const numbers = getCatalogLinkedPrNumbers(sectionNumber);
	return numbers[numbers.length - 1];
}

/** Catalog PR bound to a task code (multi-PR sections). */
export function getCatalogTaskLinkedPrNumber(
	taskCode: string,
): number | undefined {
	for (const section of ROADMAP_CATALOG) {
		const found = findCatalogTask(section.tasks, taskCode);
		if (found?.linkedPrNumber != null) return found.linkedPrNumber;
	}
	return undefined;
}

function findCatalogTask(
	tasks: RoadmapCatalogSection["tasks"],
	taskCode: string,
): RoadmapCatalogSection["tasks"][number] | undefined {
	for (const task of tasks) {
		if (task.taskCode === taskCode) return task;
		if (task.children?.length) {
			const nested = findCatalogTask(task.children, taskCode);
			if (nested) return nested;
		}
	}
	return undefined;
}

export function catalogTasksHaveLinkedPr(
	tasks: RoadmapCatalogSection["tasks"],
): boolean {
	for (const task of tasks) {
		if (task.linkedPrNumber != null) return true;
		if (task.children?.length && catalogTasksHaveLinkedPr(task.children)) {
			return true;
		}
	}
	return false;
}

/** True when tasks complete individually as each catalog PR merges (not all-at-once). */
export function sectionUsesPerTaskPrCompletion(sectionNumber: number): boolean {
	const section = ROADMAP_CATALOG.find((s) => s.sectionNumber === sectionNumber);
	if (!section) return false;
	return catalogTasksHaveLinkedPr(section.tasks);
}

/** Task codes in the catalog that share a GitHub PR number. */
export function getCatalogTaskCodesForPr(prNumber: number): string[] {
	const codes: string[] = [];
	for (const section of ROADMAP_CATALOG) {
		const walk = (tasks: RoadmapCatalogSection["tasks"]) => {
			for (const task of tasks) {
				if (task.linkedPrNumber === prNumber) codes.push(task.taskCode);
				if (task.children?.length) walk(task.children);
			}
		};
		walk(section.tasks);
	}
	return codes;
}

/** Task codes in a section that have no catalog `linkedPrNumber`. */
export function getUnlinkedCatalogTaskCodes(sectionNumber: number): string[] {
	const section = ROADMAP_CATALOG.find((s) => s.sectionNumber === sectionNumber);
	if (!section) return [];
	const codes: string[] = [];
	const walk = (tasks: RoadmapCatalogSection["tasks"]) => {
		for (const task of tasks) {
			if (task.linkedPrNumber == null) codes.push(task.taskCode);
			if (task.children?.length) walk(task.children);
		}
	};
	walk(section.tasks);
	return codes;
}

/** Merged tracking stubs that must never auto-complete a section. */
export const ROADMAP_TRACKING_STUB_PRS = new Set([63]);

/**
 * PR number shown on a task row.
 * Catalog `linkedPrNumber` wins over a stale Appwrite value (e.g. merged stub #63).
 */
export function displayedPrNumberForTask(
	taskCode: string,
	livePrNumber: number | null | undefined,
): number | null {
	const fromCatalog = getCatalogTaskLinkedPrNumber(taskCode);
	if (fromCatalog != null) return fromCatalog;
	if (livePrNumber != null && ROADMAP_TRACKING_STUB_PRS.has(livePrNumber)) {
		return null;
	}
	if (livePrNumber != null) return livePrNumber;
	const sectionNumber = Number(taskCode.split(".")[0]);
	if (Number.isNaN(sectionNumber)) return null;
	const sectionPrs = getCatalogLinkedPrNumbers(sectionNumber);
	if (sectionPrs.length === 1 && !ROADMAP_TRACKING_STUB_PRS.has(sectionPrs[0])) {
		return sectionPrs[0];
	}
	return null;
}

export function catalogPullRequestUrl(prNumber: number): string {
	return `https://github.com/Remiiiiii/caalm-next/pull/${prNumber}`;
}

/** Exclusive catalog owner for a GitHub PR, or undefined if the PR is not listed. */
export function getSectionNumberForPr(prNumber: number): number | undefined {
	for (const section of ROADMAP_CATALOG) {
		if ((section.linkedPrNumbers ?? []).includes(prNumber)) {
			return section.sectionNumber;
		}
	}
	return undefined;
}

/** Each PR number may belong to only one section so merge/CI lookup stays unique. */
export function findDuplicateCatalogPrNumbers(): number[] {
	const seen = new Map<number, number>();
	const duplicates = new Set<number>();
	for (const section of ROADMAP_CATALOG) {
		for (const pr of section.linkedPrNumbers ?? []) {
			if (seen.has(pr)) duplicates.add(pr);
			else seen.set(pr, section.sectionNumber);
		}
	}
	return [...duplicates].sort((a, b) => a - b);
}
