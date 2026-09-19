/**
 * Seed catalog for the Nonprofit Completion Roadmap (Sections 0–10).
 *
 * This is a timeline, not a mono-PR. Each product task is its own pull request.
 * Later tasks stay locked until the previous PR merges to main with green tests.
 * Nested children are extra PRs that must land before the parent milestone
 * counts as done.
 *
 * Closes the gap between what nonprofits buy (Bloomerang, Raiser's Edge NXT,
 * iWave/DonorSearch, MIP/Intacct, Better Impact) and what CAALM already is:
 * grant/contract CLM, Funding & Retention, HubSpot/Salesforce deal→draft,
 * grant templates, donorRestrictions text, internal calendar, Assistant AI.
 *
 * Replacement value for a mid-size nonprofit (≥ $50k): two years of donor CRM
 * + wealth-screen add-on + volunteer software + grant-compliance staff time,
 * without leaving the CAALM tenant.
 *
 * Out of lane: payroll, Form 990 e-file, wealth scraping, a full general ledger.
 *
 * Product PRs: title `NPO {taskCode} {title}`, branch `npo/{section}-{taskCode}-slug`.
 */

import { linkedPrNumbersForSection } from "./nonprofit/npo-pr-batches";
import type { RoadmapCatalogSection } from "./types";

const PR_CONVENTION =
	"Title `NPO {code} {title}`. Branch `npo/{section}-{code}-slug`. PR body: Summary, Who, What, Where, Why, When, How, Test plan, Security notes.";

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

const TIMELINE = {
	sequentialTasks: true,
	perTaskPrCompletion: true,
} as const;

const NONPROFIT_ROADMAP_SECTIONS: RoadmapCatalogSection[] = [
	{
		sectionNumber: 0,
		title: "Nonprofit Roadmap Engine",
		sourceRef:
			"Plan engine prerequisite — reuse CLM UI; isolate catalogs; sequential per-task unlock so product work is a timeline of PRs, not one board dump",
		sequentialTasks: true,
		seedComplete: true,
		tasks: [
			t(
				"0.1",
				"Dual-catalog data model",
				spec(
					"IT engineers with it.view_roadmap",
					"Seed NPO sections/tasks in a separate memory map with npo_ entity ids",
					"src/lib/roadmap/store.ts, catalog-key.ts, nonprofit-catalog.ts",
					"Task codes like 0.1 exist in both catalogs; mixing them would complete the wrong board",
					"Before any NPO product PR",
					"catalogKey clm|npo; CLM still uses Appwrite when ROADMAP_USE_APPWRITE=true; NPO stays memory until dedicated tables exist",
				),
				[
					"NPO seed ids start with npo_ and never collide with CLM sec_/task_ ids",
					"CLM getOverview() still returns 16 CLM sections after NPO seed",
				],
			),
			t(
				"0.2",
				"Sequential per-task lock engine",
				spec(
					"IT",
					"computeUnlocked({ sequentialTasks: true }) opens only the next incomplete task (and its next child) and keeps later sections locked",
					"locking.ts, store persistUnlockedSnapshot(catalogKey), service getOverview",
					"A mono-PR catalog would ship rushed stubs; the board must force finish-this-first industry-grade PRs",
					"On every overview load and after each merge webhook",
					"Pass sequentialTasks from catalogUsesSequentialTasks; auto-complete a parent when all children are complete; never concatenate CLM+NPO rows",
				),
				[
					"NPO section 0 seeds complete so 1.1 is the first available product task",
					"Completing a CLM task does not unlock an NPO section",
				],
			),
			t(
				"0.3",
				"IT portal board",
				spec(
					"IT operators",
					"Nonprofit Roadmap project page matching CLM chrome (progress bar, task tree, next-PR hint)",
					"/dashboard/it/development/nonprofit-roadmap",
					"The plan is a Development project next to CLM Roadmap, not a single card on the PR log",
					"Section 0 of this catalog",
					"Shared RoadmapBoardPage; overview ?catalog=npo; permission it.view_roadmap (database-assigned, no Super Admin name check). /nonprofit-roadmap redirects here",
				),
				[
					"IT Development lists Nonprofit Roadmap as its own link, separate from PR log",
					"Unauthenticated / missing it.view_roadmap cannot load /api/roadmap/overview?catalog=npo",
				],
			),
			t(
				"0.4",
				"npo/ PR matching",
				spec(
					"Cursor cloud agents implementing later tasks",
					"Match branches npo/{section}-{code}-* and titles starting with NPO {code}",
					"github-pr-match.ts",
					"A title of 1.1 would otherwise complete CLM Trust & Security",
					"Before the first product PR",
					"Catalog key on matchers; webhook resolveCatalogFromPrMatch prefers linkedPrNumbers then branch prefix; nested codes like 1.10.a match",
				),
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
		...TIMELINE,
		tasks: [
			t(
				"1.1",
				"Constituent permission keys and nav",
				spec(
					"Org admins assigning role_permissions; IT shipping the keys",
					"Add constituents.view and constituents.manage to the permissions catalog and seed Super Admin + Organization Admin in role_permissions via MCP (prod and caalm-demo)",
					"src/constants/permissions.ts, permissions-catalog, IT nav, sidebar hasNavigationPermission",
					"Every later constituent API must 403 without a real key; no Super Admin string bypass",
					"First product PR after the engine",
					"pnpm new:api-route is not enough — keys must exist in the database first. Demo RBAC seed in the same PR",
				),
				[
					"PERMISSIONS.CONSTITUENTS.VIEW and .MANAGE exist and are assigned in role_permissions for Super Admin and Organization Admin",
					"No file introduces if (role === 'Super Admin') around constituent access",
				],
			),
			t(
				"1.2",
				"Constituents table schema",
				spec(
					"Backend engineers",
					"Create the constituents table with an alphanumeric $id, human name 'constituents', orgId, type, emails/phones/address, doNotContact, and PII timestamps",
					"Appwrite (production database, then scripts/sync-demo-database-schema.mjs --apply), .env.example, appwriteConfig fallback",
					"Gifts, shifts, and scores have nowhere to live without a person row. Contract vendors are not donors",
					"After 1.1 so APIs can requirePermission",
					"Follow appwrite-collection-ids.mdc; never use table_id 'constituents'. Sync demo schema in the same PR. No production row copy",
				),
				[
					"Table $id is alphanumeric; name is constituents; demo schema matches prod columns/indexes",
					".env.example and appwriteConfig use the alphanumeric id, not the snake_case name",
				],
			),
			t(
				"1.3",
				"Org-scoped constituent APIs",
				spec(
					"Staff with constituents.view / .manage",
					"CRUD routes that always filter by the caller's organization and never return another tenant's people",
					"/api/constituents and /api/constituents/[id] via pnpm new:api-route",
					"Row-level org filter is the security boundary; UI hiding is not enough",
					"After 1.2",
					"requirePermission on every method; list uses Query.equal('orgId'); create stamps orgId server-side from session, not the body",
				),
				[
					"GET/POST/PATCH/DELETE 403 without the matching permission",
					"Org A cannot read, patch, or delete Org B's constituent by id",
				],
			),
			t(
				"1.4",
				"Duplicate detection on email and name",
				spec(
					"Gift processors creating people",
					"Normalize email + last name and return likely duplicates before insert",
					"src/lib/constituents/duplicates.ts used by POST /api/constituents",
					"Raiser's Edge NXT treats duplicate households as the #1 data-quality failure; silent inserts create split giving history",
					"After 1.3",
					"Pure function with unit tests; API returns 409 + candidate ids unless force=true with constituents.manage",
				),
				[
					"Normalized email match returns 409 with candidate ids",
					"force=true still writes an audit log naming the actor and the skipped candidate",
				],
			),
			t(
				"1.5",
				"Constituent list page",
				spec(
					"Front-line development staff",
					"SearchField + filters (type, city, do-not-contact) and PageIndex on /constituents",
					"src/app/(root)/constituents/page.tsx",
					"Spreadsheet exports are the silo this section kills",
					"After 1.3",
					"Standard page container; glass-card list; empty state uses existing no-data art; 3-dot menu uses dots.svg; desktop-first (no companion path)",
				),
				[
					"Search matches name and email; PageIndex hides on a single page",
					"Missing constituents.view cannot open the route",
				],
			),
			t(
				"1.6",
				"Constituent profile",
				spec(
					"Gift officers",
					"Profile with type, contact fields, do-not-contact, and tabs that later PRs fill (timeline, household, volunteer, intelligence)",
					"/constituents/[id]",
					"Bloomerang/RE NXT treat the person record as the hub; CAALM contracts are 1:1 counterparties",
					"After 1.5",
					"Glass cards; CAALM badges for type; do-not-contact uses the danger badge. Tabs render empty states until later sections land — do not stub fake data",
				),
				[
					"Profile 404s for another org's id",
					"Do-not-contact badge uses bg-red/10 text-red border-red/20",
				],
			),
			t(
				"1.7",
				"Households and relationship graph",
				spec(
					"Gift officers",
					"Link people into a household and record employer / spouse / solicitor edges with a soft-credit flag",
					"constituent_relationships table + Household tab",
					"Raiser's Edge NXT reports on the household; CAALM counterparties cannot express soft credit",
					"After 1.6",
					"Directed edges with a type enum; reject self-links and cross-org ids. Nested PRs keep schema and UI reviewable",
				),
				[
					"Household rollup lists members; soft-credit flag persists",
					"Self-relationship and cross-org links are rejected",
				],
				[
					t(
						"1.7.a",
						"Relationships table and APIs",
						spec(
							"Backend engineers",
							"Alphanumeric relationships table (fromId, toId, type, softCredit, orgId) plus org-scoped POST/GET/DELETE",
							"Appwrite + /api/constituents/[id]/relationships",
							"UI must not invent edges the API cannot persist",
							"First half of 1.7",
							"Sync demo schema; requirePermission constituents.manage on writes",
						),
						[
							"Circular and self edges return 400",
							"Demo table columns match prod",
						],
					),
					t(
						"1.7.b",
						"Household tab UI",
						spec(
							"Gift officers",
							"Add/remove household members and relationship types on the profile",
							"Constituent Household tab",
							"Staff will not maintain a graph they cannot see",
							"After 1.7.a",
							"CAALM dialog template for add-relationship; overflow menu dots.svg; Delete sits below DropdownMenuSeparator",
						),
						[
							"Adding a spouse shows on both profiles after reload",
							"Remove is audit-logged",
						],
					),
				],
			),
			t(
				"1.8",
				"Interaction timeline",
				spec(
					"Anyone with constituents.view",
					"Append-only notes/meetings plus read-only links to CAALM contracts/grants that mention this person",
					"Constituent Timeline tab",
					"Unified CRM means one place for every touch — the 2025 automation deficit is unused history, not missing fields",
					"After 1.6",
					"Write path constituents.manage; contract/grant rows are derived from existing vendor/funder fields, never a second copy of the agreement",
				),
				[
					"Note create appears after reload; delete is audit-logged",
					"Contract/grant links are derived, not duplicated agreement rows",
				],
			),
			t(
				"1.9",
				"Do-not-contact enforcement",
				spec(
					"Gift processors and later stewardship jobs",
					"DNC true blocks outbound email/SMS helpers and is checked by gift-receipt and appeal code",
					"src/lib/constituents/consent.ts (shared with section 10)",
					"A flag that nothing reads is theater. CAN-SPAM/CASL need an actual suppress",
					"After 1.6",
					"Export a canContact(constituent, channel) helper; later sections 7 and 9 must call it — add a grep/unit test so new senders cannot skip it",
				),
				[
					"canContact returns false for DNC regardless of channel",
					"A unit test fails if a known sender module does not import the helper",
				],
			),
			t(
				"1.10",
				"Duplicate merge wizard",
				spec(
					"Org admins with constituents.manage",
					"Pick a winner, map gifts/notes/relationships, and retire the loser as mergedIntoId",
					"/constituents/merge dialog",
					"Split records wreck RFM and receipts; Bloomerang's merge is a buying-criteria screen",
					"After 1.4, 1.7, and 1.8 so there is something to merge",
					"Preview is read-only; commit is one transaction. Nested PRs keep the dangerous write behind a reviewed preview",
				),
				[
					"Loser GET returns 301/410 with mergedIntoId",
					"Gifts and notes on the loser now list under the winner",
				],
				[
					t(
						"1.10.a",
						"Merge preview API",
						spec(
							"Org admins",
							"Dry-run payload: field diffs, gift counts, relationship counts, no writes",
							"POST /api/constituents/merge/preview",
							"Staff must see blast radius before a destructive merge",
							"First half of 1.10",
							"Same-org only; 403 without constituents.manage",
						),
						[
							"Preview writes zero rows",
							"Cross-org pair returns 404, not a diff",
						],
					),
					t(
						"1.10.b",
						"Merge commit",
						spec(
							"Org admins",
							"Apply the preview in one batch and audit-log winner/loser/actor",
							"POST /api/constituents/merge",
							"Partial merges leave orphan gifts",
							"After 1.10.a",
							"All-or-nothing; loser.mergedIntoId set; reopen of loser is forbidden",
						),
						[
							"Failed batch leaves both records unchanged",
							"Audit event names winner, loser, and actor",
						],
					),
				],
			),
			t(
				"1.11",
				"PII access audit on profiles",
				spec(
					"Compliance / IT",
					"Log profile views of email/phone/address (not list-page name search) to the existing audit pipeline",
					"GET /api/constituents/[id] + audit writer",
					"Donor files are high-risk PII; boards will ask who opened a record",
					"After 1.6",
					"Reuse audit-logs collection; do not log field values, only resource id + actor + action view_pii",
				),
				[
					"Opening a profile writes one view_pii audit row",
					"Audit row does not contain the email or phone itself",
				],
			),
		],
	},
	{
		sectionNumber: 2,
		title: "Gift and Campaign Ledger",
		sourceRef:
			"Fundraising/donation management is 44.74% of 2025 NPO software spend (Mordor). CAALM tracks grant awards and pursuits, not individual gifts, receipts, or campaigns.",
		...TIMELINE,
		tasks: [
			t(
				"2.1",
				"Gift permission keys",
				spec(
					"Org admins",
					"Add gifts.view, gifts.create, gifts.void to the catalog and seed Super Admin + Organization Admin in prod and demo",
					"permissions.ts + MCP role_permissions",
					"Voiding a posted gift is a finance action; it must not share constituents.manage",
					"First PR of the ledger",
					"Database-assigned keys only; no role-name bypass",
				),
				[
					"Three gift keys exist and are assigned in role_permissions for both admin roles",
					"gifts.void is distinct from gifts.create",
				],
			),
			t(
				"2.2",
				"Gifts table and receipt allocator",
				spec(
					"Backend engineers",
					"Gifts table (alphanumeric $id) with amount, currency, date, method, status, constituentId, campaignId, designationId, contractId, receiptNumber, anonymous, orgId",
					"Appwrite + demo schema sync + receipt sequence per org",
					"IRS substantiation needs a unique receipt; Funding & Retention is award-level, not a $50 online gift",
					"After 2.1 and constituents 1.2",
					"Receipt numbers are allocated in one place; unique index (orgId, receiptNumber)",
				),
				[
					"Receipt number is unique per org",
					"Demo schema matches prod including the unique index",
				],
			),
			t(
				"2.3",
				"Gift write APIs with posted immutability",
				spec(
					"Gift processors with gifts.create",
					"Create draft → post; posted amount/date/constituentId cannot PATCH; void is a reversing row",
					"/api/gifts",
					"Auditors reject silent edits to posted cash",
					"After 2.2",
					"Status machine draft|posted|voided; void requires gifts.void and creates a negative gift linked via voidOfId",
				),
				[
					"PATCH of a posted amount returns 409",
					"Void creates a reversing gift and leaves the original row",
				],
			),
			t(
				"2.4",
				"Gift list and detail UI",
				spec(
					"Gift processors",
					"/gifts list (SearchField, status filter, PageIndex) and detail with receipt number",
					"src/app/(root)/gifts",
					"Staff will not post gifts they cannot find",
					"After 2.3",
					"Glass cards; CAALM status badges; anonymous hides the name from users without gifts.view (already required)",
				),
				[
					"Posted/voided/draft badges use green/red/orange CAALM chips",
					"Empty state uses no-data art",
				],
			),
			t(
				"2.5",
				"Campaigns schema and UI",
				spec(
					"Development ops",
					"Campaigns (annual fund, gala, appeal) with goal, start/end, orgId",
					"/campaigns + campaigns table",
					"AI scores and ROI later need campaign response history",
					"After 2.3",
					"Alphanumeric table id; list + detail; campaign totals equal sum of posted gifts",
				),
				[
					"Campaign totals equal sum of posted gifts (voids excluded)",
					"Cross-org campaignId on a gift is rejected",
				],
			),
			t(
				"2.6",
				"Designations mapped to fund codes",
				spec(
					"Finance + development",
					"Designation rows that point at a fundCode (unrestricted default) used by section 4",
					"Gift form designation picker",
					"Restricted gifts posted to 'general' are the classic audit finding",
					"After 2.5; fund table may still be pending — store fundCode as a string until 4.1 exists, then join",
					"Gift without a designation lands in unrestricted; do not invent a GL",
				),
				[
					"Gift without designation stores unrestricted fundCode",
					"Designation label appears on the gift detail",
				],
			),
			t(
				"2.7",
				"Recurring gift schedules",
				spec(
					"Sustainer managers",
					"Monthly/annual schedule on a constituent that spawns draft gifts on due dates",
					"Gift profile + schedules table",
					"2026 AI fundraising ROI is highest on recurring conversion and lapse, which need a schedule object",
					"After 2.3",
					"Do not create a gift if canContact is false. Amount inherited from schedule, not typed each month",
				),
				[
					"Due installment creates a draft gift",
					"DNC constituent skips create and records a skip reason",
				],
			),
			t(
				"2.8",
				"Pledge installments and due-date cron",
				spec(
					"Gift processors + platform cron",
					"Pledge with installment dates; cron posts drafts when due",
					"/api/cron/npo-pledges Bearer CRON_SECRET",
					"Pledges are not gifts until cash (or a posted installment) hits; mixing them breaks receipts",
					"After 2.7",
					"Cron is Bearer-gated, not session-gated. Nested PRs keep the data model reviewable before the job runs in production",
				),
				[
					"Cron route returns 401 without CRON_SECRET",
					"Overdue installment creates at most one draft per run",
				],
				[
					t(
						"2.8.a",
						"Pledge and installment schema",
						spec(
							"Backend engineers",
							"pledges + pledge_installments tables with status, dueDate, giftId",
							"Appwrite + demo sync",
							"Cron cannot run against missing tables",
							"First half of 2.8",
							"Alphanumeric ids; unique (pledgeId, dueDate)",
						),
						[
							"Demo schema matches prod",
							"Installment cannot point at another org's pledge",
						],
					),
					t(
						"2.8.b",
						"Pledge due-date cron",
						spec(
							"Platform",
							"Cron creates draft gifts for due installments and links giftId",
							"/api/cron/npo-pledges",
							"Manual chasing does not scale",
							"After 2.8.a",
							"Idempotent on giftId already set; DNC skips",
						),
						["Second run does not duplicate a draft", "Bearer auth only"],
					),
				],
			),
			t(
				"2.9",
				"Soft credits from household relationships",
				spec(
					"Gift officers",
					"When posting a gift, optionally copy a soft-credit row to related people flagged in 1.7",
					"Gift post API + gift_soft_credits table",
					"Household reporting in RE NXT is why development officers keep two systems",
					"After 1.7 and 2.3",
					"Soft credit does not change legal receipt amount; receipt still names the hard-credit constituent",
				),
				[
					"Soft-credit rows do not alter receiptNumber totals",
					"Household report can sum hard + soft without double-counting cash",
				],
			),
			t(
				"2.10",
				"Link gifts to grant contracts",
				spec(
					"Finance + development",
					"Optional contractId on a gift when the cash is a payment on a CAALM grant agreement",
					"Gift form + contract Funding & Retention panel",
					"This is CAALM's unique join — Bloomerang does not file the grant; CAALM already does",
					"After 2.3",
					"Require grant (or donor-restriction) contract type; org must match. Nested PRs split validation from the funding-board join",
				),
				[
					"Gift with contractId appears on the grant's Funding & Retention stream",
					"Cross-org contractId is rejected",
				],
				[
					t(
						"2.10.a",
						"contractId validation on gifts",
						spec(
							"Gift processors",
							"Validate contract exists, org matches, and type is grant-capable",
							"POST/PATCH /api/gifts",
							"A free-text contract id will orphan money",
							"First half of 2.10",
							"Lookup via existing contracts service; 400 on mismatch",
						),
						["Wrong org returns 400", "Non-grant contract type returns 400"],
					),
					t(
						"2.10.b",
						"Funding board gift stream",
						spec(
							"Grant managers with funding.view",
							"Show linked posted gifts on the grant Funding & Retention panel",
							"Existing funding UI",
							"Finance already lives on that board; do not hide gifts on /gifts only",
							"After 2.10.a",
							"Read-only list; click through to gift detail. Do not duplicate the grant amount",
						),
						[
							"Panel sum of linked gifts matches the API",
							"Voided gifts are excluded from the cash total",
						],
					),
				],
			),
		],
	},
	{
		sectionNumber: 3,
		title: "AI Fundraising Intelligence",
		sourceRef:
			"AI analytics is the fastest-growing NPO module (Mordor 8.38% CAGR). Practitioners need RFM, churn, ask amounts, and explainable scores — not generic ChatGPT letters (One Hundred Nights 2026, Dataro, DonorSearch Ai, Virtuous Insights).",
		...TIMELINE,
		tasks: [
			t(
				"3.1",
				"ai.fundraising permission",
				spec(
					"Org admins",
					"Add ai.fundraising (or reuse ai.document_analysis only if that key already means 'run models on org data' — prefer a dedicated key) and seed admin roles",
					"permissions catalog + role_permissions",
					"Salesforce.org 2025: explainability and access control are expected; scores are not a free extra on constituents.view",
					"First PR of this section",
					"No Super Admin bypass; 403 tests in later score routes",
				),
				[
					"Key is assigned in the database to Super Admin and Organization Admin",
					"constituents.view alone does not imply ai.fundraising",
				],
			),
			t(
				"3.2",
				"RFM feature extraction",
				spec(
					"Backend engineers",
					"Pure functions: recency days, frequency, monetary, streak, gift trend from posted gifts",
					"src/lib/fundraising/rfm.ts",
					"Skycrumbs 2026: segmentation is the foundation; CAALM Assistant today analyzes contracts, not donor files",
					"After 2.3",
					"Deterministic, no model. Unit tests with frozen dates. Ignore voided gifts",
				),
				[
					"Voided gifts are excluded from monetary and frequency",
					"Functions are date-injectable (no Date.now() inside the scorer)",
				],
			),
			t(
				"3.3",
				"Lifecycle segment storage and nightly job",
				spec(
					"Platform cron",
					"Persist Champion/Loyal/New/At-risk/Lapsed/Lost plus computedAt; recompute nightly",
					"constituent_segments + /api/cron/npo-rfm",
					"Live SQL on every list page will time out; store the bucket",
					"After 3.2",
					"Org lapseDays default 365. Bearer CRON_SECRET. Idempotent upsert per constituent",
				),
				[
					"Lapsed = last posted gift older than org lapseDays",
					"Cron is Bearer-gated",
				],
			),
			t(
				"3.4",
				"Segment badges and list filter",
				spec(
					"Development officers with constituents.view",
					"CAALM chips on the list/profile and /constituents?segment=",
					"Constituent list + profile",
					"A score nobody sees will not change call lists",
					"After 3.3",
					"Champion green, At-risk orange, Lapsed/Lost red, New/Loyal blue. Filter uses stored segment, not a live recompute",
				),
				[
					"Badge colors match CAALM status chips",
					"Unknown segment does not crash the list",
				],
			),
			t(
				"3.5",
				"Explainable lapse-risk score",
				spec(
					"Gift officers with ai.fundraising",
					"0–100 lapse risk plus the top 3 human-readable features that moved the number",
					"src/lib/fundraising/scores.ts + Intelligence card API",
					"Dataro/UnifyRM sell explainable donor-level decisions, not a black box",
					"After 3.2",
					"Transparent weighted features (recency, streak break, gift trend, later event/volunteer signals when those sections exist). Store featureWeights JSON",
				),
				[
					"Score card lists the top 3 features with weights",
					"Route 403s without ai.fundraising even when the user can view constituents",
				],
			),
			t(
				"3.6",
				"Upgrade-readiness score",
				spec(
					"Gift officers with ai.fundraising",
					"0–100 upgrade readiness from gift trend, campaign response, and capacityBand when present",
					"Same scores module as 3.5",
					"Ask amount without upgrade readiness produces spam asks",
					"After 3.5",
					"Same explainability contract; missing signals score neutral, not zero",
				),
				[
					"Missing volunteer/event data does not zero the score",
					"Top features are returned with the number",
				],
			),
			t(
				"3.7",
				"Suggested ask amount",
				spec(
					"Gift officers",
					"Ask = max(last gift, median of last 3) × upgrade factor, capped by optional capacityBand",
					"Intelligence card",
					"Predictive modeling in 2026 includes ask amount, not just who to call",
					"After 3.6",
					"Pure function with unit tests; staff override stores a reason. Zero-gift constituents have no ask",
				),
				[
					"Ask is never below last posted gift unless staff overrides with a reason",
					"Zero-gift constituents return null ask, not $0",
				],
			),
			t(
				"3.8",
				"Intelligence card UI",
				spec(
					"Gift officers",
					"Profile card: segment, lapse, upgrade, ask, feature list",
					"Constituent Intelligence tab",
					"UnifyRM/Dataro win by putting the decision on the person, not a CSV",
					"After 3.4–3.7",
					"Glass card; hide the card without ai.fundraising; empty state if scores not yet computed",
				),
				[
					"Card hidden without ai.fundraising",
					"Uncomputed scores show an empty state, not 0",
				],
			),
			t(
				"3.9",
				"Wealth-screen CSV import",
				spec(
					"Prospect researchers with ai.fundraising",
					"Import capacity/affinity CSV from DonorSearch or iWave (external score, date, source). Do not scrape wealth data",
					"Constituent Wealth panel + /api/constituents/wealth-import",
					"Vendors already sell screens; CAALM stores the result and who imported it",
					"After 3.7 so capacityBand can cap ask",
					"Column mapping UI; PII org-scoped; audit log on import; reject ids from another org",
				),
				[
					"Imported capacityBand caps suggested ask",
					"CSV with another org's ids is rejected",
				],
			),
			t(
				"3.10",
				"Score recompute tests and docs",
				spec(
					"IT / marketing",
					"Lock the scoring contract with golden fixtures and ban packaging language that claims a 'wealth engine'",
					"tests/roadmap/npo/3-10.test.ts + docs grep",
					"CLM section 15 already bans sold-but-not-built claims; fundraising AI is the next place those claims appear",
					"After 3.9",
					"Fixtures cover void exclusion, DNC skip, explainability length ≥ 3. Docs may say 'import a screen', never 'we screen wealth'",
				),
				[
					"Golden fixtures fail the PR if weights change without updating expected reasons",
					"Grep of marketing/docs has no 'wealth engine' or 'we screen wealth'",
				],
			),
		],
	},
	{
		sectionNumber: 4,
		title: "Restricted-Fund Finance",
		sourceRef:
			"NPO ERP is fund accounting (ASC 958, 2 CFR 200, Form 990 worksheets) not corporate P&L (Sage Intacct, MIP, Financial Edge NXT 2026). CAALM has grant contracts, donorRestrictions text, obligations, Funding & Retention — not a fund ledger. Out of lane: payroll, full GL, 990 e-file.",
		...TIMELINE,
		tasks: [
			t(
				"4.1",
				"Funds table (net-asset classes)",
				spec(
					"Finance with funding.manage",
					"Fund records: unrestricted, temporarily restricted, permanently restricted, plus code and orgId",
					"Settings funds + funds table",
					"donorRestrictions is free text today; auditors need a coded net-asset class",
					"After gifts can store fundCode (2.6)",
					"Alphanumeric id; seed one unrestricted fund per org on first visit, do not silently recode existing grants yet",
				),
				[
					"Three net-asset classes are the only enum values",
					"Demo schema sync included in the PR",
				],
			),
			t(
				"4.2",
				"Require fundId on grant contracts",
				spec(
					"Grant managers",
					"New/updated grant contracts must pick a fundId; keep donorRestrictions as narrative",
					"Contract save path + Funding panel",
					"A coded fund plus narrative restriction is how Intacct/MIP treat grants",
					"After 4.1",
					"Extend funding domain; do not build QuickBooks. Validation on save, not a DB trigger only",
				),
				[
					"Grant contract save without fundId returns 400",
					"Non-grant contracts are not forced to a fundId",
				],
			),
			t(
				"4.3",
				"Flag existing grants missing a fund",
				spec(
					"Finance",
					"Retention board badge for grants with empty fundId — do not silent-default them",
					"Funding & Retention",
					"Backfill defaults hide the audit problem",
					"After 4.2",
					"CAALM warning badge; filter 'missing fund'. No auto-write",
				),
				[
					"Existing grants without a fund are flagged, not silently defaulted",
					"Filter returns only empty fundId grants for the org",
				],
			),
			t(
				"4.4",
				"Grant budget lines",
				spec(
					"Grant managers",
					"Budget lines (personnel, program, admin, other) with amounts and period",
					"Grant funding panel",
					"Uniform Guidance (2 CFR 200) is budget-period tracking; CAALM obligations are to-dos, not a budget",
					"After 4.2",
					"Alphanumeric grant_budget_lines; org-scoped; period dates required",
				),
				[
					"Line create requires a category and amount > 0",
					"Another org's grantId is rejected",
				],
			),
			t(
				"4.5",
				"Budget vs actual from obligations and gifts",
				spec(
					"Grant managers",
					"Actuals = sum of obligations marked done (not waived) + posted gifts with that contractId",
					"Funding panel calculation + UI",
					"This is the CAALM-native actual — do not import a GL",
					"After 4.4 and 2.10",
					"Nested PRs split the calculator from the over-budget badge so finance can review the formula first",
				),
				[
					"Waived obligations do not count as actuals",
					"Linked voided gifts do not count as actuals",
				],
				[
					t(
						"4.5.a",
						"Actuals calculator",
						spec(
							"Backend engineers",
							"Pure function budgetVsActual(grantId) with unit tests",
							"src/lib/funding/budget-vs-actual.ts",
							"UI must not invent a second formula",
							"First half of 4.5",
							"Inputs: budget lines, obligations, gifts. Frozen fixtures",
						),
						[
							"Fixture with a waived obligation matches expected actuals",
							"Function does not call Date.now()",
						],
					),
					t(
						"4.5.b",
						"Over-budget badge UI",
						spec(
							"Grant managers",
							"Show actual vs budget per line; over-budget uses the CAALM danger badge",
							"Grant funding panel",
							"2 CFR 200 reviews start with overruns",
							"After 4.5.a",
							"Live calculator; no mock flag",
						),
						[
							"Over-budget line shows bg-red/10 text-red border-red/20",
							"Under-budget stays green",
						],
					),
				],
			),
			t(
				"4.6",
				"990 functional-expense mapping table",
				spec(
					"Finance",
					"Map obligation/gift categories to 990 Part IX buckets (program, management, fundraising)",
					"Settings 990 map",
					"Intacct/MIP sell 990 worksheets; the map is the product, not an IRS e-file",
					"After 4.4",
					"Unmapped categories are allowed but must surface later as exceptions. Out of lane: 990 e-file",
				),
				[
					"Each mapping row is org-scoped",
					"Docs/UI copy says worksheet, never e-file",
				],
			),
			t(
				"4.7",
				"990 worksheet CSV export",
				spec(
					"Finance / auditors with funding.view",
					"CSV of functional expense buckets for a date range, plus an exceptions sheet of unmapped rows",
					"Funding & Retention export",
					"Feed the preparer; do not replace them",
					"After 4.6",
					"Row count of tagged spend in range matches the export; unmapped rows cannot be hidden",
				),
				[
					"Export row count matches tagged obligations + gifts in range",
					"Unmapped categories appear in an exceptions sheet",
				],
			),
			t(
				"4.8",
				"Restriction release event",
				spec(
					"Finance",
					"When grant work is done, record a release that moves remaining restricted dollars to unrestricted",
					"Grant funding panel + restriction_releases table",
					"ASC 958 requires reclassification when donor restrictions are met",
					"After 4.1 and 4.5",
					"Cannot release more than remaining restricted balance; audit-log actor, grant, amount",
				),
				[
					"Release over remaining balance is rejected",
					"Audit event names actor, grant, and amount",
				],
			),
			t(
				"4.9",
				"Release appears on journal export later",
				spec(
					"Finance",
					"Tag each release with fundFrom/fundTo so section 9.8 can export it; no GL posting here",
					"restriction_releases columns",
					"Without fund legs the accountant cannot book the reclass in MIP/Intacct",
					"After 4.8",
					"Columns only; the CSV lives in 9.8. Do not call QuickBooks",
				),
				[
					"Release row stores fundFrom and fundTo",
					"No third-party accounting API is called",
				],
			),
			t(
				"4.10",
				"Finance help copy and out-of-lane guards",
				spec(
					"IT / finance",
					"In-app help states CAALM is fund tracking + 990 worksheet, not payroll, not a GL, not 990 e-file",
					"Funding settings + tests/roadmap/npo/4-10.test.ts",
					"Rushed ERP claims are how NPO tools get into trouble with auditors",
					"After 4.7–4.8",
					"Grep guard for payroll, 990 e-file, general ledger posting in this feature's UI copy",
				),
				[
					"Help text names the three out-of-lane items",
					"Grep test fails if those claims appear in funding UI",
				],
			),
		],
	},
	{
		sectionNumber: 5,
		title: "Volunteer Programs",
		sourceRef:
			"Better Impact / Volntir 2026: shifts, hours, waivers, reminders. CAALM calendar is internal Outlook-style ops, not volunteer self-serve.",
		...TIMELINE,
		tasks: [
			t(
				"5.1",
				"Volunteer permission keys",
				spec(
					"Org admins",
					"volunteers.view and volunteers.manage in catalog + role_permissions (prod and demo)",
					"permissions.ts + MCP",
					"Hours are not constituent notes; they need their own key",
					"First PR of this section",
					"Database-assigned; no role bypass",
				),
				[
					"Keys assigned to Super Admin and Organization Admin",
					"constituents.view does not imply volunteers.view",
				],
			),
			t(
				"5.2",
				"Volunteer profile fields",
				spec(
					"Volunteer coordinators with volunteers.manage",
					"Skills, availability, emergency contact, background-check date on the constituent",
					"Constituent Volunteer tab",
					"Hours and shifts need the person from section 1, not a second user account",
					"After 5.1 and 1.6",
					"Optional; donors-only constituents skip the tab. Background-check date is coordinator-only, never public register",
				),
				[
					"Volunteer tab hidden without volunteers.view",
					"Background-check date is not on any public route",
				],
			),
			t(
				"5.3",
				"Shift template schema",
				spec(
					"Coordinators",
					"Shift templates: role, duration, skills required, default capacity",
					"volunteer_shift_templates table",
					"Better Impact sells templates so coordinators do not retype every Saturday",
					"After 5.2",
					"Alphanumeric id; org-scoped; demo sync",
				),
				[
					"Template CRUD 403 without volunteers.manage",
					"Demo schema matches prod",
				],
			),
			t(
				"5.4",
				"Shifts as calendar volunteer_shift events",
				spec(
					"Coordinators",
					"Create shifts stored as calendar events with type volunteer_shift plus capacity/waitlist fields",
					"/volunteers/shifts and OutlookStyleCalendar storage",
					"Reuse the existing calendar so deadlines and volunteer time share one store; do not fork a second calendar product",
					"After 5.3",
					"Extend event type enum; desktop-only (do not add a companion path). Month view must still render contract events",
				),
				[
					"Calendar month view shows volunteer_shift without breaking contract events",
					"Capacity field persists on the event",
				],
			),
			t(
				"5.5",
				"Capacity and waitlist booking",
				spec(
					"Coordinators",
					"Booking at capacity goes to waitlist, not a second confirmed seat",
					"Shift detail",
					"Overbooking is how volunteer programs lose people",
					"After 5.4",
					"Atomic increment; waitlist promotion is a coordinator action, not automatic",
				),
				[
					"Shift over capacity goes to waitlist, not a second booking",
					"Promotion of waitlist is audit-logged",
				],
			),
			t(
				"5.6",
				"Hour log and approval",
				spec(
					"Volunteers (self via coordinator proxy for now) and coordinators (approve)",
					"Manual hours against a shift; coordinator approves before totals",
					"Shift detail + volunteer_hours table",
					"Grant reports and community-service letters need approved hours",
					"After 5.4",
					"Unapproved hours excluded from totals. Self-serve volunteer login is out of lane until a later companion route is explicitly requested",
				),
				[
					"Unapproved hours are excluded from hour totals",
					"Approved hours require volunteers.manage",
				],
			),
			t(
				"5.7",
				"Coordinator proxy logging",
				spec(
					"Coordinators",
					"When staff log hours for a volunteer, store actor ≠ volunteer",
					"Hour create API",
					"Community-service fraud reviews ask who entered the time",
					"After 5.6",
					"Audit fields actorUserId, volunteerConstituentId, source=proxy",
				),
				[
					"Proxy log records actor ≠ volunteer",
					"Self-entry (if ever added) would use source=self — proxy path is explicit",
				],
			),
			t(
				"5.8",
				"Waiver e-sign reuse",
				spec(
					"Coordinators",
					"Attach a CAALM Execute envelope as a volunteer waiver (purpose=acknowledgment), distinct from contract execution",
					"Shift or profile waiver action",
					"Volntir's core is digital waivers; CAALM already has e-sign in CLM section 9",
					"After CLM e-sign is usable and 5.2 exists",
					"UI copy must say waiver / acknowledgment, never execution. Envelope cannot activate a grant contract",
				),
				[
					"Waiver envelope cannot activate a grant contract",
					"UI labels the flow as volunteer waiver / acknowledgment",
				],
			),
			t(
				"5.9",
				"Tag hours to a grant program",
				spec(
					"Grant managers + coordinators",
					"Optional program/grantId on approved hours for funder reports",
					"Hour row + 8.8 snapshot later",
					"In-kind volunteer time is how NPOs talk to funders; CAALM already has the grant file",
					"After 5.6 and 4.2",
					"Org-scoped grantId; hours without a tag still count toward volunteer totals",
				),
				[
					"Hours tagged to a grant are queryable by contractId",
					"Cross-org grantId is rejected",
				],
			),
			t(
				"5.10",
				"Volunteer hour letter export",
				spec(
					"Coordinators with volunteers.view",
					"CSV/PDF of approved hours for a constituent and date range (community-service letter)",
					"Volunteer tab export",
					"Better Impact sells this as a default; coordinators currently rebuild it in Word",
					"After 5.6",
					"Approved hours only; include shift role and dates",
				),
				["Unapproved hours are absent from the export", "Export is org-scoped"],
			),
		],
	},
	{
		sectionNumber: 6,
		title: "Public Events and Check-in",
		sourceRef:
			"Zeffy/Bloomerang 2026: registration, QR check-in, optional donation at checkout, CRM write-back. CAALM events are internal invites, not public ticketing.",
		...TIMELINE,
		tasks: [
			t(
				"6.1",
				"Registration schema and ticket types",
				spec(
					"Event staff with events.invite",
					"Registration rows: constituentId or guest email, ticket type, amount, status, checkedInAt, orgId",
					"event_registrations + ticket_types tables",
					"Internal invite RSVP is not a public register",
					"After constituents 1.2",
					"Alphanumeric ids; capacity per ticket type; demo sync",
				),
				[
					"Capacity field is required on each ticket type",
					"Demo schema matches prod",
				],
			),
			t(
				"6.2",
				"Event registrations tab",
				spec(
					"Event staff",
					"List registrations on the calendar event detail with status badges",
					"Calendar event detail → Registrations",
					"Door staff will not open a separate product",
					"After 6.1",
					"Reuse event detail; glass list; do not add a phone companion path unless product later asks",
				),
				["Tab hidden without events.invite", "Status badges use CAALM chips"],
			),
			t(
				"6.3",
				"Guest email becomes a constituent at check-in",
				spec(
					"Door staff",
					"Abandoned forms do not create people; check-in or paid registration does",
					"Registration complete / check-in path",
					"Ghost constituents wreck duplicate detection",
					"After 6.2 and 1.3",
					"Create a lightweight constituent only after check-in or successful payment, then link constituentId",
				),
				[
					"Abandoned draft registration has no constituent row",
					"Check-in without constituentId creates one and links it",
				],
			),
			t(
				"6.4",
				"Signed QR tokens and scanner",
				spec(
					"Door staff",
					"Tokenized QR on the registration; scanner marks checkedInAt. Payload is not the constituent id",
					"Check-in page (desktop) + token helper",
					"Zeffy/Volntir table stakes; leaking email in a QR is a PII bug",
					"After 6.2",
					"HMAC/signed token; nested PRs split crypto from the scanner UI",
				),
				[
					"QR payload does not include raw email or gift amounts",
					"Tampered token returns 400",
				],
				[
					t(
						"6.4.a",
						"Registration token helper",
						spec(
							"Backend engineers",
							"Sign and verify registration tokens with server secret; one-time use flag",
							"src/lib/events/registration-token.ts",
							"UI must not invent an unsigned id-in-QR",
							"First half of 6.4",
							"Unit tests for expiry, tamper, and used tokens",
						),
						[
							"Used token verify returns already-used",
							"Secret is not shipped to the client bundle",
						],
					),
					t(
						"6.4.b",
						"Desktop check-in scanner page",
						spec(
							"Door staff",
							"Camera/keyboard scanner that posts the token and shows name + ticket type",
							"/events/check-in",
							"Door lines fail if staff must hunt a list",
							"After 6.4.a",
							"Desktop-first; replay of used tokens shows already-checked-in, not a second row",
						),
						[
							"Used token returns already-checked-in, not a second row",
							"Success writes checkedInAt once",
						],
					),
				],
			),
			t(
				"6.5",
				"Ticket-type capacity enforcement",
				spec(
					"Event staff",
					"Registration create fails when that ticket type is full",
					"POST registration",
					"Over-sell is the gala nightmare",
					"After 6.1",
					"Count posted/confirmed only; waitlist optional later — this PR hard-fails at capacity",
				),
				[
					"Over-capacity create returns 409",
					"Draft abandoned rows do not consume capacity",
				],
			),
			t(
				"6.6",
				"Donation-at-registration transaction",
				spec(
					"Development + events",
					"Optional gift posted through section 2 when the registrant adds a donation; one transaction id shared by registration and gift",
					"Registration form",
					"Fundraising events fail when tickets and gifts live in two systems",
					"After 2.3 and 6.1",
					"Failure rolls back both; do not leave a gift without a registration or the reverse",
				),
				[
					"Failed payment creates neither registration nor gift",
					"Posted gift.campaignId is the event's campaign",
				],
			),
			t(
				"6.7",
				"Event campaign join",
				spec(
					"Development ops",
					"Calendar event can set campaignId so 6.6 gifts roll up",
					"Event edit dialog",
					"Gala ROI in section 8 needs this foreign key",
					"After 2.5 and 6.1",
					"Optional campaignId; org must match",
				),
				[
					"Cross-org campaignId rejected",
					"Event without campaign still allows free registration",
				],
			),
			t(
				"6.8",
				"Registration confirmation email",
				spec(
					"Registrants",
					"Email with QR (token) after confirmed registration; skip DNC/email-consent false",
					"Existing notification channel",
					"Zeffy sends this by default; staff currently forward PDFs",
					"After 6.4 and 1.9",
					"Idempotent on registration id; anonymous/DNC skip",
				),
				[
					"DNC constituent does not receive the email",
					"Retries do not send a second mail for the same registration id",
				],
			),
			t(
				"6.9",
				"No public PII on check-in success",
				spec(
					"Door staff / security",
					"Check-in success UI shows first name + ticket type only — not email, phone, or gift amount",
					"Check-in page",
					"Laptops on a door table are a shoulder-surf risk",
					"After 6.4.b",
					"API success payload must omit those fields too",
				),
				[
					"Success JSON has no email, phone, or amount",
					"UI does not render those fields",
				],
			),
			t(
				"6.10",
				"Event roster export",
				spec(
					"Event staff with events.invite",
					"CSV of confirmed registrations for the door (name, ticket, checked-in)",
					"Registrations tab export",
					"Backup when Wi-Fi dies",
					"After 6.2",
					"Org-scoped; no gift amounts on the door roster",
				),
				["CSV has no gift amount column", "Other orgs' events 404"],
			),
		],
	},
	{
		sectionNumber: 7,
		title: "Stewardship Automation",
		sourceRef:
			"Automation deficit (TechImplement 2025): receipts, thank-yous, and at-risk flags exist in CRMs but go unused. CAALM notifications today cover contract deadlines, not donor cadence.",
		...TIMELINE,
		tasks: [
			t(
				"7.1",
				"Gift receipt template",
				spec(
					"Gift processors",
					"Org-branded email/PDF receipt body: amount, date, receiptNumber, legal thank-you language",
					"Notification templates",
					"Manual receipts are the #1 admin tax after data entry",
					"After 2.3",
					"Skip if anonymous or !canContact(email). Store template in existing notification system, not a new ESP",
				),
				[
					"Anonymous gifts never email the constituent",
					"Template includes receiptNumber",
				],
			),
			t(
				"7.2",
				"Idempotent posted-gift receipt send",
				spec(
					"Platform",
					"When a gift posts, send exactly one receipt; retries do not duplicate",
					"Gift posted path / webhook",
					"Double receipts confuse donors and auditors",
					"After 7.1",
					"receiptSentAt or equivalent unique key on gift id",
				),
				[
					"Posted gift sends one receipt; retries do not duplicate",
					"Draft gifts send nothing",
				],
			),
			t(
				"7.3",
				"At-risk donor queue page",
				spec(
					"Gift officers with constituents.view",
					"Queue of At-risk/Lapsed constituents with last gift, risk, suggested next action",
					"/constituents/stewardship",
					"Teams lose donors because nobody sees the list in time",
					"After 3.4",
					"Sort by lapse risk then gift amount. Standard page container; glass list",
				),
				[
					"Queue sorts by lapse risk then gift amount",
					"Empty state when no at-risk constituents",
				],
			),
			t(
				"7.4",
				"Contacted writeback",
				spec(
					"Gift officers",
					"Mark contacted writes an interaction (1.8) and drops the row until the next RFM compute",
					"Stewardship queue action",
					"A queue you cannot dismiss is ignored",
					"After 7.3 and 1.8",
					"Reuse timeline write path; do not invent a second notes table",
				),
				[
					"Marking contacted writes an interaction",
					"Row leaves the queue until the next compute",
				],
			),
			t(
				"7.5",
				"Next-best-action rules",
				spec(
					"Gift officers",
					"One recommended action (thank, call, invite, ask) from scores + open obligations + upcoming events",
					"src/lib/fundraising/next-best-action.ts + Intelligence card",
					"UnifyRM/Dataro win by turning scores into a task, not a chart",
					"After 3.7 and 7.3",
					"Rule table with unit tests; ask hidden when suggested ask is null",
				),
				[
					"Ask action is hidden when suggested ask is null",
					"Rules are covered by fixtures, not hardcoded in the React tree",
				],
			),
			t(
				"7.6",
				"Dismiss NBA with cooldown",
				spec(
					"Gift officers",
					"Dismiss stores reason and hides the action for 14 days",
					"Intelligence card",
					"Without dismiss, officers click around the card",
					"After 7.5",
					"Persisted dismissal; 14-day window is org-overridable later — default 14 in this PR",
				),
				[
					"Dismiss stores reason and hides the action for 14 days",
					"After 14 days the action can reappear",
				],
			),
			t(
				"7.7",
				"Optional stewardship digest",
				spec(
					"Gift officers who opt in",
					"Daily/weekly digest of the at-risk queue via existing notification center",
					"Notification preferences",
					"Email floods are why automation sits unused — opt-in only",
					"After 7.3",
					"Default off; respects canContact for the staff user, not the donor",
				),
				["Default preference is off", "Digest lists only the caller's org"],
			),
			t(
				"7.8",
				"Thank-you task from posted gift",
				spec(
					"Gift officers",
					"NBA 'thank' appears for posted gifts above org thankYouThreshold with no thank interaction in 7 days",
					"NBA rules",
					"Receipt (7.1) is legal; thank-you is relationship. Both are industry standard",
					"After 7.5 and 1.8",
					"Threshold default 0 so every gift gets a thank unless staff raises it",
				),
				[
					"Gift with a thank note does not generate thank",
					"Threshold 0 includes all posted gifts",
				],
			),
			t(
				"7.9",
				"Invite action from upcoming public events",
				spec(
					"Gift officers",
					"NBA 'invite' when a Champion/Loyal has no registration on an upcoming campaign event",
					"NBA rules",
					"Events in a separate system never make this list — that is the Zeffy+CRM pain",
					"After 7.5 and 6.2",
					"Skip DNC; skip if already registered",
				),
				[
					"Registered constituent does not get invite",
					"DNC constituent does not get invite",
				],
			),
			t(
				"7.10",
				"Stewardship metrics on the queue",
				spec(
					"Development ops",
					"Counts: contacted this week, still at-risk, receipts sent",
					"Stewardship page stat cards",
					"Managers will not run a queue they cannot measure",
					"After 7.2–7.4",
					"ExecutiveDashboard stat-card pattern; live data, no mock flag",
				),
				[
					"Cards match org-scoped counts",
					"USE_AUDIT_MOCK_DATA cannot feed this strip",
				],
			),
		],
	},
	{
		sectionNumber: 8,
		title: "Impact and Board Reporting",
		sourceRef:
			"Boards and funders want impact, retention, and campaign ROI (Raiser's Edge NXT dashboards). CAALM analytics are contract/license/audit, not donor retention.",
		...TIMELINE,
		tasks: [
			t(
				"8.1",
				"Development dashboard route",
				spec(
					"Executives with constituents.view",
					"New development view that does not overload ExecutiveDashboard with donor widgets",
					"/dashboard/development or /constituents/insights",
					"Leadership currently exports Excel; dumping KPIs onto the wrong dashboard confuses contract users",
					"After 2.4 and 3.4",
					"Standard page container; permission gate; desktop-first",
				),
				[
					"Route 403 without constituents.view",
					"Page title uses h1 sidebar-gradient-text",
				],
			),
			t(
				"8.2",
				"YTD dollars stat card",
				spec(
					"Executives",
					"Posted gifts YTD for the org",
					"Development dashboard glass stat card",
					"Board packets open with dollars",
					"After 8.1",
					"Same stat-card pattern as ExecutiveDashboard; live sum",
				),
				[
					"Value matches summed posted gifts for the org and year",
					"Voids excluded",
				],
			),
			t(
				"8.3",
				"Donor count, retention, new-donor cards",
				spec(
					"Executives",
					"Unique donors YTD, retention % vs prior year, new donors",
					"Same strip as 8.2",
					"Raiser's Edge NXT dashboards lead with retention, not only cash",
					"After 8.2 and 3.3",
					"Retention = donors with a gift this year and last year / donors last year. Define new as first posted gift this year",
				),
				[
					"Formulas documented in code comments and unit-tested",
					"Zero last-year donors shows em dash, not NaN",
				],
			),
			t(
				"8.4",
				"Campaign cost field",
				spec(
					"Development ops",
					"Staff-entered cost on a campaign (mail house, ads, venue)",
					"Campaign detail",
					"AI targeting is pointless if nobody sees which appeal paid back",
					"After 2.5",
					"Manual currency field; not imported from a GL",
				),
				["Cost persists and is org-scoped", "Negative cost rejected"],
			),
			t(
				"8.5",
				"Campaign ROI view",
				spec(
					"Development ops",
					"Dollars in vs cost; voids excluded",
					"Campaign detail",
					"Boards ask 'what did the gala net'",
					"After 8.4",
					"ROI = (posted gifts - cost) / cost; zero-cost shows em dash, not Infinity",
				),
				[
					"ROI uses posted gifts only (voids excluded)",
					"Zero-cost campaign shows em dash, not Infinity",
				],
			),
			t(
				"8.6",
				"Funder snapshot composition",
				spec(
					"Grant managers with funding.view",
					"One-pager payload: restrictions, fund, budget vs actual, related gifts, tagged volunteer hours",
					"src/lib/funding/funder-snapshot.ts",
					"This is the CAALM-native report funders already expect from CLM + finance + people",
					"After 4.5, 2.10, 5.9",
					"Pure assembler with tests; PDF/CSV is the next PR",
				),
				[
					"Snapshot lists only org-scoped rows for that grant",
					"Volunteer hours include approved hours tagged to the grant",
				],
			),
			t(
				"8.7",
				"Funder snapshot PDF/CSV",
				spec(
					"Grant managers",
					"Download the 8.6 payload as CSV and a print-friendly PDF",
					"Contract preview / export",
					"Program officers still want a file",
					"After 8.6",
					"CSV first if PDF is heavy; both in this PR if print CSS is enough. Permission funding.view",
				),
				[
					"CSV columns match the assembler fields",
					"Unauthorized users cannot download another org's snapshot",
				],
			),
			t(
				"8.8",
				"Board pack export of KPIs",
				spec(
					"Executives",
					"CSV of the 8.2–8.3 cards plus top campaigns by ROI",
					"Development dashboard export",
					"Monthly board packets are the buying moment vs RE NXT",
					"After 8.3 and 8.5",
					"Live data; no mock flag; date range default YTD",
				),
				[
					"Export totals match the stat cards",
					"USE_AUDIT_MOCK_DATA cannot feed the export",
				],
			),
			t(
				"8.9",
				"Insight empty states",
				spec(
					"New tenants",
					"Dashboard empty states when there are zero gifts — icon + short message, no fake charts",
					"Development dashboard",
					"Demo-looking zeros destroy trust",
					"After 8.1",
					"Lucide icon; no emoji; copy tells staff to post a gift or import",
				),
				[
					"Zero-gift org shows empty state, not $0 sparkline",
					"No emoji in the empty state",
				],
			),
			t(
				"8.10",
				"Dashboard permission matrix tests",
				spec(
					"IT",
					"Tests that funding.view, constituents.view, and ai.fundraising each hide the right widgets",
					"tests/roadmap/npo/8-10.test.ts",
					"Boards include people who should see dollars but not wealth imports",
					"After 8.1–8.8",
					"No role-name checks; permission lists only",
				),
				[
					"ai.fundraising is not required for YTD dollars",
					"funding.view is required for funder snapshot download",
				],
			),
		],
	},
	{
		sectionNumber: 9,
		title: "Imports, Payments, and Finance Export",
		sourceRef:
			"All-in-one platforms win on migration and accounting handoff (Hiddema 2025, Intacct↔NPSP). CAALM has Stripe for SaaS billing and HubSpot for deals — not donation checkout or Bloomerang import.",
		...TIMELINE,
		tasks: [
			t(
				"9.1",
				"CSV mapper UI",
				spec(
					"Org admins with constituents.manage",
					"Upload a CSV and map columns to constituent/gift fields",
					"/constituents/import",
					"Switching from Bloomerang/Raiser's Edge is the buying moment",
					"After 1.3 and 2.3",
					"No writes in this PR — mapping preview only. Next PR dry-runs",
				),
				[
					"Unknown columns are listed, not silently dropped",
					"File never leaves the org session",
				],
			),
			t(
				"9.2",
				"Dry-run import",
				spec(
					"Org admins",
					"Dry-run returns create/update/duplicate counts and writes nothing",
					"POST /api/constituents/import?dryRun=1",
					"A commit without a dry-run is how orgs duplicate their whole database",
					"After 9.1 and 1.4",
					"Uses duplicate detection from 1.4; errors downloadable as CSV",
				),
				[
					"Dry-run returns counts and writes nothing",
					"Duplicate emails are reported, not silently merged",
				],
			),
			t(
				"9.3",
				"Commit import batch",
				spec(
					"Org admins",
					"All-or-nothing commit of a dry-run batch id",
					"POST /api/constituents/import/commit",
					"Partial commits leave unmatched gifts",
					"After 9.2",
					"Batch expires; replay of a committed batch is a no-op",
				),
				[
					"Failed batch writes zero rows",
					"Replay of a committed batch id does not duplicate",
				],
			),
			t(
				"9.4",
				"Public give page allowlist",
				spec(
					"Security + development",
					"Add /give/[orgSlug] to the public API allowlist with a written public reason; page itself may 501 until 9.5",
					"API allowlist + route stub",
					"Donation checkout must never share SaaS billing middleware",
					"Before Stripe donation work",
					"Allowlist comment states 'public donation checkout, not entitlements'. Nested with 9.5 so security review can land first if needed — this task is the allowlist PR",
				),
				[
					"Give page is on the API allowlist with a written public reason",
					"Route does not grant CAALM entitlements",
				],
			),
			t(
				"9.5",
				"Stripe donation Checkout",
				spec(
					"Public donors; staff see gifts",
					"Stripe Checkout in donation mode creating a posted gift on success",
					"/give/[orgSlug] + donation webhook path",
					"Stripe today gates CAALM subscriptions; mixing donation charges into billing would corrupt revenue",
					"After 9.4 and 2.3",
					"Separate webhook path from billing; never grant entitlements from a donation. Nested PRs if Checkout session and webhook must split",
				),
				[
					"Donation webhook cannot change a CAALM billing subscription",
					"Successful payment creates a posted gift for the org",
				],
				[
					t(
						"9.5.a",
						"Donation Checkout session",
						spec(
							"Public donors",
							"Create a Checkout session in donation/payment mode with metadata orgId + campaignId",
							"/api/give/checkout",
							"Wrong mode would create subscriptions",
							"First half of 9.5",
							"mode=payment; metadata cannot include entitlements",
						),
						[
							"Session mode is payment, not subscription",
							"Missing orgSlug returns 404",
						],
					),
					t(
						"9.5.b",
						"Donation webhook isolation",
						spec(
							"Platform",
							"Webhook handler on a distinct path that only posts gifts",
							"/api/webhooks/stripe-donations",
							"Billing webhooks must not see donation events as invoices",
							"After 9.5.a",
							"Signature verify; ignore events without donation metadata",
						),
						[
							"Billing subscription handler is not invoked",
							"Idempotent on Stripe event id",
						],
					),
				],
			),
			t(
				"9.6",
				"Give page UI",
				spec(
					"Public donors",
					"Hosted amount + optional designation + Stripe redirect; org branding",
					"/give/[orgSlug]",
					"Zeffy/Bloomerang set the bar for a simple give form",
					"After 9.5.a",
					"Public marketing-style page may be responsive (desktop-first rule excludes public marketing). DNC does not apply to a self-serve gift",
				),
				[
					"Page loads without an app session",
					"Amount < minimum returns a field error",
				],
			),
			t(
				"9.7",
				"Journal export CSV/IIF",
				spec(
					"Finance with funding.view",
					"CSV/IIF of posted gifts and restriction releases by fund and date range",
					"Funding export",
					"CAALM will not become MIP; it must feed the ledger the nonprofit already has",
					"After 4.8 and 2.3",
					"One row per gift; fund code column; date range required",
				),
				[
					"Export totals match posted gifts in range",
					"Restricted vs unrestricted column is present",
				],
			),
			t(
				"9.8",
				"Release rows on the journal export",
				spec(
					"Finance",
					"Include 4.8 restriction releases as reclass rows (fundFrom → fundTo)",
					"Same export as 9.7",
					"Without reclass rows the accountant books cash and misses ASC 958",
					"After 9.7 and 4.9",
					"Reclass rows signed so totals still match cash gifts",
				),
				[
					"Release amount appears once as a reclass pair",
					"Cash gift totals still match posted gifts",
				],
			),
			t(
				"9.9",
				"Import/export audit log",
				spec(
					"Compliance",
					"Every import commit and finance export writes actor, counts, date range",
					"Existing audit pipeline",
					"Boards will ask who exported donor files",
					"After 9.3 and 9.7",
					"Do not log raw CSV contents",
				),
				[
					"Import commit audit has row counts, not emails",
					"Export audit has date range and row count",
				],
			),
			t(
				"9.10",
				"Finance export help copy",
				spec(
					"Finance",
					"Help states this is a journal feed, not QuickBooks Online sync, not MIP, not a GL",
					"Export dialog",
					"Rushed 'we integrate with Intacct' claims without a real connector",
					"After 9.7",
					"Copy names CSV/IIF download only",
				),
				[
					"Dialog copy does not claim a live Intacct or QuickBooks connector",
					"Grep guard in tests/roadmap/npo/9-10.test.ts",
				],
			),
		],
	},
	{
		sectionNumber: 10,
		title: "Consent, Privacy, and Packaging",
		sourceRef:
			"Only 14–16% of NPOs have AI governance (Salesforce.org 2025). CLM section 13 covers tenant export/delete; constituent PII and fundraising claims need their own packaging.",
		...TIMELINE,
		tasks: [
			t(
				"10.1",
				"Channel consent fields",
				spec(
					"Staff with constituents.manage",
					"Email, SMS, mail, phone consent plus lawful-basis field on the constituent",
					"Constituent profile + schema",
					"CAN-SPAM / GDPR / CASL; do-not-contact is a blunt instrument — channel consent is the industry standard",
					"Before packaging claims",
					"Extend 1.9 canContact to honor per-channel flags. Audit-log changes",
				),
				[
					"Email consent false makes canContact(email) false even if DNC is false",
					"Consent change is audit-logged",
				],
			),
			t(
				"10.2",
				"Public preference-center token",
				spec(
					"Constituents (self)",
					"Signed token URL to edit channel consent without a staff login",
					"/preferences/[token]",
					"Unsubscribe links are legally expected on appeal mail",
					"After 10.1",
					"Token auth; cannot list other constituents; desktop+public responsive OK",
				),
				[
					"Public token cannot list other constituents",
					"Expired token returns 404",
				],
			),
			t(
				"10.3",
				"Suppress receipts and appeals on consent",
				spec(
					"Platform",
					"7.1 receipts and 9.6/7.7 appeals call canContact; add integration tests",
					"Sender modules from 7 and 9",
					"A preference center that senders ignore is a GDPR finding",
					"After 10.1, 7.1, 9.6",
					"Fail the build if a known sender does not import canContact",
				),
				[
					"Email consent false suppresses receipt and appeal sends",
					"Grep/unit test lists the sender modules",
				],
			),
			t(
				"10.4",
				"Constituents in tenant export",
				spec(
					"Org admins running CLM 13.1",
					"Add constituents, gifts, hours, and scores to the tenant export manifest",
					"Existing portability job",
					"A GDPR export that omits donor files is incomplete",
					"After 1.2+ and 2.2",
					"Extend the manifest; do not invent a second exporter. Nested delete is 10.5",
				),
				[
					"Export manifest lists constituent and gift counts",
					"Export zip includes those collections",
				],
			),
			t(
				"10.5",
				"Constituents in tenant delete",
				spec(
					"Org admins running CLM 13.2",
					"Grace-period delete includes constituents, gifts, hours, scores, wealth imports",
					"Existing deletion job",
					"A GDPR delete that leaves donor files is a fail",
					"After 10.4",
					"Reuse CLM 13.2 grace period; post-delete APIs 404 for that org",
				),
				[
					"Post-grace delete makes constituent and gift APIs 404 for that org",
					"Wealth-import rows are included",
				],
				[
					t(
						"10.5.a",
						"Deletion manifest lists NPO collections",
						spec(
							"IT",
							"Document and register every NPO table in the delete job's collection list",
							"Portability delete config",
							"A missed table is a residual PII bug",
							"First half of 10.5",
							"Explicit list with a test that new catalog tables fail the test until added",
						),
						[
							"Test lists constituents, gifts, hours, scores, relationships",
							"Unknown NPO table names fail the checklist test",
						],
					),
					t(
						"10.5.b",
						"Delete job execution",
						spec(
							"Platform",
							"Job deletes the registered collections inside the existing grace-period flow",
							"CLM 13.2 job",
							"Manifest without execution leaves data",
							"After 10.5.a",
							"Org filter on every delete; no prod-wide wipe",
						),
						[
							"Only the requested org's NPO rows are removed",
							"CLM contract rows are not removed by this job path",
						],
					),
				],
			),
			t(
				"10.6",
				"Packaging grep for banned NPO claims",
				spec(
					"Marketing / IT",
					"Grep marketing/docs for 990 e-file, payroll, wealth engine, live Intacct connector",
					"tests/roadmap/npo/10-6.test.ts",
					"CLM 15 already bans sold-but-not-built language; fundraising is the next leak",
					"After each prior section has merged — this PR is the lock",
					"Checklist test greps banned phrases; allow 'import a wealth screen' and '990 worksheet'",
				),
				[
					"Grep of marketing/docs has no 990 e-file or payroll claim",
					"Grep allows worksheet and wealth-screen import wording",
				],
			),
			t(
				"10.7",
				"Pricing and docs match shipped routes",
				spec(
					"Marketing / IT",
					"Public copy lists only NPO routes that exist in the app; unbuilt items stay on this roadmap",
					"docs + marketing",
					"Selling the roadmap as shipped is how NPO buyers get burned",
					"After 10.6",
					"Table of claimed features vs live routes; test fails on a claimed path that 404s",
				),
				[
					"Claimed feature paths resolve to a real route module",
					"Unbuilt catalog titles are not claimed as 'available now'",
				],
			),
			t(
				"10.8",
				"Roadmap 100% gate",
				spec(
					"IT",
					"NPO board reaches 100% only when every task is complete AND 10.6 grep is green AND live routes in 10.7 exist",
					"Roadmap overview + 10.6/10.7 tests",
					"A board at 100% with banned claims is a packaging bug",
					"Last PR of the catalog",
					"Do not add a hardcoded Super Admin complete button",
				),
				[
					"Overview 100% requires every NPO task complete",
					"10.6 and 10.7 tests are in CI for this PR",
				],
			),
			t(
				"10.9",
				"Consent retention note for AI scores",
				spec(
					"Compliance",
					"Document that lapse/upgrade scores are derived PII and are included in 10.4/10.5",
					"Privacy help on Intelligence card",
					"Salesforce.org 2025: AI governance is the gap; scores without a retention story fail review",
					"After 3.8 and 10.4",
					"Help copy + delete coverage; no extra store",
				),
				[
					"Intelligence card links to the retention note",
					"Scores collection is in the 10.5.a delete list",
				],
			),
			t(
				"10.10",
				"Final dual-catalog isolation check",
				spec(
					"IT",
					"Regression: CLM Appwrite tables still have no NPO rows; NPO ids still npo_ prefixed; PR titles NPO {code} cannot complete CLM tasks",
					"tests/roadmap/npo/10-10.test.ts + github-pr-match.npo.test.ts",
					"A year of product PRs will pressure people to 'just reuse contracts'",
					"After 10.8",
					"Keep the isolation tests; add a comment pointing at this catalog's out-of-lane list",
				),
				[
					"CLM overview length remains 16",
					"NPO 1.1 title cannot complete CLM 1.1",
				],
			),
		],
	},
];

export const NONPROFIT_ROADMAP_CATALOG: RoadmapCatalogSection[] =
	NONPROFIT_ROADMAP_SECTIONS.map((section) => ({
		...section,
		linkedPrNumbers: linkedPrNumbersForSection(section.sectionNumber),
	}));

/** One catalog object per section so the board can load a section in isolation. */
export const NONPROFIT_SECTION_CATALOGS: Record<number, RoadmapCatalogSection> =
	Object.fromEntries(
		NONPROFIT_ROADMAP_CATALOG.map((section) => [
			section.sectionNumber,
			section,
		]),
	);
