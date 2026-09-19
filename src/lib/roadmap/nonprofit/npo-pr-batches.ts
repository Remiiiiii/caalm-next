/**
 * Nonprofit Roadmap catalog PR batches.
 * Sections with more than 5 top-level tasks get one stub PR per group of 5.
 * Section 0 (4 tasks) uses the engine PR. Product batches are stubs only.
 */

export type NpoPrBatch = {
	sectionNumber: number;
	sectionTitle: string;
	batch: number;
	taskCodes: string[];
	taskTitles: string[];
	/** Filled after the stub PR exists. */
	linkedPrNumber?: number;
};

export const NPO_PR_BATCHES: NpoPrBatch[] = [
	{
		sectionNumber: 0,
		sectionTitle: "Nonprofit Roadmap Engine",
		batch: 1,
		taskCodes: ["0.1", "0.2", "0.3", "0.4"],
		taskTitles: [
			"Dual-catalog data model",
			"Sequential per-task lock engine",
			"IT portal board",
			"cursor/nonprofit/ PR matching",
		],
		linkedPrNumber: 86,
	},
	{
		sectionNumber: 1,
		sectionTitle: "Constituent CRM Foundation",
		batch: 1,
		taskCodes: ["1.1", "1.2", "1.3", "1.4", "1.5"],
		taskTitles: [
			"Constituent permission keys and nav",
			"Constituents table schema",
			"Org-scoped constituent APIs",
			"Duplicate detection on email and name",
			"Constituent list page",
		],
		linkedPrNumber: 88,
	},
	{
		sectionNumber: 1,
		sectionTitle: "Constituent CRM Foundation",
		batch: 2,
		taskCodes: ["1.6", "1.7", "1.8", "1.9", "1.10"],
		taskTitles: [
			"Constituent profile",
			"Households and relationship graph",
			"Interaction timeline",
			"Do-not-contact enforcement",
			"Duplicate merge wizard",
		],
		linkedPrNumber: 89,
	},
	{
		sectionNumber: 1,
		sectionTitle: "Constituent CRM Foundation",
		batch: 3,
		taskCodes: ["1.11"],
		taskTitles: ["PII access audit on profiles"],
		linkedPrNumber: 92,
	},
	{
		sectionNumber: 2,
		sectionTitle: "Gift and Campaign Ledger",
		batch: 1,
		taskCodes: ["2.1", "2.2", "2.3", "2.4", "2.5"],
		taskTitles: [
			"Gift permission keys",
			"Gifts table and receipt allocator",
			"Gift write APIs with posted immutability",
			"Gift list and detail UI",
			"Campaigns schema and UI",
		],
		linkedPrNumber: 90,
	},
	{
		sectionNumber: 2,
		sectionTitle: "Gift and Campaign Ledger",
		batch: 2,
		taskCodes: ["2.6", "2.7", "2.8", "2.9", "2.10"],
		taskTitles: [
			"Designations mapped to fund codes",
			"Recurring gift schedules",
			"Pledge installments and due-date cron",
			"Soft credits from household relationships",
			"Link gifts to grant contracts",
		],
		linkedPrNumber: 93,
	},
	{
		sectionNumber: 3,
		sectionTitle: "AI Fundraising Intelligence",
		batch: 1,
		taskCodes: ["3.1", "3.2", "3.3", "3.4", "3.5"],
		taskTitles: [
			"ai.fundraising permission",
			"RFM feature extraction",
			"Lifecycle segment storage and nightly job",
			"Segment badges and list filter",
			"Explainable lapse-risk score",
		],
		linkedPrNumber: 87,
	},
	{
		sectionNumber: 3,
		sectionTitle: "AI Fundraising Intelligence",
		batch: 2,
		taskCodes: ["3.6", "3.7", "3.8", "3.9", "3.10"],
		taskTitles: [
			"Upgrade-readiness score",
			"Suggested ask amount",
			"Intelligence card UI",
			"Wealth-screen CSV import",
			"Score recompute tests and docs",
		],
		linkedPrNumber: 91,
	},
	{
		sectionNumber: 4,
		sectionTitle: "Restricted-Fund Finance",
		batch: 1,
		taskCodes: ["4.1", "4.2", "4.3", "4.4", "4.5"],
		taskTitles: [
			"Funds table (net-asset classes)",
			"Require fundId on grant contracts",
			"Flag existing grants missing a fund",
			"Grant budget lines",
			"Budget vs actual from obligations and gifts",
		],
		linkedPrNumber: 94,
	},
	{
		sectionNumber: 4,
		sectionTitle: "Restricted-Fund Finance",
		batch: 2,
		taskCodes: ["4.6", "4.7", "4.8", "4.9", "4.10"],
		taskTitles: [
			"990 functional-expense mapping table",
			"990 worksheet CSV export",
			"Restriction release event",
			"Release appears on journal export later",
			"Finance help copy and out-of-lane guards",
		],
		linkedPrNumber: 97,
	},
	{
		sectionNumber: 5,
		sectionTitle: "Volunteer Programs",
		batch: 1,
		taskCodes: ["5.1", "5.2", "5.3", "5.4", "5.5"],
		taskTitles: [
			"Volunteer permission keys",
			"Volunteer profile fields",
			"Shift template schema",
			"Shifts as calendar volunteer_shift events",
			"Capacity and waitlist booking",
		],
		linkedPrNumber: 95,
	},
	{
		sectionNumber: 5,
		sectionTitle: "Volunteer Programs",
		batch: 2,
		taskCodes: ["5.6", "5.7", "5.8", "5.9", "5.10"],
		taskTitles: [
			"Hour log and approval",
			"Coordinator proxy logging",
			"Waiver e-sign reuse",
			"Tag hours to a grant program",
			"Volunteer hour letter export",
		],
		linkedPrNumber: 100,
	},
	{
		sectionNumber: 6,
		sectionTitle: "Public Events and Check-in",
		batch: 1,
		taskCodes: ["6.1", "6.2", "6.3", "6.4", "6.5"],
		taskTitles: [
			"Registration schema and ticket types",
			"Event registrations tab",
			"Guest email becomes a constituent at check-in",
			"Signed QR tokens and scanner",
			"Ticket-type capacity enforcement",
		],
		linkedPrNumber: 98,
	},
	{
		sectionNumber: 6,
		sectionTitle: "Public Events and Check-in",
		batch: 2,
		taskCodes: ["6.6", "6.7", "6.8", "6.9", "6.10"],
		taskTitles: [
			"Donation-at-registration transaction",
			"Event campaign join",
			"Registration confirmation email",
			"No public PII on check-in success",
			"Event roster export",
		],
		linkedPrNumber: 99,
	},
	{
		sectionNumber: 7,
		sectionTitle: "Stewardship Automation",
		batch: 1,
		taskCodes: ["7.1", "7.2", "7.3", "7.4", "7.5"],
		taskTitles: [
			"Gift receipt template",
			"Idempotent posted-gift receipt send",
			"At-risk donor queue page",
			"Contacted writeback",
			"Next-best-action rules",
		],
		linkedPrNumber: 96,
	},
	{
		sectionNumber: 7,
		sectionTitle: "Stewardship Automation",
		batch: 2,
		taskCodes: ["7.6", "7.7", "7.8", "7.9", "7.10"],
		taskTitles: [
			"Dismiss NBA with cooldown",
			"Optional stewardship digest",
			"Thank-you task from posted gift",
			"Invite action from upcoming public events",
			"Stewardship metrics on the queue",
		],
		linkedPrNumber: 103,
	},
	{
		sectionNumber: 8,
		sectionTitle: "Impact and Board Reporting",
		batch: 1,
		taskCodes: ["8.1", "8.2", "8.3", "8.4", "8.5"],
		taskTitles: [
			"Development dashboard route",
			"YTD dollars stat card",
			"Donor count, retention, new-donor cards",
			"Campaign cost field",
			"Campaign ROI view",
		],
		linkedPrNumber: 104,
	},
	{
		sectionNumber: 8,
		sectionTitle: "Impact and Board Reporting",
		batch: 2,
		taskCodes: ["8.6", "8.7", "8.8", "8.9", "8.10"],
		taskTitles: [
			"Funder snapshot composition",
			"Funder snapshot PDF/CSV",
			"Board pack export of KPIs",
			"Insight empty states",
			"Dashboard permission matrix tests",
		],
		linkedPrNumber: 102,
	},
	{
		sectionNumber: 9,
		sectionTitle: "Imports, Payments, and Finance Export",
		batch: 1,
		taskCodes: ["9.1", "9.2", "9.3", "9.4", "9.5"],
		taskTitles: [
			"CSV mapper UI",
			"Dry-run import",
			"Commit import batch",
			"Public give page allowlist",
			"Stripe donation Checkout",
		],
		linkedPrNumber: 105,
	},
	{
		sectionNumber: 9,
		sectionTitle: "Imports, Payments, and Finance Export",
		batch: 2,
		taskCodes: ["9.6", "9.7", "9.8", "9.9", "9.10"],
		taskTitles: [
			"Give page UI",
			"Journal export CSV/IIF",
			"Release rows on the journal export",
			"Import/export audit log",
			"Finance export help copy",
		],
		linkedPrNumber: 107,
	},
	{
		sectionNumber: 10,
		sectionTitle: "Consent, Privacy, and Packaging",
		batch: 1,
		taskCodes: ["10.1", "10.2", "10.3", "10.4", "10.5"],
		taskTitles: [
			"Channel consent fields",
			"Public preference-center token",
			"Suppress receipts and appeals on consent",
			"Constituents in tenant export",
			"Constituents in tenant delete",
		],
		linkedPrNumber: 106,
	},
	{
		sectionNumber: 10,
		sectionTitle: "Consent, Privacy, and Packaging",
		batch: 2,
		taskCodes: ["10.6", "10.7", "10.8", "10.9", "10.10"],
		taskTitles: [
			"Packaging grep for banned NPO claims",
			"Pricing and docs match shipped routes",
			"Roadmap 100% gate",
			"Consent retention note for AI scores",
			"Final dual-catalog isolation check",
		],
		linkedPrNumber: 101,
	},
];

export function npoStubBranchName(batch: NpoPrBatch): string {
	const section = String(batch.sectionNumber).padStart(2, "0");
	return `cursor/nonprofit/s${section}-b${batch.batch}-340a`;
}

export function npoStubFileId(batch: NpoPrBatch): string {
	const section = String(batch.sectionNumber).padStart(2, "0");
	return `s${section}-b${batch.batch}`;
}

export function linkedPrNumbersForSection(sectionNumber: number): number[] {
	return NPO_PR_BATCHES.filter(
		(batch) =>
			batch.sectionNumber === sectionNumber && batch.linkedPrNumber != null,
	).map((batch) => batch.linkedPrNumber as number);
}

export function productNpoPrBatches(): NpoPrBatch[] {
	return NPO_PR_BATCHES.filter((batch) => batch.sectionNumber > 0);
}

/** Section-card label when GitHub has not returned a title yet. */
export function npoCatalogDisplayTitleForPr(prNumber: number): string {
	const batch = NPO_PR_BATCHES.find((item) => item.linkedPrNumber === prNumber);
	if (!batch) return "";
	const last = batch.taskCodes[batch.taskCodes.length - 1];
	const range =
		batch.taskCodes.length === 1 || !last
			? batch.taskCodes[0]
			: `${batch.taskCodes[0]}–${last}`;
	return `S${batch.sectionNumber} B${batch.batch} ${batch.sectionTitle} (${range})`;
}
