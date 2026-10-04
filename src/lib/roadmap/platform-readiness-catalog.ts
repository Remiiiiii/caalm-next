/**
 * Platform Readiness Roadmap (Sections 0–6).
 *
 * Tracks the work from the Oct 2026 current-state assessment: workspace isolation,
 * API permission coverage, sign-in trust, honest dashboards, credible IT portal,
 * and enterprise buyer honesty — without duplicating the CLM product buildout board.
 *
 * PR convention: title `PRD {task codes} {short name}`, branch
 * `cursor/platform-readiness/{section}-{code}-*`. PR body repeats Who / What /
 * Where / Why / When / How from each task (plain English for reviewers and sales).
 */

import type { RoadmapCatalogSection } from "./types";

const PR_CONVENTION =
	"One PR per section batch when possible. Title: `PRD 1.1–1.4 Workspace data isolation`. Branch: `cursor/platform-readiness/1-1.1-org-scope`. Body: for each task, paste Who, What, Where, Why, When, How, and Done when from the board. Do not mark tasks complete until merge + green Playwright + production deploy.";

function spec(
	who: string,
	what: string,
	where: string,
	why: string,
	when: string,
	how: string,
): string {
	return `${PR_CONVENTION} Who: ${who}. What: ${what}. Where: ${where}. Why: ${why}. When: ${when}. How: ${how}.`;
}

function t(
	taskCode: string,
	title: string,
	description: string,
	acceptanceCriteria: string[],
): RoadmapCatalogSection["tasks"][number] {
	return {
		taskCode,
		title,
		description,
		acceptanceCriteria,
		testSuiteRef: `tests/roadmap/prd/${taskCode.replace(/\./g, "-")}.test.ts`,
	};
}

const SEQUENTIAL = {
	sequentialTasks: true,
	perTaskPrCompletion: true,
} as const;

export const PLATFORM_READINESS_ROADMAP_CATALOG: RoadmapCatalogSection[] = [
	{
		sectionNumber: 0,
		title: "Platform Readiness Roadmap Engine",
		sourceRef:
			"Third IT Development board — same locking, progress, and merge rules as CLM and Nonprofit; isolated catalog so task 1.1 here never completes CLM Trust & Security",
		seedComplete: true,
		tasks: [
			t(
				"0.1",
				"Third catalog in the roadmap engine",
				spec(
					"IT engineers with it.view_roadmap",
					"Add a Platform Readiness catalog beside CLM and Nonprofit with prd_ entity ids and its own seed",
					"catalog-key.ts, catalogs.ts, platform-readiness-catalog.ts, store memory map",
					"Security and honesty work needs its own timeline; mixing it into the CLM product board hides buyer-blocking issues",
					"Before any PRD product PR",
					"Catalog key prd; overview ?catalog=prd; prefix prd_ on sections and tasks; memory backend until optional Appwrite tables exist",
				),
				[
					"GET /api/roadmap/overview?catalog=prd returns seven sections without mixing CLM or NPO rows",
					"Task ids use prd_ and never collide with sec_00 or npo_sec_00",
				],
			),
			t(
				"0.2",
				"Sequential unlock for readiness work",
				spec(
					"IT and security leads",
					"Only the next incomplete PRD task stays available; later sections stay locked until the prior PR merges green",
					"locking.ts with sequentialTasks on this catalog",
					"Fixing API holes before org isolation would leave data exposed; order matches the assessment priority list",
					"On every overview load and after merge webhooks",
					"catalogUsesSequentialTasks reads true for PRD; completing CLM section 1 does not unlock PRD section 1",
				),
				[
					"After section 0 seeds complete, task 1.1 is the first available product task",
					"Section 2 tasks stay locked until section 1 tasks are complete",
				],
			),
			t(
				"0.3",
				"IT Development board page",
				spec(
					"IT operators",
					"Platform Readiness Roadmap page with the same chrome as CLM and Nonprofit (progress bar, task tree, PR pane)",
					"/dashboard/it/development/platform-readiness-roadmap",
					"Leadership asked for a dedicated plan for market-readiness gaps, not a single line on the PR log",
					"Section 0 of this catalog",
					"PlatformReadinessRoadmapPage wraps ClmRoadmapPage with overviewPath ?catalog=prd; nav link under Development",
				),
				[
					"IT Development lists Platform Readiness Roadmap next to CLM and Nonprofit",
					"Missing it.view_roadmap cannot load the PRD overview API",
				],
			),
			t(
				"0.4",
				"PRD branch and title matching",
				spec(
					"Cursor agents and human devs",
					"Match branches cursor/platform-readiness/… and titles PRD 1.1 so work completes the right board",
					"github-pr-match.ts, agent PR log filters",
					"A bare title 1.1 would complete CLM task 1.1; PRD prefix keeps catalogs separate",
					"Before the first PRD section PR",
					"resolveCatalogFromPrMatch includes prd; PR log excludes cursor/platform-readiness branches like nonprofit",
				),
				[
					"Branch cursor/platform-readiness/1-1.1-org maps to PRD section 1, not CLM",
					"Title PRD 1.1 does not unlock CLM Trust & Security",
				],
			),
		],
	},
	{
		sectionNumber: 1,
		title: "Workspace data isolation",
		sourceRef:
			"Assessment: users with view-all permissions can list contracts without an org filter — unsafe for true multi-tenant SaaS",
		...SEQUENTIAL,
		tasks: [
			t(
				"1.1",
				"Org filter on view-all contract lists",
				spec(
					"Every customer org admin and legal ops user",
					"Contract list queries always include the signed-in workspace id, even for view-all roles",
					"src/lib/rbac/data-scope.ts, contracts list APIs",
					"Without this, one tenant could see another tenant's contracts in a shared database",
					"First PRD product section — before widening sales to multi-tenant hosting",
					"Pass orgId into buildContractQueries for all_org mode; add tests with two orgs in one database",
				),
				[
					"User in Org A with view-all never sees Org B contract rows",
					"Department and own scopes still work unchanged",
				],
			),
			t(
				"1.2",
				"Org filter on licenses, files, and invites",
				spec(
					"Operations teams managing licenses and uploads",
					"List and count APIs for licenses, files, and pending invites always scope to the caller's org",
					"planLimits counters, file list routes, invitation list",
					"Billing meters and limits are wrong if counts bleed across tenants",
					"Same PR batch as 1.1 when possible",
					"Audit each listRows path for Query.equal orgId; fix any missing filter",
				),
				[
					"Cross-org read by id returns 404 or 403",
					"Usage meters match org-scoped counts only",
				],
			),
			t(
				"1.3",
				"Automated two-org regression tests",
				spec(
					"QA and CI",
					"Tests that seed two orgs and prove lists and detail APIs never cross lines",
					"tests/roadmap/prd/1-3.test.ts and api integration tests",
					"Manual checks miss regressions when new routes copy old list patterns",
					"Before marking section 1 complete",
					"Fixture org A/B users; assert list totals and forbidden cross-reads",
				),
				[
					"CI fails if all_org query drops orgId",
					"Documented in PR Done when",
				],
			),
			t(
				"1.4",
				"Sales and support isolation note",
				spec(
					"Sales and customer success",
					"A short internal note on single-tenant vs multi-tenant deployment and what this section guarantees",
					"founder/ or docs/internal if present; link from IT board section card",
					"Buyers ask about data separation in security questionnaires",
					"Same PR as 1.3 or immediately after",
					"Plain English: what is fixed in code vs what still depends on one-org-per-database hosting",
				),
				[
					"Note linked from roadmap section source or PR body",
					"No marketing claim beyond what tests prove",
				],
			),
		],
	},
	{
		sectionNumber: 2,
		title: "API permission coverage",
		sourceRef:
			"Assessment: 119 grandfathered API routes without detected permission gates — baseline must shrink, not grow",
		...SEQUENTIAL,
		tasks: [
			t(
				"2.1",
				"Protect file upload and download",
				spec(
					"Authenticated staff uploading contracts and licenses",
					"File upload, download, and share routes require the same permissions as viewing or editing the underlying record",
					"src/app/api/files/*, file.actions",
					"Files are the crown jewels; open routes are the fastest path to data loss",
					"After section 1 isolation",
					"requirePermission on each method; return 401/403 tests; remove routes from authz baseline when gated",
				),
				[
					"Anonymous and wrong-permission callers get 401 or 403",
					"Baseline entry count drops for listed file routes",
				],
			),
			t(
				"2.2",
				"Protect analytics and reporting APIs",
				spec(
					"Leaders viewing dashboards",
					"Analytics unified, calendar, department, and admin routes require analytics or contract view permissions and org scope",
					"src/app/api/analytics/*",
					"Unified route today can over-read without a permission check",
					"After 2.1",
					"Gate each route; shrink baseline; add negative tests",
				),
				[
					"/api/analytics/unified returns 403 without permission",
					"No cross-org aggregates in responses",
				],
			),
			t(
				"2.3",
				"Protect assistant and legacy AI routes",
				spec(
					"Staff using in-app assistant and AI tools",
					"Assistant chat/execute and legacy ai-analyze routes require authentication and appropriate AI or contract permissions",
					"src/app/api/assistant/*, ai-analyze, ai-contract-type-suggest",
					"Unguarded AI routes burn cost and can leak document snippets",
					"After 2.2",
					"Same requirePermission pattern as newer extract routes",
				),
				[
					"Unguarded baseline no longer lists assistant/*",
					"Positive and negative authz tests pass",
				],
			),
			t(
				"2.4",
				"Retire duplicate contract pipeline routes",
				spec(
					"Engineering",
					"Either gate or remove legacy v1 and duplicate draft/extract routes so one blessed path remains",
					"src/app/api/v1/contracts/*, contracts/drafts*, extract-data duplicates",
					"Two paths mean one stays unguarded when the other is fixed",
					"Mid section 2",
					"Inventory callers; migrate UI to gated routes; delete or gate stragglers",
				),
				[
					"Baseline shrinks for retired paths",
					"No production UI calls an unguarded duplicate",
				],
			),
			t(
				"2.5",
				"CI ratchet on the unguarded list",
				spec(
					"CI and every PR author",
					"Automated test fails if api-authz-baseline.json grows; celebrate when it shrinks",
					"tests for test:api-authz, baseline json",
					"Grandfather list was meant to ratchet down; without CI it rots",
					"End of section 2",
					"Compare baseline length in CI; document allowlist additions in PR",
				),
				[
					"PR that adds unguarded routes fails CI unless baseline intentionally updated with review",
					"Section PR documents before/after baseline count",
				],
			),
		],
	},
	{
		sectionNumber: 3,
		title: "Trustworthy sign-in and two-factor",
		sourceRef:
			"Assessment: 2FA setup routes on unguarded baseline; production session hardening still open on CLM board §1",
		...SEQUENTIAL,
		tasks: [
			t(
				"3.1",
				"Session-bound two-factor setup",
				spec(
					"Every user turning on two-factor",
					"2FA setup and verify only work for the logged-in user — no passing someone else's user id in the body",
					"src/app/api/2fa/setup, verify, status",
					"Letting callers pick a user id is account takeover bait",
					"After API coverage section",
					"getCurrentUser required; reject body userId mismatch; remove from unguarded baseline",
				),
				[
					"Unauthenticated setup returns 401",
					"Cannot enable 2FA for another user's id",
				],
			),
			t(
				"3.2",
				"Remove test-only 2FA from production",
				spec(
					"Security and IT",
					"Test and debug 2FA routes are disabled or blocked outside development",
					"2fa/test, test-totp, similar debug paths",
					"Pen testers flag open test endpoints immediately",
					"Same PR as 3.1",
					"NODE_ENV guard or delete routes; baseline entries removed",
				),
				[
					"Production build cannot reach test 2FA endpoints",
					"Development still can exercise flows locally",
				],
			),
			t(
				"3.3",
				"Audit log on session revoke",
				spec(
					"Compliance and IT admins",
					"When a session is revoked, write a clear audit event who did it and for which user",
					"auth session revoke flows, audit log writer",
					"Buyers ask who forced logout during an incident",
					"After 3.1",
					"Hook existing revoke; use same audit schema as other security events",
				),
				[
					"Revoke produces a row visible in audit log UI",
					"Event includes actor and target user",
				],
			),
			t(
				"3.4",
				"Audit log on password and 2FA reset",
				spec(
					"Compliance and IT admins",
					"Password change and 2FA reset actions appear in the audit trail",
					"user security settings APIs",
					"Pairs with session revoke for a complete security story",
					"Same section PR or follow-up",
					"Same pattern as 3.3",
				),
				[
					"Reset events show in audit filters",
					"No silent security changes",
				],
			),
		],
	},
	{
		sectionNumber: 4,
		title: "Honest dashboards and compliance views",
		sourceRef:
			"Assessment: audit mock data defaults on; analytics mix live and placeholder widgets",
		...SEQUENTIAL,
		tasks: [
			t(
				"4.1",
				"Real audit data by default in production",
				spec(
					"Compliance officers and execs",
					"Production uses live audit log data unless an admin explicitly enables demo mode",
					"src/lib/audits/mock-data.ts, env flags",
					"Mock KPIs in a sales demo are fine; mock in production erodes trust",
					"After sign-in section",
					"Default USE_AUDIT_MOCK_DATA false outside development; show DEMO badge if ever on",
				),
				[
					"Production config test fails if mock defaults true",
					"Audit log page still loads real rows",
				],
			),
			t(
				"4.2",
				"Label or replace sample analytics widgets",
				spec(
					"Dashboard users",
					"Every chart is either fed by real queries or clearly labeled Sample data",
					"analytics components, org charts",
					"Executives make decisions on numbers; fake charts are a liability",
					"After 4.1",
					"Inventory widgets; wire or badge; remove dead mock imports",
				),
				[
					"Inventory test lists each widget as live or sample",
					"No silent mock series on executive dashboards",
				],
			),
			t(
				"4.3",
				"Fix or hide the unified analytics API for customers",
				spec(
					"Internal analytics page consumers",
					"Unified analytics either respects permissions and org scope or is removed from customer navigation",
					"/api/analytics/unified, analytics page",
					"This route was flagged as over-broad in the assessment",
					"Pairs with section 2.2",
					"After gating, verify response shape; or feature-flag off until fixed",
				),
				[
					"Unified route not callable without permission",
					"UI does not call unified until green tests exist",
				],
			),
			t(
				"4.4",
				"Compliance tab honesty",
				spec(
					"Audit and compliance viewers",
					"Compliance domains that still use blended mock data show a plain notice at the top",
					"audits compliance pages, merge-live-data helpers",
					"Mixed live and mock without a label feels like bait-and-switch",
					"End of section 4",
					"Short banner: which metrics are live vs illustrative",
				),
				[
					"Banner visible when mock merge is active",
					"Live audit log section unaffected",
				],
			),
		],
	},
	{
		sectionNumber: 5,
		title: "IT portal credibility",
		sourceRef:
			"Assessment: 30 IT placeholder pages; IT dashboard API returns mock metrics",
		...SEQUENTIAL,
		tasks: [
			t(
				"5.1",
				"Replace or label the IT dashboard API",
				spec(
					"IT staff opening the IT home dashboard",
					"Show real metrics from configured sources, or an honest empty state explaining what is not wired yet",
					"/api/it/dashboard, IT dashboard page",
					"Mock CPU numbers destroy credibility during buyer IT reviews",
					"After honest analytics section",
					"Remove mock comment block; integrate one real signal or return empty with copy",
				),
				[
					"No hard-coded fake metric arrays in production path",
					"Dashboard explains missing telemetry when absent",
				],
			),
			t(
				"5.2",
				"Hide or badge placeholder IT pages",
				spec(
					"IT nav users",
					"Routes that are still ITPlaceholderPage either leave the primary nav or show Preview only",
					"it-navigation.ts, ITPlaceholderPage usages",
					"Thirty Coming soon links look like a finished ops product",
					"Same PR as 5.1 when possible",
					"Nav filter or badge; keep deep links for internal QA if needed",
				),
				[
					"Primary IT nav only lists built surfaces or preview-labeled items",
					"Placeholder count documented in PR",
				],
			),
			t(
				"5.3",
				"Storage and monitoring truth",
				spec(
					"IT reviewing storage and monitoring",
					"Storage metrics and system-health pages use live data or say Not configured",
					"/api/it/storage*, monitoring/system-health",
					"Buyers conflate IT portal with observability; honesty beats fakes",
					"End of section 5",
					"Align with 5.1 pattern",
				),
				[
					"No mock fallback without a visible label",
					"Real Appwrite or host metrics when env present",
				],
			),
		],
	},
	{
		sectionNumber: 6,
		title: "Enterprise buyer honesty",
		sourceRef:
			"Assessment: Integrations UI implies SSO/API; enterprise features belong on CLM board §11–12 but buyers need clear today vs roadmap language",
		...SEQUENTIAL,
		tasks: [
			t(
				"6.1",
				"Integrations panel matches reality",
				spec(
					"Admins on Settings → Integrations",
					"SSO, API, and webhook cards say Contact sales or Coming soon — never Connected when nothing is wired",
					"IntegrationsPanel.tsx",
					"Enterprise tier unlocks cards that still show disconnected; copy must explain next step",
					"After IT portal section",
					"Status badges tied to real connection state only; link to Platform Readiness and CLM roadmap for SSO/API",
				),
				[
					"SSO card never shows Connected without a configured IdP",
					"Enterprise upsell points to sales, not fake connect buttons",
				],
			),
			t(
				"6.2",
				"Security questionnaire starter",
				spec(
					"Sales and IT responding to vendor reviews",
					"A one-page plain English summary of auth, hosting, backups, and known gaps with dates",
					"founder/ or docs; link from Enterprise pricing FAQ",
					"Procurement stalls without a honest security doc",
					"Parallel with 6.1",
					"List what is done (RBAC, billing limits, audit log) vs in progress (PRD board sections)",
				),
				[
					"Document exists and is linked from internal roadmap section 6",
					"No claim of SOC2 until true",
				],
			),
			t(
				"6.3",
				"Handoff to CLM API and SSO sections",
				spec(
					"Product and engineering leads",
					"When PRD sections 1–5 are complete, open CLM roadmap sections 11–12 for customer API, webhooks, and SSO implementation",
					"CLM catalog §11–12, IT CLM roadmap page",
					"Product features stay on CLM board; readiness board clears blockers first",
					"After 6.2",
					"Add linkedPrNumbers or comments in CLM catalog pointing from PRD 6.3; no duplicate SSO build here",
				),
				[
					"CLM section 11 tasks reference readiness prerequisites",
					"PRD board section 6 marked complete when handoff doc merged",
				],
			),
			t(
				"6.4",
				"Buyer demo script update",
				spec(
					"Sales and solutions",
					"Demo script says what to show vs what to verbally disclaim (IT portal, analytics, enterprise integrations)",
					"sales or founder assets if present",
					"Prevents overselling during pilots",
					"End of PRD catalog",
					"Short bullet list aligned with public PRICING.md honesty",
				),
				[
					"Demo script mentions contracts+licenses strength and lists disclaimers",
					"Matches pricing cards (no SSO/API sold as included)",
				],
			),
		],
	},
];
