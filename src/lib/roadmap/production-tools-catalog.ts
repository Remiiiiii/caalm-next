/**
 * Production Tools Roadmap (Ask CAALM A–O tool gap list).
 *
 * Turns the assistant tool gap list into a fourth IT Development board so the
 * work ships as many small batch PRs instead of one mega-PR. Each task is one
 * Ask CAALM tool (or tightly related group). Every tool stays permission-gated
 * (no role bypass), confirms before a mutating write, and writes an audit
 * entry (who / what / when / tenant) on success.
 *
 * PR convention: one batch PR per up to five task codes (see pto-pr-batches.ts).
 * Title `PTO S1 B1 Users and org admin (1.1–1.5)`. Branch
 * `cursor/production-tools/s01-b1-5329`. 2a rule: wrap existing product APIs
 * now; if a backend does not exist yet, ship a permission-gated honest
 * "not available yet" response and leave the task incomplete until a real wrap
 * lands.
 */

import { linkedPrNumbersForPtoSection } from "./production-tools/pto-pr-batches";
import type { RoadmapCatalogSection } from "./types";

const PR_CONVENTION =
	"One PR per batch (max five task codes). Title: `PTO S1 B1 Users and org admin (1.1–1.5)`. Branch: `cursor/production-tools/s01-b1-5329`. Body: for each task paste Who, What, Where, Why, When, How, and Done when from the board. Every tool: permission from the database (no role bypass), confirm before a mutating write, audit who/what/when/tenant on success. Do not mark complete until merge + green CI.";

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
		testSuiteRef: `tests/roadmap/pto/${taskCode.replace(/\./g, "-")}.test.ts`,
	};
}

const SEQUENTIAL = {
	sequentialTasks: true,
	perTaskPrCompletion: true,
} as const;

/** Standard acceptance for a mutating (write) Ask CAALM tool. */
function writeDone(tool: string, permission: string): string[] {
	return [
		`${tool} is registered in the assistant tool registry and only offered when the user has ${permission}`,
		`Mutating call shows a confirm step and writes an audit entry (who/what/when/tenant) on success; no role-name bypass`,
	];
}

/** Standard acceptance for a read-only Ask CAALM tool. */
function readDone(tool: string, permission: string): string[] {
	return [
		`${tool} is registered and gated by ${permission}; results are scoped to the caller's org`,
		`Returns a clear message (not a crash) when the user lacks ${permission} or no data matches`,
	];
}

const PRODUCTION_TOOLS_ROADMAP_SECTIONS: RoadmapCatalogSection[] = [
	{
		sectionNumber: 0,
		title: "Production Tools Roadmap Engine",
		sourceRef:
			"Fourth IT Development board — same locking, progress, and merge rules as CLM, Nonprofit, and Platform Readiness; isolated catalog so task 1.1 here never completes another board.",
		seedComplete: true,
		...SEQUENTIAL,
		tasks: [
			t(
				"0.1",
				"Fourth catalog in the roadmap engine",
				spec(
					"IT engineers with it.view_roadmap",
					"Add a Production Tools catalog beside CLM, Nonprofit, and Platform Readiness with pto_ entity ids and its own seed",
					"catalog-key.ts, catalogs.ts, production-tools-catalog.ts, store seed",
					"The Ask CAALM tool gap list needs its own timeline so it ships as small PRs, not one mega-PR",
					"Before any PTO product PR",
					"Catalog key pto; overview ?catalog=pto; prefix pto_ on sections and tasks; memory backend like the other boards",
				),
				[
					"GET /api/roadmap/overview?catalog=pto returns the PTO sections without mixing CLM, NPO, or PRD rows",
					"Task ids use pto_ and never collide with sec_00, npo_sec_00, or prd_sec_00",
				],
			),
			t(
				"0.2",
				"Sequential unlock for tool work",
				spec(
					"IT and product leads",
					"Only the next incomplete PTO task stays available; later sections lock until the prior batch PR merges green",
					"locking.ts with sequentialTasks on this catalog",
					"Tools build on shared conventions; order keeps safety (permissions, confirm, audit) landing before breadth",
					"On every overview load and after merge webhooks",
					"catalogUsesSequentialTasks reads true for PTO; completing another board does not unlock PTO",
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
					"Production Tools Roadmap page with the same chrome as the other boards (progress bar, task tree, PR pane)",
					"/dashboard/it/development/production-tools-roadmap",
					"Leadership asked for a tracked plan to finish every assistant tool, not a single PR log line",
					"Section 0 of this catalog",
					"ProductionToolsRoadmapPage wraps ClmRoadmapPage with overviewPath ?catalog=pto; nav link under Development",
				),
				[
					"IT Development lists Production Tools Roadmap next to the other three boards",
					"Missing it.view_roadmap cannot load the PTO overview API",
				],
			),
			t(
				"0.4",
				"PTO branch and title matching",
				spec(
					"Cursor agents and human devs",
					"Match branches cursor/production-tools/… and titles PTO 1.1 so work completes the right board",
					"github-pr-match.ts, agent PR log filters",
					"A bare title 1.1 would complete CLM task 1.1; the PTO prefix keeps catalogs separate",
					"Before the first PTO section PR",
					"resolveCatalogFromPrMatch includes pto; PR log excludes cursor/production-tools branches like the other boards",
				),
				[
					"Branch cursor/production-tools/s01-b1-5329 maps to PTO section 1, not CLM",
					"Title PTO 1.1 does not unlock any other board's task 1.1",
				],
			),
			t(
				"0.5",
				"Shared Ask CAALM tool conventions",
				spec(
					"Engineers adding assistant tools",
					"Document the one pattern every new tool follows: a ToolDefinition with requiredPermissions, confirm for mutations, audit on success, org-scoped reads",
					"src/lib/assistant/tools/*, a short in-repo note",
					"Keeps 80+ tools consistent and safe; prevents a second agent runtime (see no-workflow-engine-sprawl)",
					"Section 0 of this catalog",
					"One note plus a reference tool; no new agent framework",
				),
				[
					"Convention note exists and is linked from the board section card",
					"New tools follow ToolDefinition + permission + confirm + audit; no parallel agent engine added",
				],
			),
		],
	},
	{
		sectionNumber: 1,
		title: "Users and org admin",
		sourceRef:
			"Gap list A: Ask CAALM cannot invite users, list people, change roles, or deactivate accounts. Wrap the existing user/invite APIs behind users.* permissions.",
		...SEQUENTIAL,
		tasks: [
			t(
				"1.1",
				"invite_user",
				spec(
					"Org admins with users.invite",
					"Send an invite link to a new user (email + role) through Ask CAALM",
					"wrap the existing invite API, assistant tools registry",
					"Admins should delegate onboarding to the assistant under their own permission",
					"First Users batch",
					"Confirm before send; audit the invite (actor, invitee email, org); never invite without users.invite",
				),
				writeDone("invite_user", "users.invite"),
			),
			t(
				"1.2",
				"resend_invite",
				spec(
					"Org admins with users.invite",
					"Resend a pending invite for someone who has not accepted",
					"wrap pending-invite API",
					"Invites expire; resending is a common small ask",
					"First Users batch",
					"Confirm; audit resend; only pending invites in the caller's org",
				),
				writeDone("resend_invite", "users.invite"),
			),
			t(
				"1.3",
				"list_users",
				spec(
					"Users with users.view",
					"Find people in the org by name/email/role for follow-up actions",
					"wrap user list/search",
					"Other tools (assign role, deactivate) need to resolve a person first",
					"First Users batch",
					"Read-only; org-scoped; plain-language rows (name, email, role, status)",
				),
				readDone("list_users", "users.view"),
			),
			t(
				"1.4",
				"assign_user_roles",
				spec(
					"Org admins with users.assign_roles",
					"Attach or detach roles for a user",
					"wrap role assignment API",
					"Role changes are high-impact and must be permissioned and audited",
					"First Users batch",
					"Confirm with before/after roles; audit the change; no Super Admin shortcut",
				),
				writeDone("assign_user_roles", "users.assign_roles"),
			),
			t(
				"1.5",
				"deactivate_user",
				spec(
					"Org admins with users.deactivate",
					"Deactivate (and reactivate) a user account",
					"wrap deactivate/reactivate API",
					"Offboarding is sensitive; must confirm and audit",
					"First Users batch",
					"Confirm; audit; cannot deactivate across orgs",
				),
				writeDone("deactivate_user", "users.deactivate"),
			),
			t(
				"1.6",
				"update_user_profile",
				spec(
					"Org admins with users.edit",
					"Update safe profile fields (name, title, department) for a user",
					"wrap user edit API",
					"Small corrections should not need a full settings trip",
					"Second Users batch",
					"Confirm; audit; only product-allowed fields, never billing secrets",
				),
				writeDone("update_user_profile", "users.edit"),
			),
			t(
				"1.7",
				"list_roles",
				spec(
					"Users with users.view",
					"List roles and explain what a role can do, in plain English",
					"wrap roles/role_permissions read",
					"People ask what a role grants before assigning it",
					"Second Users batch",
					"Read-only; org-scoped; summarize permissions without raw keys",
				),
				readDone("list_roles", "users.view"),
			),
			t(
				"1.8",
				"update_org_settings",
				spec(
					"Org admins with settings permission",
					"Update a safe subset of org settings (timezone, branding flags)",
					"wrap org settings API",
					"Routine toggles are good assistant work; billing stays out",
					"Second Users batch",
					"Confirm; audit; never touch billing or secrets",
				),
				writeDone("update_org_settings", "the org settings permission"),
			),
		],
	},
	{
		sectionNumber: 2,
		title: "Contracts CLM depth",
		sourceRef:
			"Gap list B: today Ask CAALM can only search contracts. Add read detail, Q&A, create/update, bulk update, extraction, summarize/compare, playbook/redline, obligations, negotiation, e-sign, approvals, lifecycle, files, export — the core CLM agent surface.",
		...SEQUENTIAL,
		tasks: [
			t(
				"2.1",
				"get_contract",
				spec(
					"Users with contracts.view",
					"Return one contract's full record (key dates, parties, value, status)",
					"wrap contract detail API",
					"Search gives hits; actions need the full record",
					"First Contracts batch",
					"Read-only; org-scoped",
				),
				readDone("get_contract", "contracts.view"),
			),
			t(
				"2.2",
				"ask_contract",
				spec(
					"Users with contracts.view",
					"Answer a question about one contract's text with citations",
					"wrap contract text + existing AI Q&A",
					"Plain-language answers beat manual reading",
					"First Contracts batch",
					"Read-only; cite source; human in the loop for any follow-up write",
				),
				readDone("ask_contract", "contracts.view"),
			),
			t(
				"2.3",
				"create_contract",
				spec(
					"Users with contracts.create",
					"Start a contract (blank or from an approved template)",
					"wrap contract create / template start",
					"Intake is a common assistant ask",
					"First Contracts batch",
					"Confirm draft; audit create; org-scoped owner",
				),
				writeDone("create_contract", "contracts.create"),
			),
			t(
				"2.4",
				"update_contract_fields",
				spec(
					"Users with contracts.edit",
					"Edit metadata fields (status, owner, value, dates) on one contract",
					"wrap contract update API",
					"Quick corrections without leaving chat",
					"First Contracts batch",
					"Confirm before/after; audit; org-scoped",
				),
				writeDone("update_contract_fields", "contracts.edit"),
			),
			t(
				"2.5",
				"bulk_update_contracts",
				spec(
					"Users with contracts.edit",
					"Update up to a few fields across several contracts from a search result, with a preview",
					"wrap contract update in a safe bulk loop",
					"Industry agents do bulk update with explicit confirm (Agiloft pattern)",
					"First Contracts batch",
					"Show affected rows; require explicit confirm; audit each change; report success/failed/skipped",
				),
				[
					"bulk_update_contracts previews every affected contract and requires explicit confirmation before writing",
					"Each successful change is audited; failures are reported and do not roll other rows back silently; gated by contracts.edit",
				],
			),
			t(
				"2.6",
				"extract_contract_terms",
				spec(
					"Users with contracts.edit",
					"AI-extract dates, parties, and value from an uploaded contract into fields for review",
					"wrap existing extract*FromDocument",
					"Speeds intake; must keep a human review step",
					"Second Contracts batch",
					"Never auto-save; present for confirm; audit when saved (ai-document-extraction policy)",
				),
				[
					"extract_contract_terms returns fields for human review and never auto-saves; gated by contracts.edit",
					"Saving the reviewed result is confirmed and audited; manual fallback still works",
				],
			),
			t(
				"2.7",
				"summarize_contract",
				spec(
					"Users with contracts.view",
					"Plain-language summary of one contract",
					"wrap contract text + AI summary",
					"Fast understanding for non-legal staff",
					"Second Contracts batch",
					"Read-only; cite the contract",
				),
				readDone("summarize_contract", "contracts.view"),
			),
			t(
				"2.8",
				"compare_contract_versions",
				spec(
					"Users with contracts.view",
					"Show what changed between two versions of a contract",
					"wrap version history / diff",
					"Version confusion is a top CLM pain",
					"Second Contracts batch",
					"Read-only; org-scoped",
				),
				readDone("compare_contract_versions", "contracts.view"),
			),
			t(
				"2.9",
				"check_playbook_deviations",
				spec(
					"Users with contracts.review",
					"Flag clauses that deviate from the org playbook",
					"wrap playbook scoring (src/lib/playbook)",
					"Deviation detection is a core CLM agent skill",
					"Second Contracts batch",
					"Read-only analysis; explain each flag; no auto-edit",
				),
				readDone("check_playbook_deviations", "contracts.review"),
			),
			t(
				"2.10",
				"suggest_redlines",
				spec(
					"Users with contracts.review",
					"Propose redline edits against the playbook for human review",
					"wrap AI redline against clause library",
					"Redlining with explanations is expected of modern CLM agents",
					"Second Contracts batch",
					"Proposals only; never save without confirm; audit when applied",
				),
				[
					"suggest_redlines returns proposed edits with explanations and never writes without confirm; gated by contracts.review",
					"Applying a redline is confirmed and audited",
				],
			),
			t(
				"2.11",
				"list_contract_obligations",
				spec(
					"Users with contracts.view",
					"List obligations for a contract and create a follow-up task for one",
					"wrap obligations read + create_task",
					"Post-signature obligations are where value leaks",
					"Third Contracts batch",
					"Read list is org-scoped; creating a task confirms and audits",
				),
				[
					"list_contract_obligations returns org-scoped obligations; gated by contracts.view",
					"Creating an obligation task confirms and audits (who/what/when/tenant)",
				],
			),
			t(
				"2.12",
				"send_counterparty_invite",
				spec(
					"Users with contracts.edit",
					"Start negotiation / send a secure counterparty invite link",
					"wrap existing negotiation invite flow",
					"External collaboration is a nonprofit and enterprise need",
					"Third Contracts batch",
					"Confirm; audit; token link scoped to the contract and org",
				),
				writeDone("send_counterparty_invite", "contracts.edit"),
			),
			t(
				"2.13",
				"send_for_signature",
				spec(
					"Users with contracts.sign",
					"Prepare and send a contract for e-signature and report status",
					"wrap existing e-sign flow",
					"Signing is a key lifecycle step buyers expect from the agent",
					"Third Contracts batch",
					"Confirm signers/order; audit send; status read is org-scoped",
				),
				writeDone("send_for_signature", "contracts.sign"),
			),
			t(
				"2.14",
				"approve_contract",
				spec(
					"Users with contracts.approve",
					"Approve, reject, or request changes on a contract in an approval step",
					"wrap approval decision API",
					"Approval actions are high-value and must be audited",
					"Third Contracts batch",
					"Confirm decision + comment; audit; no role bypass",
				),
				writeDone("approve_contract", "contracts.approve"),
			),
			t(
				"2.15",
				"renew_contract",
				spec(
					"Users with contracts.edit",
					"Renew, terminate, or set an auto-renew alert on a contract",
					"wrap lifecycle APIs",
					"Renewal windows are where money is saved or lost",
					"Third Contracts batch",
					"Confirm; audit; never auto-spend or auto-terminate without a human",
				),
				writeDone("renew_contract", "contracts.edit"),
			),
			t(
				"2.16",
				"upload_contract_file",
				spec(
					"Users with contracts.edit",
					"Attach or link a file to a contract record",
					"wrap file attach API",
					"Evidence and signed copies belong on the record",
					"Fourth Contracts batch",
					"Confirm; audit; org-scoped file permissions",
				),
				writeDone("upload_contract_file", "contracts.edit"),
			),
			t(
				"2.17",
				"export_contract",
				spec(
					"Users with contracts.view",
					"Export a contract (PDF/DOCX) using the product's existing export",
					"wrap export endpoint",
					"Sharing outside the app is routine",
					"Fourth Contracts batch",
					"Read/export is org-scoped; audit a sensitive export",
				),
				readDone("export_contract", "contracts.view"),
			),
		],
	},
	{
		sectionNumber: 3,
		title: "Licenses",
		sourceRef:
			"Gap list C: Ask CAALM can search licenses but cannot open, create, renew, approve, or extract them. Wrap the licenses APIs behind licenses.* permissions.",
		...SEQUENTIAL,
		tasks: [
			t(
				"3.1",
				"get_license",
				spec(
					"Users with licenses.view",
					"Return one license's full record",
					"wrap license detail API",
					"Actions need the full record, not a search hit",
					"First Licenses batch",
					"Read-only; org-scoped",
				),
				readDone("get_license", "licenses.view"),
			),
			t(
				"3.2",
				"create_license",
				spec(
					"Users with licenses.create",
					"Create or update a license record",
					"wrap license create/update API",
					"Intake and edits are common",
					"First Licenses batch",
					"Confirm; audit; org-scoped",
				),
				writeDone("create_license", "licenses.create"),
			),
			t(
				"3.3",
				"renew_license",
				spec(
					"Users with licenses.edit",
					"Start a license renewal",
					"wrap renewal flow",
					"Renewals drive compliance and cost",
					"First Licenses batch",
					"Confirm; audit",
				),
				writeDone("renew_license", "licenses.edit"),
			),
			t(
				"3.4",
				"approve_license",
				spec(
					"Users with licenses.approve",
					"Approve or sign a license",
					"wrap approval/sign API",
					"Decision actions must be permissioned and audited",
					"First Licenses batch",
					"Confirm; audit; no role bypass",
				),
				writeDone("approve_license", "licenses.approve"),
			),
			t(
				"3.5",
				"extract_license_from_document",
				spec(
					"Users with licenses.edit",
					"AI-extract license fields from an uploaded document for review",
					"wrap existing extract from document",
					"Speeds intake with a human review step",
					"First Licenses batch",
					"Never auto-save; confirm then audit; manual fallback",
				),
				[
					"extract_license_from_document returns fields for review and never auto-saves; gated by licenses.edit",
					"Saving is confirmed and audited; manual entry still works",
				],
			),
			t(
				"3.6",
				"list_license_expirations",
				spec(
					"Users with licenses.view",
					"List upcoming license expirations (finer than the generic expirations tool)",
					"wrap expiry query scoped to licenses",
					"Expiry is the top license question",
					"Second Licenses batch",
					"Read-only; org-scoped",
				),
				readDone("list_license_expirations", "licenses.view"),
			),
			t(
				"3.7",
				"assign_license_owner",
				spec(
					"Users with licenses.edit",
					"Change the owner of a license",
					"wrap owner update API",
					"Ownership drives reminders and accountability",
					"Second Licenses batch",
					"Confirm; audit",
				),
				writeDone("assign_license_owner", "licenses.edit"),
			),
		],
	},
	{
		sectionNumber: 4,
		title: "Approvals write",
		sourceRef:
			"Gap list D: Ask CAALM can list pending approvals but cannot act on them. Add decision and routing actions behind approval permissions.",
		...SEQUENTIAL,
		tasks: [
			t(
				"4.1",
				"get_approval",
				spec(
					"Users who can view approvals",
					"Return one approval request with its current step",
					"wrap approval detail API",
					"Deciding needs the full context",
					"Approvals batch",
					"Read-only; org-scoped",
				),
				readDone("get_approval", "the approvals view permission"),
			),
			t(
				"4.2",
				"approve_request",
				spec(
					"Assigned approvers",
					"Approve or reject an approval request with a comment",
					"wrap approval decision API",
					"The core approvals action",
					"Approvals batch",
					"Confirm decision; audit; only the assigned approver or a permitted role",
				),
				writeDone("approve_request", "the approver permission for that step"),
			),
			t(
				"4.3",
				"reassign_approval",
				spec(
					"Users who can manage approvals",
					"Reassign or escalate an approval step",
					"wrap routing API",
					"Reviewers go out of office; routing must move",
					"Approvals batch",
					"Confirm; audit",
				),
				writeDone("reassign_approval", "the approvals manage permission"),
			),
			t(
				"4.4",
				"override_approval",
				spec(
					"Users with approvals.override",
					"Override an approval decision (admin action)",
					"wrap override API",
					"Rare, powerful, must be gated and audited",
					"Approvals batch",
					"Always confirm; always audit; only approvals.override, no role shortcut",
				),
				writeDone("override_approval", "approvals.override"),
			),
		],
	},
	{
		sectionNumber: 5,
		title: "Clauses and templates",
		sourceRef:
			"Gap list E: Ask CAALM cannot search or curate the clause library or templates. Wrap clauses.* and contract-template permissions.",
		...SEQUENTIAL,
		tasks: [
			t(
				"5.1",
				"search_clauses",
				spec(
					"Users who can view clauses",
					"Find approved clause language and return one clause",
					"wrap clause library read",
					"Drafting reuses approved language",
					"Clauses batch",
					"Read-only; org-scoped",
				),
				readDone("search_clauses", "the clauses view permission"),
			),
			t(
				"5.2",
				"create_clause",
				spec(
					"Users with clauses.create",
					"Create, update, or retire a clause in the library",
					"wrap clause CRUD",
					"Curation keeps the library current",
					"Clauses batch",
					"Confirm; audit; org-scoped",
				),
				writeDone("create_clause", "clauses.create / clauses.edit"),
			),
			t(
				"5.3",
				"insert_clause_into_draft",
				spec(
					"Users with contracts.edit",
					"Drop an approved clause into an active draft or template",
					"wrap draft editor insert",
					"Connects library to drafting",
					"Clauses batch",
					"Confirm; audit the edit",
				),
				writeDone("insert_clause_into_draft", "contracts.edit"),
			),
			t(
				"5.4",
				"list_contract_templates",
				spec(
					"Users who can view templates",
					"List templates and create/update a template",
					"wrap contract-template APIs",
					"Templates standardize new contracts",
					"Clauses batch",
					"Read is org-scoped; create/update confirms and audits",
				),
				[
					"list_contract_templates is org-scoped and gated by the templates view permission",
					"Creating or updating a template confirms and audits",
				],
			),
			t(
				"5.5",
				"seed_clause_from_document",
				spec(
					"Users with clauses.create",
					"Pull language from an uploaded agreement into the clause library",
					"wrap extract + clause create",
					"One-click library seeding is a known CLM feature",
					"Clauses batch",
					"Human review before save; confirm; audit",
				),
				[
					"seed_clause_from_document proposes clause text for review and never auto-saves; gated by clauses.create",
					"Saving confirms and audits",
				],
			),
		],
	},
	{
		sectionNumber: 6,
		title: "Audits CAPA depth",
		sourceRef:
			"Gap list F: beyond confirm-finding and open Mark closed, add finding/CAP read, stance actions, create CAP, assign/evidence, portfolio views, exports, and readiness. Behind audit.* permissions.",
		...SEQUENTIAL,
		tasks: [
			t(
				"6.1",
				"list_audit_documents",
				spec(
					"Users with audit.documents_view",
					"List uploaded audits and open one document",
					"wrap audit document APIs",
					"Entry point for audit work",
					"First Audits batch",
					"Read-only; org-scoped",
				),
				readDone("list_audit_documents", "audit.documents_view"),
			),
			t(
				"6.2",
				"list_findings",
				spec(
					"Users with audit.documents_view",
					"List findings and return one finding's detail",
					"wrap findings read",
					"Actions need finding detail",
					"First Audits batch",
					"Read-only; org-scoped",
				),
				readDone("list_findings", "audit.documents_view"),
			),
			t(
				"6.3",
				"dispute_finding",
				spec(
					"Users with audit.manage_findings",
					"Set a finding stance: dispute, accept risk, or rectify",
					"wrap stance actions already in the finding card",
					"Stance is a core review action",
					"First Audits batch",
					"Confirm; audit; no role bypass",
				),
				writeDone("dispute_finding", "audit.manage_findings"),
			),
			t(
				"6.4",
				"create_corrective_action",
				spec(
					"Users with audit.manage_caps",
					"Create a corrective action when a finding has none",
					"wrap CAP create",
					"Closes the gap that caused the earlier Mark closed failure",
					"First Audits batch",
					"Confirm; audit; org-scoped",
				),
				writeDone("create_corrective_action", "audit.manage_caps"),
			),
			t(
				"6.5",
				"assign_cap_owner",
				spec(
					"Users with audit.manage_caps",
					"Assign a CAP owner and set a due date",
					"wrap CAP update",
					"Ownership and dates drive escalation",
					"First Audits batch",
					"Confirm; audit",
				),
				writeDone("assign_cap_owner", "audit.manage_caps"),
			),
			t(
				"6.6",
				"upload_cap_evidence",
				spec(
					"Users with audit.manage_caps",
					"Attach evidence to a corrective action",
					"wrap evidence attach",
					"Evidence is required before verified closure",
					"Second Audits batch",
					"Confirm; audit",
				),
				writeDone("upload_cap_evidence", "audit.manage_caps"),
			),
			t(
				"6.7",
				"list_open_caps",
				spec(
					"Users with audit.documents_view",
					"List open and overdue corrective actions across the org",
					"wrap CAP list",
					"Portfolio view for follow-up",
					"Second Audits batch",
					"Read-only; org-scoped",
				),
				readDone("list_open_caps", "audit.documents_view"),
			),
			t(
				"6.8",
				"draft_verification_note",
				spec(
					"Users with audit.manage_caps",
					"Draft (stage) a verification note for review before Mark closed",
					"wrap existing verification-note helper",
					"Separates drafting from the human close step",
					"Second Audits batch",
					"Stage only; never closes a CAP; the human saves in the dialog",
				),
				[
					"draft_verification_note stages text only and never closes a CAP; gated by audit.manage_caps",
					"Closing still requires the human Mark closed step",
				],
			),
			t(
				"6.9",
				"export_audit_report",
				spec(
					"Users with audit.documents_view",
					"Export the audit report or findings CSV the product supports",
					"wrap export endpoints",
					"Sharing results with auditors",
					"Second Audits batch",
					"Org-scoped; audit a sensitive export",
				),
				readDone("export_audit_report", "audit.documents_view"),
			),
			t(
				"6.10",
				"run_readiness_check",
				spec(
					"Users with audit.documents_view",
					"Run or ask the readiness check used by the Readiness AI panel",
					"wrap readiness actions",
					"Readiness prep is a frequent ask",
					"Second Audits batch",
					"Read/analysis; org-scoped",
				),
				readDone("run_readiness_check", "audit.documents_view"),
			),
		],
	},
	{
		sectionNumber: 7,
		title: "Funding and proposals",
		sourceRef:
			"Gap list G (nonprofit-heavy): grants/funding read, funding obligations and completion, proposals, and linking awards to agreements. Behind funding/proposals permissions.",
		...SEQUENTIAL,
		tasks: [
			t(
				"7.1",
				"search_funding",
				spec(
					"Users who can view funding",
					"Search grants/funding and return one record",
					"wrap funding read",
					"Entry point for grant work",
					"Funding batch",
					"Read-only; org-scoped",
				),
				readDone("search_funding", "the funding view permission"),
			),
			t(
				"7.2",
				"list_funding_obligations",
				spec(
					"Users who can view funding",
					"List funding/reporting obligations and mark one complete",
					"wrap obligations read + complete",
					"Reporting deadlines are mission-critical for nonprofits",
					"Funding batch",
					"Read is org-scoped; completing confirms and audits",
				),
				[
					"list_funding_obligations is org-scoped and gated by the funding view permission",
					"Completing an obligation confirms and audits",
				],
			),
			t(
				"7.3",
				"create_proposal",
				spec(
					"Users who can manage proposals",
					"Create a proposal or update its status",
					"wrap proposals API",
					"Proposal pipeline is part of nonprofit flow",
					"Funding batch",
					"Confirm; audit",
				),
				writeDone("create_proposal", "the proposals manage permission"),
			),
			t(
				"7.4",
				"link_contract_to_funding",
				spec(
					"Users with contracts.edit and funding access",
					"Tie an award/funding record to a contract/agreement",
					"wrap the link API",
					"Awards and agreements must connect for tracking",
					"Funding batch",
					"Confirm; audit; org-scoped both sides",
				),
				writeDone("link_contract_to_funding", "contracts.edit + funding access"),
			),
		],
	},
	{
		sectionNumber: 8,
		title: "Constituents, gifts, donations, volunteers",
		sourceRef:
			"Gap list H: CRM-lite for nonprofits — constituents, relationships, gifts, donation pages, volunteers, and the suggested-ask helper. Behind constituents/gifts/donations/volunteers permissions.",
		...SEQUENTIAL,
		tasks: [
			t(
				"8.1",
				"search_constituents",
				spec(
					"Users who can view constituents",
					"Search/open/create a constituent record",
					"wrap constituents API",
					"CRM entry point",
					"Constituents batch",
					"Read is org-scoped; create confirms and audits",
				),
				[
					"search_constituents and get_constituent are org-scoped and gated by the constituents view permission",
					"Creating a constituent confirms and audits",
				],
			),
			t(
				"8.2",
				"add_relationship",
				spec(
					"Users who can edit constituents",
					"Add a relationship between people/orgs",
					"wrap relationship API",
					"Relationships power fundraising intelligence",
					"Constituents batch",
					"Confirm; audit",
				),
				writeDone("add_relationship", "the constituents edit permission"),
			),
			t(
				"8.3",
				"log_gift",
				spec(
					"Users who can manage gifts",
					"Log a gift and list gifts for a constituent",
					"wrap gifts API",
					"Gift entry is routine fundraising work",
					"Constituents batch",
					"List is org-scoped; logging confirms and audits",
				),
				[
					"log_gift confirms and audits; list_gifts is org-scoped; gated by the gifts permission",
					"No cross-org gift reads",
				],
			),
			t(
				"8.4",
				"share_donation_page",
				spec(
					"Users who can manage donations",
					"Create, update, or share a donation page",
					"wrap donation page APIs",
					"Give pages are a core nonprofit surface",
					"Constituents batch",
					"Confirm writes; audit; org-scoped",
				),
				writeDone("share_donation_page", "the donations manage permission"),
			),
			t(
				"8.5",
				"assign_volunteer",
				spec(
					"Users who can manage volunteers",
					"List volunteers and assign one to work",
					"wrap volunteers API",
					"Volunteer ops are part of the nonprofit product",
					"Constituents batch",
					"List is org-scoped; assigning confirms and audits",
				),
				[
					"list_volunteers is org-scoped; assign_volunteer confirms and audits; gated by the volunteers permission",
					"No cross-org assignment",
				],
			),
			t(
				"8.6",
				"compute_suggested_ask",
				spec(
					"Users who can view constituents",
					"Return the suggested ask amount from the existing fundraising logic",
					"wrap src/lib/fundraising/ask.ts computeSuggestedAsk",
					"Reuses logic that exists but has no assistant tool",
					"Second Constituents batch",
					"Read-only; org-scoped; explain the basis",
				),
				readDone("compute_suggested_ask", "the constituents view permission"),
			),
		],
	},
	{
		sectionNumber: 9,
		title: "Calendar and events gaps",
		sourceRef:
			"Gap list I: beyond create/reschedule/cancel, add attendee invites, calendar-approval decisions, sharing, and public events. Behind events/calendar permissions.",
		...SEQUENTIAL,
		tasks: [
			t(
				"9.1",
				"invite_event_attendees",
				spec(
					"Users with events.invite",
					"Invite attendees to an existing event",
					"wrap invite API",
					"Inviting is separate from creating",
					"Calendar batch",
					"Confirm; audit; only named/emailed people",
				),
				writeDone("invite_event_attendees", "events.invite"),
			),
			t(
				"9.2",
				"approve_calendar_request",
				spec(
					"Users with events.approve",
					"Approve a calendar request from the approvals rail",
					"wrap calendar approval API",
					"Decision action on the calendar",
					"Calendar batch",
					"Confirm; audit",
				),
				writeDone("approve_calendar_request", "events.approve"),
			),
			t(
				"9.3",
				"share_calendar",
				spec(
					"Users who can share calendars",
					"Share a calendar or list shared calendars",
					"wrap calendar share API",
					"Sharing is a common coordination ask",
					"Calendar batch",
					"List is org-scoped; sharing confirms and audits",
				),
				[
					"share_calendar confirms and audits; list_shared_calendars is org-scoped; gated by the calendar share permission",
					"No cross-org sharing",
				],
			),
			t(
				"9.4",
				"create_public_event",
				spec(
					"Users with events.create",
					"Create a public event and list its registrations",
					"wrap public event APIs",
					"Public events and registrations are product features",
					"Calendar batch",
					"Creating confirms and audits; registrations read is org-scoped",
				),
				[
					"create_public_event confirms and audits; list_event_registrations is org-scoped; gated by events.create",
					"No cross-org registration reads",
				],
			),
		],
	},
	{
		sectionNumber: 10,
		title: "Tasks gaps",
		sourceRef:
			"Gap list J: beyond list/create/complete, add edit/reassign/due-date, focused lists, cross-links to licenses and findings, and cancel. Behind task permissions.",
		...SEQUENTIAL,
		tasks: [
			t(
				"10.1",
				"update_task",
				spec(
					"Users who can edit tasks",
					"Edit a task, reassign it, or set its due date",
					"wrap task update API",
					"Edits are as common as creation",
					"Tasks batch",
					"Confirm; audit; org-scoped",
				),
				writeDone("update_task", "the task edit permission"),
			),
			t(
				"10.2",
				"list_my_tasks",
				spec(
					"Users who can view tasks",
					"List my tasks and overdue tasks",
					"wrap task list with filters",
					"Focused lists are the most asked view",
					"Tasks batch",
					"Read-only; org-scoped to the caller",
				),
				readDone("list_my_tasks", "the task view permission"),
			),
			t(
				"10.3",
				"create_task_for_finding",
				spec(
					"Users who can create tasks",
					"Create a task linked to a license or an audit finding",
					"wrap create_task with a typed link (like create_task_for_contract)",
					"Cross-linking drives follow-through",
					"Tasks batch",
					"Confirm; audit; org-scoped",
				),
				writeDone("create_task_for_finding", "the task create permission"),
			),
			t(
				"10.4",
				"cancel_task",
				spec(
					"Users who can edit tasks",
					"Cancel or soft-delete a task if the product supports it",
					"wrap task cancel/delete",
					"Tidying stale tasks",
					"Tasks batch",
					"Confirm; audit; no hard delete unless the product allows",
				),
				writeDone("cancel_task", "the task edit permission"),
			),
		],
	},
	{
		sectionNumber: 11,
		title: "Tickets and IT (safe subset)",
		sourceRef:
			"Gap list K: ticket intake and workflow plus IT runbook/health reads. Explicitly excludes raw database, force-delete, and schema tools from the chat agent.",
		...SEQUENTIAL,
		tasks: [
			t(
				"11.1",
				"create_ticket",
				spec(
					"Users who can create tickets",
					"Create, open, and list tickets",
					"wrap tickets API",
					"Intake and triage are common",
					"Tickets batch",
					"Creating confirms and audits; list/get is org-scoped",
				),
				[
					"create_ticket confirms and audits; get_ticket/list_tickets are org-scoped; gated by the ticket permission",
					"No cross-org ticket reads",
				],
			),
			t(
				"11.2",
				"assign_ticket",
				spec(
					"Users with tickets.assign / tickets.resolve",
					"Assign, resolve, or comment on a ticket",
					"wrap ticket workflow API",
					"Workflow actions move tickets",
					"Tickets batch",
					"Confirm; audit; permissioned per action",
				),
				writeDone("assign_ticket", "tickets.assign / tickets.resolve"),
			),
			t(
				"11.3",
				"search_runbooks",
				spec(
					"IT users who can view runbooks",
					"Search runbooks and return a runbook step",
					"wrap runbooks read",
					"Runbooks guide IT response",
					"Tickets batch",
					"Read-only; org-scoped",
				),
				readDone("search_runbooks", "the IT runbooks view permission"),
			),
			t(
				"11.4",
				"get_system_health",
				spec(
					"IT users with the IT view permission",
					"Return deployment list / system-health reads only (no control actions)",
					"wrap read-only IT status",
					"Status visibility without dangerous control",
					"Tickets batch",
					"Read-only; never expose force-delete, manage-schema, or API-key tools to the chat agent",
				),
				[
					"get_system_health is read-only and gated by the IT view permission",
					"Platform force-delete, manage-schema, and API-key management are NOT exposed as assistant tools",
				],
			),
		],
	},
	{
		sectionNumber: 12,
		title: "Integrations and mail",
		sourceRef:
			"Gap list L: draft/send mail (Gmail, Outlook), integration status, calendar sync, and CRM draft helpers. Mail sends always confirm.",
		...SEQUENTIAL,
		tasks: [
			t(
				"12.1",
				"send_gmail",
				spec(
					"Users with Gmail connected and permission",
					"Draft and send a Gmail message",
					"wrap existing Gmail send",
					"Email is a frequent assistant ask",
					"Integrations batch",
					"Always confirm before send; audit; use the user's connected mailbox only",
				),
				writeDone("send_gmail", "the Gmail integration permission"),
			),
			t(
				"12.2",
				"send_outlook_mail",
				spec(
					"Users with Outlook connected and permission",
					"Draft and send an Outlook message",
					"wrap existing Outlook send",
					"Same value as Gmail for Outlook orgs",
					"Integrations batch",
					"Always confirm before send; audit; user's mailbox only",
				),
				writeDone("send_outlook_mail", "the Outlook integration permission"),
			),
			t(
				"12.3",
				"check_integration_status",
				spec(
					"Users who can view integrations",
					"Report whether Outlook/Gmail/CRM are connected",
					"wrap integration status read",
					"Users ask why something will not send",
					"Integrations batch",
					"Read-only; org/user-scoped",
				),
				readDone("check_integration_status", "the integrations view permission"),
			),
			t(
				"12.4",
				"sync_outlook_calendar",
				spec(
					"Users with Outlook connected",
					"Trigger an Outlook calendar sync",
					"wrap sync action",
					"Manual sync fixes drift",
					"Integrations batch",
					"Confirm; audit; user-scoped",
				),
				writeDone("sync_outlook_calendar", "the Outlook integration permission"),
			),
			t(
				"12.5",
				"create_crm_draft_from_deal",
				spec(
					"Users who can use CRM integration",
					"Create a draft from a HubSpot/Salesforce deal using existing helpers",
					"wrap src/lib/crm helpers",
					"Reuses connector logic already in the product",
					"Integrations batch",
					"Confirm; audit; respect CRM entitlements",
				),
				writeDone("create_crm_draft_from_deal", "the CRM integration permission"),
			),
		],
	},
	{
		sectionNumber: 13,
		title: "News, briefing, notifications",
		sourceRef:
			"Gap list M: morning briefing and company news reads, notification inbox read/mark, and the SMS test. Mostly read-only.",
		...SEQUENTIAL,
		tasks: [
			t(
				"13.1",
				"get_morning_briefing",
				spec(
					"Signed-in users",
					"Return the morning briefing and company news",
					"wrap briefing read",
					"A quick daily glance",
					"News batch",
					"Read-only; org/user-scoped",
				),
				readDone("get_morning_briefing", "ai.chat (signed-in)"),
			),
			t(
				"13.2",
				"list_notifications",
				spec(
					"Signed-in users",
					"List notifications and mark one read",
					"wrap notification API",
					"Inbox triage",
					"News batch",
					"List is user-scoped; marking read confirms silently and is user-owned",
				),
				[
					"list_notifications is scoped to the caller; mark_notification_read only affects the caller's notifications",
					"No cross-user notification access",
				],
			),
			t(
				"13.3",
				"send_sms_test",
				spec(
					"Admins who can test SMS",
					"Send a test SMS where the product supports it",
					"wrap existing SMS test",
					"Low-priority diagnostic",
					"News batch",
					"Confirm; audit; admin-only",
				),
				writeDone("send_sms_test", "the SMS admin permission"),
			),
		],
	},
	{
		sectionNumber: 14,
		title: "Analytics and exports",
		sourceRef:
			"Gap list N: explain dashboard metrics in plain English, export tables, and schedule reports. Read/export, org-scoped; honest about sample vs live data.",
		...SEQUENTIAL,
		tasks: [
			t(
				"14.1",
				"query_risk_averted",
				spec(
					"Users who can view analytics",
					"Answer a dashboard metric question (e.g. risk averted) in plain English",
					"wrap metric reads",
					"Metrics are easier asked than clicked",
					"Analytics batch",
					"Read-only; org-scoped; say when a number is sample vs live (honest dashboards)",
				),
				readDone("query_risk_averted", "the analytics view permission"),
			),
			t(
				"14.2",
				"export_table_csv",
				spec(
					"Users who can view the underlying data",
					"Export a table/saved view to CSV",
					"wrap export endpoint",
					"Exports are routine",
					"Analytics batch",
					"Org-scoped; audit a sensitive export",
				),
				readDone("export_table_csv", "the data's view permission"),
			),
			t(
				"14.3",
				"schedule_report",
				spec(
					"Users who can manage reports",
					"Schedule a recurring report if the product supports it",
					"wrap report scheduling",
					"Recurring reports save manual work",
					"Analytics batch",
					"Confirm; audit",
				),
				writeDone("schedule_report", "the report manage permission"),
			),
		],
	},
	{
		sectionNumber: 15,
		title: "Agent OS cross-cutting",
		sourceRef:
			"Gap list O: the safety and usability layer every mature agent has — preview before confirm, undo where safe, explain denials, list capabilities, and compose multi-step skills.",
		...SEQUENTIAL,
		tasks: [
			t(
				"15.1",
				"preview_mutation",
				spec(
					"All assistant users",
					"Show a before/after preview before any confirm",
					"shared helper used by mutating tools",
					"Preview builds trust and prevents mistakes",
					"Agent OS batch",
					"Read-only preview; no write until confirm",
				),
				[
					"preview_mutation renders before/after for a pending action without writing",
					"Mutating tools can call it ahead of confirm",
				],
			),
			t(
				"15.2",
				"undo_last_action",
				spec(
					"Users who performed the action",
					"Reverse the last action where the product is safely reversible",
					"wrap reversible writes only",
					"Reversibility is expected of governed agents",
					"Agent OS batch",
					"Only safe, reversible actions; confirm; audit the undo",
				),
				[
					"undo_last_action only offers reversal for actions the product can safely reverse",
					"The undo is confirmed and audited; irreversible actions are refused with a clear message",
				],
			),
			t(
				"15.3",
				"explain_why_denied",
				spec(
					"Any user who hits a permission wall",
					"Explain which permission is missing and who to ask",
					"shared RBAC explainer",
					"Turns a blunt 403 into a next step",
					"Agent OS batch",
					"Read-only; names the permission in plain English; never bypasses it",
				),
				[
					"explain_why_denied maps a missing permission to a plain-English reason and an admin to ask",
					"It never grants or bypasses the permission",
				],
			),
			t(
				"15.4",
				"list_my_capabilities",
				spec(
					"All assistant users",
					"Answer 'what can you do for me?' from the user's permitted tools",
					"read the tool registry filtered by permissions",
					"Discovery of safe actions",
					"Agent OS batch",
					"Read-only; reflects getToolsForPermissions for the caller",
				),
				[
					"list_my_capabilities lists only tools the caller's permissions allow",
					"No tool outside the user's permissions is suggested",
				],
			),
			t(
				"15.5",
				"compose_skill_multi_step",
				spec(
					"All assistant users",
					"Compose existing tools into a named multi-step skill (e.g. onboard vendor = create contract + tasks + approval)",
					"orchestrate existing ToolDefinitions only",
					"Reusable skills are the top of the agent ladder",
					"Agent OS batch",
					"Each underlying tool keeps its own permission, confirm, and audit; no new agent runtime (no-workflow-engine-sprawl)",
				),
				[
					"compose_skill_multi_step only chains existing permission-gated tools and confirms each mutating step",
					"No second workflow/agent engine is introduced",
				],
			),
		],
	},
];

export const PRODUCTION_TOOLS_ROADMAP_CATALOG: RoadmapCatalogSection[] =
	PRODUCTION_TOOLS_ROADMAP_SECTIONS.map((section) => ({
		...section,
		linkedPrNumbers: linkedPrNumbersForPtoSection(section.sectionNumber),
	}));
