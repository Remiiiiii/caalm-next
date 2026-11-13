/**
 * Production Tools Roadmap catalog PR batches (Ask CAALM A–O tool gap list).
 * Up to five top-level task codes per batch PR — same rule as PRD / Nonprofit.
 * Linked PR numbers fill in as batch PRs open; completion also matches by
 * branch `cursor/production-tools/s{nn}-b{n}-…` and title `PTO S{n} B{n}`.
 */

export type PtoPrBatch = {
	sectionNumber: number;
	sectionTitle: string;
	batch: number;
	taskCodes: string[];
	taskTitles: string[];
	/** Active batch PR on the board; merge completes tasks unless productPrNumber applies. */
	linkedPrNumber?: number;
	/** Merged starter/stub PR (marker-only); never completes catalog tasks. */
	mergedSetupPrNumber?: number;
	/** Optional implementation PR when linkedPrNumber was closed without merging (board placeholder only). */
	productPrNumber?: number;
};

export const PTO_PR_BATCHES: PtoPrBatch[] = [
	{
		sectionNumber: 0,
		sectionTitle: "Production Tools Roadmap Engine",
		batch: 1,
		taskCodes: ["0.1", "0.2", "0.3", "0.4", "0.5"],
		taskTitles: [
			"Fourth catalog in the roadmap engine",
			"Sequential unlock for tool work",
			"IT Development board page",
			"PTO branch and title matching",
			"Shared Ask CAALM tool conventions",
		],
	},
	{
		sectionNumber: 1,
		sectionTitle: "Users and org admin",
		batch: 1,
		taskCodes: ["1.1", "1.2", "1.3", "1.4", "1.5"],
		taskTitles: [
			"invite_user",
			"resend_invite",
			"list_users",
			"assign_user_roles",
			"deactivate_user",
		],
		linkedPrNumber: 219,
	},
	{
		sectionNumber: 1,
		sectionTitle: "Users and org admin",
		batch: 2,
		taskCodes: ["1.6", "1.7", "1.8"],
		taskTitles: ["update_user_profile", "list_roles", "update_org_settings"],
		linkedPrNumber: 223,
	},
	{
		sectionNumber: 2,
		sectionTitle: "Contracts CLM depth",
		batch: 1,
		taskCodes: ["2.1", "2.2", "2.3", "2.4", "2.5"],
		taskTitles: [
			"get_contract",
			"ask_contract",
			"create_contract",
			"update_contract_fields",
			"bulk_update_contracts",
		],
		linkedPrNumber: 226,
		productPrNumber: 227,
	},
	{
		sectionNumber: 2,
		sectionTitle: "Contracts CLM depth",
		batch: 2,
		taskCodes: ["2.6", "2.7", "2.8", "2.9", "2.10"],
		taskTitles: [
			"extract_contract_terms",
			"summarize_contract",
			"compare_contract_versions",
			"check_playbook_deviations",
			"suggest_redlines",
		],
		linkedPrNumber: 250,
		mergedSetupPrNumber: 229,
	},
	{
		sectionNumber: 2,
		sectionTitle: "Contracts CLM depth",
		batch: 3,
		taskCodes: ["2.11", "2.12", "2.13", "2.14", "2.15"],
		taskTitles: [
			"list_contract_obligations",
			"send_counterparty_invite",
			"send_for_signature",
			"approve_contract",
			"renew_contract",
		],

		mergedSetupPrNumber: 230,
		linkedPrNumber: 251,
	},
	{
		sectionNumber: 2,
		sectionTitle: "Contracts CLM depth",
		batch: 4,
		taskCodes: ["2.16", "2.17"],
		taskTitles: ["upload_contract_file", "export_contract"],

		mergedSetupPrNumber: 231,
		linkedPrNumber: 252,
	},
	{
		sectionNumber: 3,
		sectionTitle: "Licenses",
		batch: 1,
		taskCodes: ["3.1", "3.2", "3.3", "3.4", "3.5"],
		taskTitles: [
			"get_license",
			"create_license",
			"renew_license",
			"approve_license",
			"extract_license_from_document",
		],
		mergedSetupPrNumber: 232,
		linkedPrNumber: 253,
	},
	{
		sectionNumber: 3,
		sectionTitle: "Licenses",
		batch: 2,
		taskCodes: ["3.6", "3.7"],
		taskTitles: ["list_license_expirations", "assign_license_owner"],

		mergedSetupPrNumber: 233,
		linkedPrNumber: 254,
	},
	{
		sectionNumber: 4,
		sectionTitle: "Approvals write",
		batch: 1,
		taskCodes: ["4.1", "4.2", "4.3", "4.4"],
		taskTitles: [
			"get_approval",
			"approve_request",
			"reassign_approval",
			"override_approval",
		],
		mergedSetupPrNumber: 234,
		linkedPrNumber: 255,
	},
	{
		sectionNumber: 5,
		sectionTitle: "Clauses and templates",
		batch: 1,
		taskCodes: ["5.1", "5.2", "5.3", "5.4", "5.5"],
		taskTitles: [
			"search_clauses",
			"create_clause",
			"insert_clause_into_draft",
			"list_contract_templates",
			"seed_clause_from_document",
		],
		mergedSetupPrNumber: 235,
		linkedPrNumber: 256,
	},
	{
		sectionNumber: 6,
		sectionTitle: "Audits CAPA depth",
		batch: 1,
		taskCodes: ["6.1", "6.2", "6.3", "6.4", "6.5"],
		taskTitles: [
			"list_audit_documents",
			"list_findings",
			"dispute_finding",
			"create_corrective_action",
			"assign_cap_owner",
		],
		mergedSetupPrNumber: 236,
		linkedPrNumber: 257,
	},
	{
		sectionNumber: 6,
		sectionTitle: "Audits CAPA depth",
		batch: 2,
		taskCodes: ["6.6", "6.7", "6.8", "6.9", "6.10"],
		taskTitles: [
			"upload_cap_evidence",
			"list_open_caps",
			"draft_verification_note",
			"export_audit_report",
			"run_readiness_check",
		],

		mergedSetupPrNumber: 237,
		linkedPrNumber: 258,
	},
	{
		sectionNumber: 7,
		sectionTitle: "Funding and proposals",
		batch: 1,
		taskCodes: ["7.1", "7.2", "7.3", "7.4"],
		taskTitles: [
			"search_funding",
			"list_funding_obligations",
			"create_proposal",
			"link_contract_to_funding",
		],
		mergedSetupPrNumber: 238,
		linkedPrNumber: 259,
	},
	{
		sectionNumber: 8,
		sectionTitle: "Constituents, gifts, donations, volunteers",
		batch: 1,
		taskCodes: ["8.1", "8.2", "8.3", "8.4", "8.5"],
		taskTitles: [
			"search_constituents",
			"add_relationship",
			"log_gift",
			"share_donation_page",
			"assign_volunteer",
		],
		mergedSetupPrNumber: 239,
		linkedPrNumber: 260,
	},
	{
		sectionNumber: 8,
		sectionTitle: "Constituents, gifts, donations, volunteers",
		batch: 2,
		taskCodes: ["8.6"],
		taskTitles: ["compute_suggested_ask"],

		mergedSetupPrNumber: 240,
		linkedPrNumber: 261,
	},
	{
		sectionNumber: 9,
		sectionTitle: "Calendar and events gaps",
		batch: 1,
		taskCodes: ["9.1", "9.2", "9.3", "9.4"],
		taskTitles: [
			"invite_event_attendees",
			"approve_calendar_request",
			"share_calendar",
			"create_public_event",
		],
		mergedSetupPrNumber: 241,
		linkedPrNumber: 262,
	},
	{
		sectionNumber: 10,
		sectionTitle: "Tasks gaps",
		batch: 1,
		taskCodes: ["10.1", "10.2", "10.3", "10.4"],
		taskTitles: [
			"update_task",
			"list_my_tasks",
			"create_task_for_finding",
			"cancel_task",
		],
		mergedSetupPrNumber: 242,
		linkedPrNumber: 263,
	},
	{
		sectionNumber: 11,
		sectionTitle: "Tickets and IT (safe subset)",
		batch: 1,
		taskCodes: ["11.1", "11.2", "11.3", "11.4"],
		taskTitles: [
			"create_ticket",
			"assign_ticket",
			"search_runbooks",
			"get_system_health",
		],
		mergedSetupPrNumber: 244,
		linkedPrNumber: 264,
	},
	{
		sectionNumber: 12,
		sectionTitle: "Integrations and mail",
		batch: 1,
		taskCodes: ["12.1", "12.2", "12.3", "12.4", "12.5"],
		taskTitles: [
			"send_gmail",
			"send_outlook_mail",
			"check_integration_status",
			"sync_outlook_calendar",
			"create_crm_draft_from_deal",
		],
		mergedSetupPrNumber: 243,
		linkedPrNumber: 265,
	},
	{
		sectionNumber: 13,
		sectionTitle: "News, briefing, notifications",
		batch: 1,
		taskCodes: ["13.1", "13.2", "13.3"],
		taskTitles: ["get_morning_briefing", "list_notifications", "send_sms_test"],
		mergedSetupPrNumber: 245,
		linkedPrNumber: 266,
	},
	{
		sectionNumber: 14,
		sectionTitle: "Analytics and exports",
		batch: 1,
		taskCodes: ["14.1", "14.2", "14.3"],
		taskTitles: ["query_risk_averted", "export_table_csv", "schedule_report"],
		mergedSetupPrNumber: 246,
		linkedPrNumber: 267,
	},
	{
		sectionNumber: 15,
		sectionTitle: "Agent OS cross-cutting",
		batch: 1,
		taskCodes: ["15.1", "15.2", "15.3", "15.4", "15.5"],
		taskTitles: [
			"preview_mutation",
			"undo_last_action",
			"explain_why_denied",
			"list_my_capabilities",
			"compose_skill_multi_step",
		],
		// #268 was the merged-setup-stub branch's marker commit only (no tool
		// implementation); it was merged as linkedPrNumber by mistake, which
		// falsely completed 15.1-15.5 and jumped ahead of section 14 (still
		// open on #267). Reverted on main (#273). #247/#268 stay as historical
		// markers that complete nothing. #274 reopens the batch draft on a
		// fresh branch of the same name — it stays open and does not
		// implement the tasks until section 14 (#267) merges first (see
		// production-tools-roadmap-prs.mdc).
		mergedSetupPrNumber: 247,
		linkedPrNumber: 274,
	},
];

export function ptoBatchBranchName(batch: PtoPrBatch): string {
	const section = String(batch.sectionNumber).padStart(2, "0");
	return `cursor/production-tools/s${section}-b${batch.batch}-5329`;
}

/** File id under src/lib/roadmap/pto-batches/ (e.g. s01-b1). */
export function ptoBatchFileId(batch: PtoPrBatch): string {
	const section = String(batch.sectionNumber).padStart(2, "0");
	return `s${section}-b${batch.batch}`;
}

export function linkedPrNumbersForPtoSection(sectionNumber: number): number[] {
	const numbers: number[] = [];
	for (const batch of PTO_PR_BATCHES) {
		if (batch.sectionNumber !== sectionNumber) continue;
		if (batch.mergedSetupPrNumber != null) {
			numbers.push(batch.mergedSetupPrNumber);
		}
		if (batch.linkedPrNumber != null) numbers.push(batch.linkedPrNumber);
		if (batch.productPrNumber != null) numbers.push(batch.productPrNumber);
	}
	return numbers;
}

export function ptoBatchForPr(prNumber: number): PtoPrBatch | undefined {
	return PTO_PR_BATCHES.find(
		(item) =>
			item.linkedPrNumber === prNumber ||
			item.productPrNumber === prNumber ||
			item.mergedSetupPrNumber === prNumber,
	);
}

export function ptoBatchOwnsTaskCode(
	batch: PtoPrBatch,
	taskCode: string,
): boolean {
	return batch.taskCodes.some(
		(code) => taskCode === code || taskCode.startsWith(`${code}.`),
	);
}

/**
 * Task codes this PR completes on merge.
 * When productPrNumber is set, only that PR completes the batch — the
 * linkedPrNumber board placeholder (closed without merging) completes nothing.
 * mergedSetupPrNumber is a historical marker merge and completes nothing.
 */
export function ptoTaskCodesCompletedByPr(prNumber: number): string[] {
	const batch = ptoBatchForPr(prNumber);
	if (!batch) return [];
	if (
		batch.mergedSetupPrNumber != null &&
		prNumber === batch.mergedSetupPrNumber
	) {
		return [];
	}
	if (batch.productPrNumber != null && prNumber !== batch.productPrNumber) {
		return [];
	}
	return batch.taskCodes;
}

export function ptoBatchFromHeadRef(headRef: string): PtoPrBatch | undefined {
	const match = headRef.match(/(?:^|\/)s(\d+)-b(\d+)(?:-|$)/i);
	if (!match) return undefined;
	const sectionNumber = Number(match[1]);
	const batchNumber = Number(match[2]);
	return PTO_PR_BATCHES.find(
		(item) =>
			item.sectionNumber === sectionNumber && item.batch === batchNumber,
	);
}

function taskRange(batch: PtoPrBatch): string {
	const last = batch.taskCodes[batch.taskCodes.length - 1];
	return batch.taskCodes.length === 1 || !last
		? (batch.taskCodes[0] ?? "")
		: `${batch.taskCodes[0]}–${last}`;
}

export function ptoCatalogDisplayTitleForPr(prNumber: number): string {
	const batch = ptoBatchForPr(prNumber);
	if (!batch) return "";
	return `PTO S${batch.sectionNumber} B${batch.batch} ${batch.sectionTitle} (${taskRange(batch)})`;
}

export function ptoBatchDisplayTitle(batch: PtoPrBatch): string {
	return `PTO S${batch.sectionNumber} B${batch.batch} ${batch.sectionTitle} (${taskRange(batch)})`;
}
