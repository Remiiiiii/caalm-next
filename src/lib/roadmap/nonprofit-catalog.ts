/**
 * Seed catalog for the Nonprofit Completion Roadmap (Sections 0–10).
 *
 * Closes the gap between what nonprofits buy (Bloomerang, Raiser's Edge NXT,
 * iWave/DonorSearch, MIP/Intacct, Better Impact) and what CAALM already is:
 * grant/contract CLM, Funding & Retention, HubSpot/Salesforce deal→draft,
 * grant templates, donorRestrictions text, internal calendar, Assistant AI.
 *
 * CAALM already keeps money that was won (grants, obligations, renewals).
 * This roadmap adds the people who give, volunteer, and attend — then ties
 * those people back to the agreements CAALM already files.
 *
 * Replacement value for a mid-size nonprofit (≥ $50k): two years of donor CRM
 * + wealth-screen add-on + volunteer software + grant-compliance staff time,
 * without leaving the CAALM tenant.
 *
 * Order is dependency-safe:
 * 0 engine → 1 constituents → 2 gifts → 3 AI scores → 4 restricted funds →
 * 5 volunteers → 6 events → 7 stewardship → 8 impact reports →
 * 9 imports/payments/export → 10 consent & packaging
 *
 * Each later PR must use the Who / What / Where / Why / When / How body
 * used by recent cursor/ pull requests, title `NPO {taskCode} {title}`,
 * and branch `npo/{section}-{taskCode}-slug`.
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
		testSuiteRef: `tests/roadmap/npo/${taskCode.replace(/\./g, "-")}.test.ts`,
		children,
		linkedPrNumber,
	};
}

const PR_BODY =
	"Follow the recent cursor/ PR body: Summary, Who, What, Where, Why, When, How, Test plan, Security notes. Title `NPO {code} {title}`. Branch `npo/{section}-{code}-slug`.";

export const NONPROFIT_ROADMAP_CATALOG: RoadmapCatalogSection[] = [
	{
		sectionNumber: 0,
		title: "Nonprofit Roadmap Engine",
		sourceRef:
			"Plan engine prerequisite — reuse CLM locking/UI; isolate catalogs so CLM Appwrite rows never mix with NPO memory seed",
		tasks: [
			t(
				"0.1",
				"Dual-catalog data model",
				`${PR_BODY} Who: IT engineers with it.view_roadmap. What: Seed NPO sections/tasks in a separate memory map with npo_ entity ids. Where: src/lib/roadmap/store.ts, nonprofit-catalog.ts. Why: Task codes 0.1 exist in both catalogs; mixing them would complete the wrong board. When: Before any NPO product PR. How: catalogKey clm|npo; CLM still uses Appwrite when ROADMAP_USE_APPWRITE=true; NPO stays memory until dedicated tables exist.`,
				[
					"NPO seed ids start with npo_ and never collide with CLM sec_/task_ ids",
					"CLM getOverview() still returns 16 CLM sections after NPO seed",
				],
			),
			t(
				"0.2",
				"Reuse locking engine",
				`${PR_BODY} Who: IT. What: computeUnlocked() walks NPO sections independently. Where: locking.ts + store persistUnlockedSnapshot(catalogKey). Why: Section 1 must stay locked until section 0 completes, same as CLM. When: On every overview load. How: Pass only that catalog's rows into computeUnlocked — never concatenate CLM+NPO.`,
				[
					"NPO section 0 is available while NPO section 1 is locked",
					"Completing a CLM task does not unlock an NPO section",
				],
			),
			t(
				"0.3",
				"IT portal board",
				`${PR_BODY} Who: IT operators. What: Nonprofit Completion Roadmap page matching CLM chrome (progress bar, task tree, PR pane). Where: /dashboard/it/development/npo-roadmap. Why: The plan has to live where engineers already track CLM work. When: Section 0 of this catalog. How: Shared RoadmapBoardPage; overview ?catalog=npo; permission it.view_roadmap (database-assigned, no Super Admin name check).`,
				[
					"IT nav lists Nonprofit Roadmap next to CLM Roadmap",
					"Unauthenticated / missing it.view_roadmap cannot load /api/roadmap/overview?catalog=npo",
				],
			),
			t(
				"0.4",
				"npo/ PR matching",
				`${PR_BODY} Who: Cursor cloud agents implementing later tasks. What: Match branches npo/{section}-{code}-* and titles starting with NPO {code}. Where: github-pr-match.ts. Why: A title of 1.1 would otherwise complete CLM Trust & Security. When: Before the first product PR. How: Catalog key on matchers; webhook resolveCatalogFromPrMatch prefers linkedPrNumbers then branch prefix.`,
				[
					"Branch npo/1-1.1-constituent maps to NPO section 1, not CLM section 1",
					"Title '1.1 Eliminate 2FA cookie-as-session' still maps only to CLM",
				],
			),
		],
	},
	{
		sectionNumber: 1,
		title: "Constituent CRM Foundation",
		sourceRef:
			"Gap: CAALM CRM origin is HubSpot/Salesforce deal→contract draft. Nonprofits need a donor/volunteer/member file (Bloomerang, Raiser's Edge NXT, CiviCRM). 54% of NPOs now pick all-in-one CRMs (Hiddema 2025).",
		tasks: [
			t(
				"1.1",
				"Constituent record model",
				`${PR_BODY} Who: Development and program staff with a new constituents.view / constituents.manage pair assigned in role_permissions. What: Org-scoped person, household, and organization records with email, phone, address, type (donor/volunteer/member/funder), and do-not-contact. Where: /constituents and Appwrite table (alphanumeric $id). Why: Without a person record, gifts, shifts, and AI scores have nowhere to live. CAALM vendors on contracts are not donors. When: First product section after the engine. How: Duplicate detection on normalized email + last name. Org filter on every query. No role-name bypass.`,
				[
					"CRUD against constituents is org-scoped; Org A never sees Org B",
					"Missing constituents.view returns 403; Super Admin string checks are absent",
				],
			),
			t(
				"1.2",
				"Households and soft-credit relationships",
				`${PR_BODY} Who: Gift officers. What: Link people into a household and record employer / spouse / solicitor relationships with soft-credit flags. Where: constituent_relationships table + constituent profile. Why: Raiser's Edge NXT treats households as the reporting unit; CAALM contracts are 1:1 counterparties. When: After 1.1. How: Directed edges with type enum; circular links rejected.`,
				[
					"Household rollup lists members; soft-credit flag persists",
					"Self-relationship and cross-org links are rejected",
				],
			),
			t(
				"1.3",
				"Interaction timeline",
				`${PR_BODY} Who: Anyone with constituents.view. What: Append-only timeline of notes, emails, meetings, and CAALM contract/grant touches on the person. Where: Constituent profile Timeline tab. Why: Unified CRM means one place for every interaction — the automation deficit in 2025 is unused CRM history, not missing fields. When: After 1.1. How: Write path constituents.manage; contract links are read-only from existing contracts.vendor / grant records.`,
				[
					"Note create appears after reload; delete is audit-logged",
					"Contract/grant links are derived, not a second copy of the agreement",
				],
			),
			t(
				"1.4",
				"Constituent list and search",
				`${PR_BODY} Who: Front-line staff. What: SearchField + filters (type, last gift, city) and PageIndex. Where: /constituents. Why: Spreadsheet exports are the current silo this section kills. When: After 1.1. How: Reuse SearchField and PageIndex; glass-card list; 3-dot menu uses dots.svg.`,
				[
					"Search matches name and email; empty state uses no-data art",
					"PageIndex hides on a single page",
				],
			),
		],
	},
	{
		sectionNumber: 2,
		title: "Gift and Campaign Ledger",
		sourceRef:
			"Fundraising/donation management is 44.74% of 2025 NPO software spend (Mordor). CAALM tracks grant awards and pursuits, not individual gifts, receipts, or campaigns.",
		tasks: [
			t(
				"2.1",
				"Gift record and receipt number",
				`${PR_BODY} Who: Gift processors with gifts.create. What: Gift rows (amount, date, method, fund, campaign, constituentId, receiptNumber, anonymous). Where: /gifts and gifts table. Why: IRS substantiation needs a receipt; Funding & Retention is for award-level dollars, not $50 online gifts. When: After constituents exist. How: Immutable amount after posted status; void is a reversing row, not a delete.`,
				[
					"Posted gift cannot change amount; void creates a reversing gift",
					"Receipt number is unique per org",
				],
			),
			t(
				"2.2",
				"Campaigns and designations",
				`${PR_BODY} Who: Development ops. What: Campaigns (annual fund, gala, appeal) and designations that map to a restricted or unrestricted fund. Where: /campaigns. Why: Segmentation and later AI scores need campaign response history. When: With 2.1. How: Designation.fundCode is the join to section 4 funds; gifts without a designation default to unrestricted.`,
				[
					"Gift without designation lands in unrestricted fund",
					"Campaign totals equal sum of posted gifts",
				],
			),
			t(
				"2.3",
				"Recurring and pledge schedules",
				`${PR_BODY} Who: Sustainer managers. What: Monthly/annual schedules and pledge installments that spawn gift rows on due dates. Where: Gift profile + cron. Why: 2026 AI fundraising ROI is highest on recurring conversion and lapse, which need a schedule object. When: After 2.1. How: Cron uses CRON_SECRET; failures retry; no silent create if constituent is do-not-contact.`,
				[
					"Due installment creates a draft gift; do-not-contact skips create",
					"Cron route is Bearer-gated, not session-gated",
				],
			),
			t(
				"2.4",
				"Link gifts to grant contracts",
				`${PR_BODY} Who: Finance + development. What: Optional contractId on a gift when the gift is a payment on a CAALM grant agreement. Where: Gift form + contract Funding panel. Why: This is CAALM's unique join — Bloomerang does not file the grant; CAALM already does. When: After 2.1. How: contract type grant or donor-restriction fields required; org must match.`,
				[
					"Gift with contractId appears on the grant's Funding & Retention stream",
					"Cross-org contractId is rejected",
				],
			),
		],
	},
	{
		sectionNumber: 3,
		title: "AI Fundraising Intelligence",
		sourceRef:
			"AI analytics is the fastest-growing NPO module (Mordor 8.38% CAGR). Practitioners need RFM, churn, ask amounts, and explainable scores — not generic ChatGPT letters (One Hundred Nights 2026, Dataro, DonorSearch Ai, Virtuous Insights).",
		tasks: [
			t(
				"3.1",
				"RFM and lifecycle segments",
				`${PR_BODY} Who: Development officers with constituents.view. What: Recency-frequency-monetary buckets (Champion, Loyal, New, At-risk, Lapsed, Lost) computed from gifts. Where: Constituent badge + /constituents?segment=. Why: Skycrumbs 2026: segmentation is the foundation; CAALM Assistant today analyzes contracts, not donor files. When: After gifts exist. How: Deterministic rules first (no model). Nightly recompute. Store segment + computedAt.`,
				[
					"Lapsed = last posted gift older than org lapseDays (default 365)",
					"Segment badge uses CAALM colors (green Champion, orange At-risk, red Lapsed)",
				],
			),
			t(
				"3.2",
				"Churn and upgrade scores with reasons",
				`${PR_BODY} Who: Gift officers. What: 0–100 lapse risk and upgrade readiness plus a human-readable reason list. Where: Constituent Intelligence card. Why: Dataro/UnifyRM sell explainable donor-level decisions; Salesforce.org 2025 says explainability dashboards are now expected. When: After 3.1. How: Transparent weighted features (recency, streak break, gift trend, event attendance, volunteer hours). Store featureWeights JSON. Require ai.document_analysis or a new ai.fundraising key assigned in role_permissions — not a Super Admin bypass.`,
				[
					"Score card lists the top 3 features that moved the number",
					"Route 403s without the AI permission even if the user can view constituents",
				],
			),
			t(
				"3.3",
				"Suggested ask amount",
				`${PR_BODY} Who: Gift officers. What: Suggested ask = max(last gift, median of last 3) × upgrade factor, capped by optional capacityBand. Where: Intelligence card. Why: Predictive modeling in 2026 includes ask amount, not just who to call. When: After 3.2. How: Pure function with unit tests; capacityBand is staff-entered until 3.4 wealth screen.`,
				[
					"Ask is never below last posted gift unless staff overrides with a reason",
					"Zero-gift constituents have no ask (prospect path, not a $0 suggestion)",
				],
			),
			t(
				"3.4",
				"Wealth-screen import hook",
				`${PR_BODY} Who: Prospect researchers. What: Import capacity/affinity CSV from DonorSearch or iWave (external score, date, source). Where: Constituent profile Wealth panel. Why: Do not scrape wealth data; vendors already sell it. CAALM stores the result and who imported it. When: After 3.2. How: CSV columns mapped; PII stays org-scoped; audit log on import.`,
				[
					"Imported capacityBand appears on the suggested-ask cap",
					"CSV with another org's ids is rejected",
				],
			),
		],
	},
	{
		sectionNumber: 4,
		title: "Restricted-Fund Finance",
		sourceRef:
			"NPO ERP is fund accounting (ASC 958, 2 CFR 200, Form 990 worksheets) not corporate P&L (Sage Intacct, MIP, Financial Edge NXT 2026). CAALM has grant contracts, donorRestrictions text, obligations, Funding & Retention — not a fund ledger. Out of lane: payroll, full GL, 990 e-file.",
		tasks: [
			t(
				"4.1",
				"Fund dimension on grants",
				`${PR_BODY} Who: Finance with funding.manage. What: Fund records (unrestricted, temporarily restricted, permanently restricted) and a required fundId on grant contracts. Where: Funding & Retention + Settings funds. Why: donorRestrictions is free text today; auditors need a coded net-asset class. When: After gifts can post to a designation. How: Extend funding domain; do not build QuickBooks.`,
				[
					"Grant contract save requires a fundId",
					"Existing grants without a fund are flagged on the retention board, not silently defaulted",
				],
			),
			t(
				"4.2",
				"Budget vs actual for a grant",
				`${PR_BODY} Who: Grant managers. What: Budget lines (personnel, program, admin) vs posted obligations and linked gifts. Where: Grant funding panel. Why: Uniform Guidance (2 CFR 200) is budget-period tracking; CAALM obligations are to-dos, not spend. When: After 4.1. How: Actuals = sum of obligation amounts marked done + gifts with that contractId.`,
				[
					"Over-budget line shows the CAALM danger badge",
					"Waived obligations do not count as actuals",
				],
			),
			t(
				"4.3",
				"990 worksheet export",
				`${PR_BODY} Who: Finance / auditors with funding.view. What: CSV of functional expense buckets (program, management, fundraising) derived from fund + obligation categories — not an e-file. Where: Funding & Retention export. Why: Intacct/MIP sell 990 worksheets; CAALM should feed the preparer, not replace them. When: After 4.2. How: Mapping table category→990 part; unmapped rows listed so staff cannot hide spend.`,
				[
					"Export row count matches tagged obligations in range",
					"Unmapped categories appear in an exceptions sheet",
				],
			),
			t(
				"4.4",
				"Release of restriction",
				`${PR_BODY} Who: Finance. What: When a grant obligation set is complete, staff records a restriction release that moves remaining dollars to unrestricted. Where: Grant funding panel. Why: ASC 958 requires reclassification when donor restrictions are met. When: After 4.1. How: Release is an audit-logged event; cannot release more than remaining restricted balance.`,
				[
					"Release over remaining balance is rejected",
					"Audit event names actor, grant, and amount",
				],
			),
		],
	},
	{
		sectionNumber: 5,
		title: "Volunteer Programs",
		sourceRef:
			"Better Impact / Volntir 2026: shifts, hours, waivers, reminders. CAALM calendar is internal Outlook-style ops, not volunteer self-serve.",
		tasks: [
			t(
				"5.1",
				"Volunteer profile on constituent",
				`${PR_BODY} Who: Volunteer coordinators with volunteers.manage (new key, assigned in role_permissions). What: Skills, availability, emergency contact, background-check date on a constituent. Where: Constituent Volunteer tab. Why: Hours and shifts need a person from section 1, not a second user account. When: After 1.1. How: Optional; constituents can be donors only.`,
				[
					"Volunteer tab hidden without volunteers.view",
					"Background-check date is visible to coordinators, not to the public register",
				],
			),
			t(
				"5.2",
				"Shift templates and capacity",
				`${PR_BODY} Who: Coordinators. What: Recurring or one-off shifts with role, capacity, waitlist. Where: /volunteers/shifts, internally stored as calendar events with type volunteer_shift. Why: Reuse OutlookStyleCalendar storage so deadlines and volunteer time share one calendar; do not fork a second calendar product. When: After 5.1. How: Event type enum + capacity fields; companion path not added (desktop IT/ops).`,
				[
					"Shift over capacity goes to waitlist, not a second booking",
					"Calendar month view shows volunteer_shift without breaking contract events",
				],
			),
			t(
				"5.3",
				"Hour log and approval",
				`${PR_BODY} Who: Volunteers (self) and coordinators (approve). What: Clock or manual hours against a shift; coordinator approves. Where: Shift detail. Why: Grant reports and community-service letters need approved hours. When: After 5.2. How: Self-log requires the constituent login or a coordinator proxy; approvals audit-logged.`,
				[
					"Unapproved hours are excluded from hour totals",
					"Coordinator proxy log records actor ≠ volunteer",
				],
			),
			t(
				"5.4",
				"Waiver e-sign reuse",
				`${PR_BODY} Who: Coordinators. What: Attach a CAALM Execute envelope (section 9 CLM) as a volunteer waiver, distinct from contract execution. Why: Volntir's core is digital waivers; CAALM already has e-sign. When: After CLM e-sign is usable and 5.1 exists. How: Envelope purpose=acknowledgment; UI copy must say waiver, never execution.`,
				[
					"Waiver envelope cannot activate a grant contract",
					"UI labels the flow as volunteer waiver / acknowledgment",
				],
			),
		],
	},
	{
		sectionNumber: 6,
		title: "Public Events and Check-in",
		sourceRef:
			"Zeffy/Bloomerang 2026: registration, QR check-in, optional donation at checkout, CRM write-back. CAALM events are internal invites, not public ticketing.",
		tasks: [
			t(
				"6.1",
				"Event registration records",
				`${PR_BODY} Who: Event staff with events.invite. What: Registration rows (constituent or guest email, ticket type, amount, checkedInAt). Where: Calendar event detail → Registrations. Why: Internal invite RSVP is not a public register. When: After constituents. How: Guest emails create a lightweight constituent on check-in so gifts in 6.3 have a person.`,
				[
					"Capacity respects ticket type limits",
					"Guest email becomes a constituent only after check-in or payment, not on abandoned forms",
				],
			),
			t(
				"6.2",
				"QR check-in",
				`${PR_BODY} Who: Door staff. What: Tokenized QR on the registration; scanner marks checkedInAt. Where: Event check-in page (desktop). Why: Zeffy/Volntir table stakes. When: After 6.1. How: Signed token, not the constituent id in the QR; replay of used tokens rejected.`,
				[
					"Used token returns already-checked-in, not a second row",
					"QR payload does not include raw email or gift amounts",
				],
			),
			t(
				"6.3",
				"Donation-at-registration",
				`${PR_BODY} Who: Development + events. What: Optional gift posted through section 2 when the registrant adds a donation. Where: Registration form. Why: Fundraising events fail when tickets and gifts live in two systems. When: After 2.1 and 6.1. How: One transaction id shared by registration and gift; failure rolls back both.`,
				[
					"Failed payment creates neither registration nor gift",
					"Posted gift.campaignId is the event's campaign",
				],
			),
		],
	},
	{
		sectionNumber: 7,
		title: "Stewardship Automation",
		sourceRef:
			"Automation deficit (TechImplement 2025): receipts, thank-yous, and at-risk flags exist in CRMs but go unused. CAALM notifications today cover contract deadlines, not donor cadence.",
		tasks: [
			t(
				"7.1",
				"Automatic gift receipt",
				`${PR_BODY} Who: Gift processors. What: Email/PDF receipt when a gift posts, using existing notification channels. Where: Gift posted webhook. Why: Manual receipts are the #1 admin tax after data entry. When: After 2.1. How: Template with org logo; skip if anonymous or do-not-contact.`,
				[
					"Posted gift sends one receipt; retries do not duplicate",
					"Anonymous gifts never email the constituent",
				],
			),
			t(
				"7.2",
				"At-risk donor queue",
				`${PR_BODY} Who: Gift officers. What: Queue of At-risk/Lapsed constituents with last gift and suggested next action. Where: /constituents/stewardship. Why: Teams lose donors because nobody sees the list in time. When: After 3.1. How: Reuse notification center optional digest; permission constituents.view.`,
				[
					"Queue sorts by lapse risk then gift amount",
					"Marking contacted writes an interaction and drops the row until the next compute",
				],
			),
			t(
				"7.3",
				"Next-best-action on the constituent",
				`${PR_BODY} Who: Gift officers. What: One recommended action (thank, call, invite, ask) from scores + open obligations + upcoming events. Where: Intelligence card. Why: UnifyRM/Dataro win by turning scores into a task, not a chart. When: After 3.2 and 7.2. How: Rule table with tests; staff can dismiss with a reason.`,
				[
					"Dismiss stores reason and hides the action for 14 days",
					"Ask action is hidden when suggested ask is null",
				],
			),
		],
	},
	{
		sectionNumber: 8,
		title: "Impact and Board Reporting",
		sourceRef:
			"Boards and funders want impact, retention, and campaign ROI (Raiser's Edge NXT dashboards). CAALM analytics are contract/license/audit, not donor retention.",
		tasks: [
			t(
				"8.1",
				"Fundraising KPI strip",
				`${PR_BODY} Who: Executives with constituents.view. What: Glass stat cards — dollars YTD, donor count, retention %, new donors — on a Development dashboard. Where: /dashboard development view or /constituents/insights. Why: Leadership currently exports Excel. When: After gifts and segments. How: Same stat-card pattern as ExecutiveDashboard; live data, no mock flag.`,
				[
					"Cards match summed posted gifts for the org and year",
					"USE_AUDIT_MOCK_DATA cannot feed this strip",
				],
			),
			t(
				"8.2",
				"Campaign ROI view",
				`${PR_BODY} Who: Development ops. What: Dollars in vs staff-entered cost per campaign. Where: Campaign detail. Why: AI targeting is pointless if nobody sees which appeal paid back. When: After 2.2. How: Cost is manual; dollars from gifts.`,
				[
					"ROI uses posted gifts only (voids excluded)",
					"Zero-cost campaign shows em dash, not Infinity",
				],
			),
			t(
				"8.3",
				"Funder impact snapshot",
				`${PR_BODY} Who: Grant managers. What: One-pager for a grant contract: restrictions, budget vs actual, volunteer hours on the program, related gifts. Where: Contract preview / export. Why: This is the CAALM-native report funders already expect from CLM + finance + people. When: After 4.2 and 5.3. How: PDF/CSV; permission funding.view.`,
				[
					"Snapshot lists only org-scoped rows for that grant",
					"Volunteer hours include approved hours tagged to the grant's program",
				],
			),
		],
	},
	{
		sectionNumber: 9,
		title: "Imports, Payments, and Finance Export",
		sourceRef:
			"All-in-one platforms win on migration and accounting handoff (Hiddema 2025, Intacct↔NPSP). CAALM has Stripe for SaaS billing and HubSpot for deals — not donation checkout or Bloomerang import.",
		tasks: [
			t(
				"9.1",
				"Constituent and gift CSV import",
				`${PR_BODY} Who: Org admins with constituents.manage. What: Mapped CSV import with dry-run, duplicate report, and commit. Where: /constituents/import. Why: Switching from Bloomerang/Raiser's Edge is the buying moment. When: After 1.1 and 2.1. How: Dry-run writes zero rows; commit is all-or-nothing per batch; errors downloadable.`,
				[
					"Dry-run returns counts and writes nothing",
					"Duplicate emails are reported, not silently merged",
				],
			),
			t(
				"9.2",
				"Donation checkout (not SaaS billing)",
				`${PR_BODY} Who: Public donors on a hosted giving page; staff see gifts. What: Stripe Checkout in donation mode creating a posted gift. Where: /give/[orgSlug] (public, token/allowlisted). Why: Stripe today gates CAALM subscriptions; mixing donation charges into billing would corrupt revenue. When: After 2.1. How: Separate Stripe webhook path; allowlist the route; never grant entitlements from a donation.`,
				[
					"Donation webhook cannot change a CAALM billing subscription",
					"Give page is on the API allowlist with a written public reason",
				],
			),
			t(
				"9.3",
				"QuickBooks/Intacct journal export",
				`${PR_BODY} Who: Finance. What: CSV/IIF of posted gifts and restriction releases by fund. Where: Funding export. Why: CAALM will not become MIP; it must feed the ledger the nonprofit already has. When: After 4.4. How: One row per gift; fund code column; date range.`,
				[
					"Export totals match posted gifts in range",
					"Restricted vs unrestricted column is present",
				],
			),
		],
	},
	{
		sectionNumber: 10,
		title: "Consent, Privacy, and Packaging",
		sourceRef:
			"Only 14–16% of NPOs have AI governance (Salesforce.org 2025). CLM section 13 covers tenant export/delete; constituent PII and fundraising claims need their own packaging.",
		tasks: [
			t(
				"10.1",
				"Consent and communication preferences",
				`${PR_BODY} Who: Constituents (self) and staff. What: Channel consent (email, SMS, mail, phone) and lawful-basis field. Where: Constituent profile + public preference center token. Why: CAN-SPAM / GDPR / CASL; do-not-contact must actually suppress 7.1 receipts and 9.2 asks. When: Before packaging claims. How: Preference changes audit-logged; token auth for public page.`,
				[
					"Email consent false suppresses receipt and appeal sends",
					"Public token cannot list other constituents",
				],
			),
			t(
				"10.2",
				"Constituent in tenant export/delete",
				`${PR_BODY} Who: Org admins running CLM 13.1/13.2. What: Constituents, gifts, hours, and scores included in tenant export and deletion. Where: Existing portability jobs. Why: A GDPR delete that leaves donor files is a fail. When: After 1.1+. How: Extend the export manifest; deletion grace period already in CLM 13.2.`,
				[
					"Export manifest lists constituent and gift counts",
					"Post-grace delete makes constituent APIs 404 for that org",
				],
			),
			t(
				"10.3",
				"Packaging copy matches reality",
				`${PR_BODY} Who: Marketing / IT. What: Pricing and docs claim only shipped NPO features; unbuilt wealth screening stays 'import', not 'we screen wealth'. Where: docs + marketing. Why: CLM 15 already bans sold-but-not-built language. When: After each section merges. How: Checklist test greps banned phrases (wealth engine, Form 990 filing, payroll).`,
				[
					"Grep of marketing/docs has no 990 e-file or payroll claim",
					"Roadmap 100% only when this grep and live routes are green",
				],
			),
		],
	},
];
