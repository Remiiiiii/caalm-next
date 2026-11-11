import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const getRow = vi.fn();
const updateRow = vi.fn();
const listRows = vi.fn();
const logAuditEvent = vi.fn();
const invalidateContracts = vi.fn();
const answerContractQuestion = vi.fn();
const analyzeContractDocument = vi.fn();
const parsePdfBuffer = vi.fn();
const createWizardSession = vi.fn();
const saveWizardSession = vi.fn();
const submitWizard = vi.fn();
const fetchMock = vi.fn();
const extractContractFromDocument = vi.fn();
const listVersions = vi.fn();
const listClauses = vi.fn();
const isClauseCategory = vi.fn(() => true);
const compareClauseWithGemini = vi.fn();
const extractClausesWithGemini = vi.fn();
const pickStandardForClause = vi.fn();
const scoreOrgContractDeviations = vi.fn();
const suggestRedlineForClause = vi.fn();
const listObligations = vi.fn();
const createAccess = vi.fn();
const sendEmail = vi.fn();
const createEnvelope = vi.fn();
const sendEnvelope = vi.fn();
const decide = vi.fn();
const getWorkflowForViewer = vi.fn();
const renewContractAfterExpiry = vi.fn();

vi.mock("@/lib/appwrite", () => ({
	createAdminClient: async () => ({
		tablesDB: { getRow, updateRow, listRows },
	}),
}));
vi.mock("@/lib/services/audit-logger", () => ({
	logAuditEvent: (...args: unknown[]) => logAuditEvent(...args),
}));
vi.mock("@/lib/services/cache-manager", () => ({
	default: {
		invalidateContracts: (...args: unknown[]) => invalidateContracts(...args),
	},
}));
vi.mock("@/lib/ai/contract-assistant", () => ({
	answerContractQuestion: (...args: unknown[]) =>
		answerContractQuestion(...args),
	analyzeContractDocument: (...args: unknown[]) =>
		analyzeContractDocument(...args),
}));
vi.mock("@/lib/ai/extractContractFromDocument", () => ({
	extractContractFromDocument: (...args: unknown[]) =>
		extractContractFromDocument(...args),
}));
vi.mock("@/lib/contracts/negotiation/versions.service", () => ({
	listVersions: (...args: unknown[]) => listVersions(...args),
}));
vi.mock("@/lib/clauses/clause-library.service", () => ({
	listClauses: (...args: unknown[]) => listClauses(...args),
	isClauseCategory: () => isClauseCategory(),
}));
vi.mock("@/lib/playbook/compare-with-gemini", () => ({
	compareClauseWithGemini: (...args: unknown[]) =>
		compareClauseWithGemini(...args),
	extractClausesWithGemini: (...args: unknown[]) =>
		extractClausesWithGemini(...args),
}));
vi.mock("@/lib/playbook/deviation-scoring", () => ({
	pickStandardForClause: (...args: unknown[]) => pickStandardForClause(...args),
}));
vi.mock("@/lib/playbook/score-org-contract", () => ({
	scoreOrgContractDeviations: (...args: unknown[]) =>
		scoreOrgContractDeviations(...args),
}));
vi.mock("@/lib/playbook/suggest-redline", () => ({
	suggestRedlineForClause: (...args: unknown[]) =>
		suggestRedlineForClause(...args),
}));
vi.mock("@/lib/files/pdf-text", () => ({
	parsePdfBuffer: (...args: unknown[]) => parsePdfBuffer(...args),
}));
vi.mock("@/lib/templates/wizard.service", () => ({
	createWizardSession: (...args: unknown[]) => createWizardSession(...args),
	saveWizardSession: (...args: unknown[]) => saveWizardSession(...args),
	submitWizard: (...args: unknown[]) => submitWizard(...args),
}));
vi.mock("@/lib/utils", () => ({
	constructFileUrl: (id: string) => `https://files.example.test/${id}`,
}));
vi.mock("@/lib/funding/obligation.repository", () => ({
	listObligations: (...args: unknown[]) => listObligations(...args),
}));
vi.mock("@/lib/contracts/negotiation/access.service", () => ({
	createAccess: (...args: unknown[]) => createAccess(...args),
}));
vi.mock("@/lib/services/mailgun", () => ({
	mailgunService: { sendEmail: (...args: unknown[]) => sendEmail(...args) },
}));
vi.mock("@/lib/esign/envelope-service", () => ({
	createEnvelope: (...args: unknown[]) => createEnvelope(...args),
	sendEnvelope: (...args: unknown[]) => sendEnvelope(...args),
}));
vi.mock("@/lib/approvals/ContractApprovalWorkflowService", () => ({
	decide: (...args: unknown[]) => decide(...args),
	getWorkflowForViewer: (...args: unknown[]) => getWorkflowForViewer(...args),
}));
vi.mock("@/lib/renewals/renewDocument", () => ({
	renewContractAfterExpiry: (...args: unknown[]) =>
		renewContractAfterExpiry(...args),
}));

global.fetch = fetchMock as unknown as typeof fetch;

const { CONTRACT_TOOLS } = await import("./contractTools");

function tool(name: string) {
	const found = CONTRACT_TOOLS.find((item) => item.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
}

function ctx(perms: string[], extra?: { userId?: string }) {
	return {
		orgId: "org-1",
		permissions: perms,
		user: {
			$id: extra?.userId ?? "admin-1",
			email: "admin@org.test",
			name: "Admin",
		},
	} as unknown as Parameters<(typeof CONTRACT_TOOLS)[number]["handler"]>[0];
}

const contractRow = {
	$id: "c-1",
	orgId: "org-1",
	contractName: "Vendor Deal",
	fileId: "file-1",
};

describe("CONTRACT_TOOLS", () => {
	beforeEach(() => {
		getRow.mockReset();
		updateRow.mockReset();
		listRows.mockReset();
		logAuditEvent.mockReset().mockResolvedValue(undefined);
		invalidateContracts.mockReset().mockResolvedValue(undefined);
		answerContractQuestion.mockReset();
		analyzeContractDocument.mockReset();
		parsePdfBuffer.mockReset();
		createWizardSession.mockReset();
		saveWizardSession.mockReset();
		submitWizard.mockReset();
		fetchMock.mockReset();
		extractContractFromDocument.mockReset();
		listVersions.mockReset();
		listClauses.mockReset();
		isClauseCategory.mockReset().mockReturnValue(true);
		compareClauseWithGemini.mockReset();
		extractClausesWithGemini.mockReset();
		pickStandardForClause.mockReset();
		scoreOrgContractDeviations.mockReset();
		suggestRedlineForClause.mockReset();
		listObligations.mockReset();
		createAccess.mockReset();
		sendEmail.mockReset().mockResolvedValue(undefined);
		createEnvelope.mockReset();
		sendEnvelope.mockReset();
		decide.mockReset();
		getWorkflowForViewer.mockReset();
		renewContractAfterExpiry.mockReset();
	});

	describe("get_contract", () => {
		it("blocks without contracts.view", async () => {
			const res = await tool("get_contract").handler(ctx([]), {
				contractId: "c-1",
			});
			expect((res.result as { error?: string }).error).toMatch(
				/permission|cannot/i,
			);
			expect(getRow).not.toHaveBeenCalled();
		});

		it("denies a contract from another org", async () => {
			getRow.mockResolvedValueOnce({ ...contractRow, orgId: "org-2" });
			const res = await tool("get_contract").handler(
				ctx([PERMISSIONS.CONTRACTS.VIEW]),
				{ contractId: "c-1" },
			);
			expect((res.result as { error?: string }).error).toMatch(/no contract/i);
		});

		it("returns the contract detail for an org match", async () => {
			getRow.mockResolvedValueOnce(contractRow).mockResolvedValueOnce({
				url: "https://files.example.test/file-1",
				extension: "pdf",
			});
			const res = await tool("get_contract").handler(
				ctx([PERMISSIONS.CONTRACTS.VIEW]),
				{ contractId: "c-1" },
			);
			expect(
				(res.result as { contract?: { contractName?: string } }).contract
					?.contractName,
			).toBe("Vendor Deal");
		});
	});

	describe("ask_contract", () => {
		it("blocks without contracts.view", async () => {
			const res = await tool("ask_contract").handler(ctx([]), {
				contractId: "c-1",
				question: "What is the term?",
			});
			expect((res.result as { error?: string }).error).toMatch(
				/permission|cannot/i,
			);
			expect(answerContractQuestion).not.toHaveBeenCalled();
		});

		it("answers with citations for an org match", async () => {
			getRow.mockResolvedValueOnce(contractRow).mockResolvedValueOnce({
				url: "https://files.example.test/file-1",
				extension: "pdf",
			});
			fetchMock.mockResolvedValueOnce({
				ok: true,
				arrayBuffer: async () => new ArrayBuffer(4),
			});
			parsePdfBuffer.mockResolvedValueOnce({
				pageTexts: [{ page: 1, text: "Term is 2 years" }],
			});
			answerContractQuestion.mockResolvedValueOnce({
				answerMarkdown: "**Term**\n\n2 years",
				citations: [{ id: 1, pages: [1], quote: "Term is 2 years" }],
				suggestedQuestions: [],
			});
			const res = await tool("ask_contract").handler(
				ctx([PERMISSIONS.CONTRACTS.VIEW]),
				{ contractId: "c-1", question: "What is the term?" },
			);
			const result = res.result as { citations?: unknown[] };
			expect(result.citations).toHaveLength(1);
		});
	});

	describe("create_contract", () => {
		it("blocks without contracts.create", async () => {
			const res = await tool("create_contract").handler(ctx([]), {
				blueprintId: "vendor",
				contractName: "New Deal",
			});
			expect((res.result as { error?: string }).error).toMatch(
				/permission|cannot/i,
			);
			expect(createWizardSession).not.toHaveBeenCalled();
		});

		it("rejects an unknown blueprintId", async () => {
			const res = await tool("create_contract").handler(
				ctx([PERMISSIONS.CONTRACTS.CREATE]),
				{ blueprintId: "not-real", contractName: "New Deal" },
			);
			expect((res.result as { error?: string }).error).toMatch(/blueprintid/i);
		});

		it("creates a contract via the wizard service and audits", async () => {
			const session = {
				$id: "s-1",
				orgId: "org-1",
				userId: "admin-1",
				payload: { intake: {}, blueprintId: "vendor" },
			};
			createWizardSession.mockResolvedValueOnce(session);
			saveWizardSession.mockResolvedValueOnce(session);
			submitWizard.mockResolvedValueOnce({ contractId: "c-new" });

			const res = await tool("create_contract").handler(
				ctx([PERMISSIONS.CONTRACTS.CREATE]),
				{ blueprintId: "vendor", contractName: "New Deal" },
			);
			expect(submitWizard).toHaveBeenCalled();
			expect((res.result as { contractId?: string }).contractId).toBe("c-new");
			expect(logAuditEvent).toHaveBeenCalled();
		});
	});

	describe("update_contract_fields", () => {
		it("blocks without contracts.edit", async () => {
			const res = await tool("update_contract_fields").handler(ctx([]), {
				contractId: "c-1",
				status: "active",
			});
			expect((res.result as { error?: string }).error).toMatch(
				/permission|cannot/i,
			);
			expect(updateRow).not.toHaveBeenCalled();
		});

		it("updates allowlisted fields for an org match and audits", async () => {
			getRow
				.mockResolvedValueOnce(contractRow)
				.mockResolvedValueOnce({
					url: "https://files.example.test/file-1",
					extension: "pdf",
				})
				.mockResolvedValueOnce(contractRow);
			updateRow.mockResolvedValueOnce({ ...contractRow, status: "active" });

			const res = await tool("update_contract_fields").handler(
				ctx([PERMISSIONS.CONTRACTS.EDIT]),
				{ contractId: "c-1", status: "active" },
			);
			expect(updateRow).toHaveBeenCalledWith(
				expect.objectContaining({ data: { status: "active" } }),
			);
			expect(
				(res.result as { updatedFields?: string[] }).updatedFields,
			).toEqual(["status"]);
			expect(logAuditEvent).toHaveBeenCalled();
		});
	});

	describe("bulk_update_contracts", () => {
		it("blocks without contracts.edit", async () => {
			const res = await tool("bulk_update_contracts").handler(ctx([]), {
				contractIds: ["c-1"],
			});
			expect((res.result as { error?: string }).error).toMatch(
				/permission|cannot/i,
			);
		});

		it("reports not available yet with zero writes", async () => {
			const res = await tool("bulk_update_contracts").handler(
				ctx([PERMISSIONS.CONTRACTS.EDIT]),
				{ contractIds: ["c-1", "c-2"], status: "active" },
			);
			const result = res.result as {
				message?: string;
				succeeded?: number;
				failed?: number;
			};
			expect(result.message).toMatch(/available yet/i);
			expect(result.succeeded).toBe(0);
			expect(result.failed).toBe(0);
			expect(updateRow).not.toHaveBeenCalled();
		});
	});

	describe("extract_contract_terms", () => {
		it("blocks without contracts.edit", async () => {
			const res = await tool("extract_contract_terms").handler(ctx([]), {
				contractId: "c-1",
			});
			expect((res.result as { error?: string }).error).toMatch(
				/permission|cannot/i,
			);
			expect(extractContractFromDocument).not.toHaveBeenCalled();
		});

		it("returns extracted fields for review without saving", async () => {
			getRow.mockResolvedValueOnce(contractRow).mockResolvedValueOnce({
				url: "https://files.example.test/file-1",
				extension: "pdf",
			});
			fetchMock.mockResolvedValueOnce({
				ok: true,
				arrayBuffer: async () => new ArrayBuffer(4),
			});
			extractContractFromDocument.mockResolvedValueOnce({
				fields: { amount: "1000" },
				extractedData: { amount: "1000" },
				overallConfidence: 0.9,
				lowConfidenceFields: [],
			});
			const res = await tool("extract_contract_terms").handler(
				ctx([PERMISSIONS.CONTRACTS.EDIT]),
				{ contractId: "c-1" },
			);
			const result = res.result as {
				extractedData?: Record<string, unknown>;
				message?: string;
			};
			expect(result.extractedData).toEqual({ amount: "1000" });
			expect(result.message).toMatch(/nothing was saved/i);
			expect(updateRow).not.toHaveBeenCalled();
		});
	});

	describe("summarize_contract", () => {
		it("blocks without contracts.view", async () => {
			const res = await tool("summarize_contract").handler(ctx([]), {
				contractId: "c-1",
			});
			expect((res.result as { error?: string }).error).toMatch(
				/permission|cannot/i,
			);
			expect(analyzeContractDocument).not.toHaveBeenCalled();
		});

		it("returns a summary with citations for an org match", async () => {
			getRow.mockResolvedValueOnce(contractRow).mockResolvedValueOnce({
				url: "https://files.example.test/file-1",
				extension: "pdf",
			});
			fetchMock.mockResolvedValueOnce({
				ok: true,
				arrayBuffer: async () => new ArrayBuffer(4),
			});
			parsePdfBuffer.mockResolvedValueOnce({
				pageTexts: [{ page: 1, text: "Key terms" }],
			});
			analyzeContractDocument.mockResolvedValueOnce({
				summaryMarkdown: "**Summary**",
				citations: [{ id: 1, pages: [1], quote: "Key terms" }],
			});
			const res = await tool("summarize_contract").handler(
				ctx([PERMISSIONS.CONTRACTS.VIEW]),
				{ contractId: "c-1" },
			);
			const result = res.result as { summaryMarkdown?: string };
			expect(result.summaryMarkdown).toBe("**Summary**");
		});
	});

	describe("compare_contract_versions", () => {
		it("blocks without contracts.view", async () => {
			const res = await tool("compare_contract_versions").handler(ctx([]), {
				contractId: "c-1",
			});
			expect((res.result as { error?: string }).error).toMatch(
				/permission|cannot/i,
			);
			expect(listVersions).not.toHaveBeenCalled();
		});

		it("errors when fewer than two versions exist", async () => {
			getRow.mockResolvedValueOnce(contractRow);
			listVersions.mockResolvedValueOnce([
				{ orgId: "org-1", versionNumber: 1, extractedText: "v1" },
			]);
			const res = await tool("compare_contract_versions").handler(
				ctx([PERMISSIONS.CONTRACTS.VIEW]),
				{ contractId: "c-1" },
			);
			expect((res.result as { error?: string }).error).toMatch(
				/nothing to compare/i,
			);
		});

		it("diffs the two most recent versions for an org match", async () => {
			getRow.mockResolvedValueOnce(contractRow);
			listVersions.mockResolvedValueOnce([
				{
					orgId: "org-1",
					versionNumber: 1,
					extractedText: "line one\nline two",
					changeSummary: "first",
				},
				{
					orgId: "org-1",
					versionNumber: 2,
					extractedText: "line one\nline three",
					changeSummary: "second",
				},
			]);
			const res = await tool("compare_contract_versions").handler(
				ctx([PERMISSIONS.CONTRACTS.VIEW]),
				{ contractId: "c-1" },
			);
			const result = res.result as {
				fromVersion?: number;
				toVersion?: number;
				added?: string[];
				removed?: string[];
			};
			expect(result.fromVersion).toBe(1);
			expect(result.toVersion).toBe(2);
			expect(result.added).toContain("line three");
			expect(result.removed).toContain("line two");
		});
	});

	describe("check_playbook_deviations", () => {
		it("blocks without contracts.review", async () => {
			const res = await tool("check_playbook_deviations").handler(ctx([]), {
				contractId: "c-1",
			});
			expect((res.result as { error?: string }).error).toMatch(
				/permission|cannot/i,
			);
			expect(scoreOrgContractDeviations).not.toHaveBeenCalled();
		});

		it("returns the deviation report for an org match", async () => {
			getRow.mockResolvedValueOnce(contractRow).mockResolvedValueOnce({
				url: "https://files.example.test/file-1",
				extension: "pdf",
			});
			fetchMock.mockResolvedValueOnce({
				ok: true,
				arrayBuffer: async () => new ArrayBuffer(4),
			});
			parsePdfBuffer.mockResolvedValueOnce({ text: "contract text" });
			scoreOrgContractDeviations.mockResolvedValueOnce({
				deviations: [{ verdict: "deviate" }],
				summary: { passCount: 0, deviateCount: 1, noStandardCount: 0 },
			});
			const res = await tool("check_playbook_deviations").handler(
				ctx([PERMISSIONS.CONTRACTS.REVIEW]),
				{ contractId: "c-1" },
			);
			expect(scoreOrgContractDeviations).toHaveBeenCalledWith(
				expect.objectContaining({ orgId: "org-1", content: "contract text" }),
			);
			const result = res.result as { summary?: { deviateCount?: number } };
			expect(result.summary?.deviateCount).toBe(1);
		});
	});

	describe("suggest_redlines", () => {
		it("blocks without contracts.review", async () => {
			const res = await tool("suggest_redlines").handler(ctx([]), {
				contractId: "c-1",
			});
			expect((res.result as { error?: string }).error).toMatch(
				/permission|cannot/i,
			);
			expect(extractClausesWithGemini).not.toHaveBeenCalled();
		});

		it("proposes redlines only for deviating clauses and never writes", async () => {
			getRow.mockResolvedValueOnce(contractRow).mockResolvedValueOnce({
				url: "https://files.example.test/file-1",
				extension: "pdf",
			});
			fetchMock.mockResolvedValueOnce({
				ok: true,
				arrayBuffer: async () => new ArrayBuffer(4),
			});
			parsePdfBuffer.mockResolvedValueOnce({ text: "contract text" });
			extractClausesWithGemini.mockResolvedValueOnce([
				{ title: "Confidentiality", category: "confidentiality", body: "x" },
			]);
			listClauses.mockResolvedValueOnce([
				{ title: "Confidentiality", category: "confidentiality", body: "y" },
			]);
			pickStandardForClause.mockReturnValueOnce({
				title: "Confidentiality",
				category: "confidentiality",
				body: "y",
			});
			compareClauseWithGemini.mockResolvedValueOnce({
				verdict: "deviate",
				severity: "medium",
				rationale: "Missing carve-out",
				differingPoints: ["no carve-out"],
			});
			suggestRedlineForClause.mockResolvedValueOnce({
				suggestedText: "New clause text",
				explanation: "Adds the carve-out",
			});
			const res = await tool("suggest_redlines").handler(
				ctx([PERMISSIONS.CONTRACTS.REVIEW]),
				{ contractId: "c-1" },
			);
			const result = res.result as {
				proposals?: Array<{ suggestedText?: string }>;
			};
			expect(result.proposals).toHaveLength(1);
			expect(result.proposals?.[0].suggestedText).toBe("New clause text");
			expect(updateRow).not.toHaveBeenCalled();
		});
	});

	describe("list_contract_obligations", () => {
		it("blocks without contracts.view", async () => {
			const res = await tool("list_contract_obligations").handler(ctx([]), {
				contractId: "c-1",
			});
			expect((res.result as { error?: string }).error).toMatch(
				/permission|cannot/i,
			);
			expect(listObligations).not.toHaveBeenCalled();
		});

		it("returns org-scoped obligations for a contract", async () => {
			getRow.mockResolvedValueOnce(contractRow);
			listObligations.mockResolvedValueOnce([
				{ $id: "ob-1", title: "Annual report", status: "open" },
			]);
			const res = await tool("list_contract_obligations").handler(
				ctx([PERMISSIONS.CONTRACTS.VIEW]),
				{ contractId: "c-1" },
			);
			expect(listObligations).toHaveBeenCalledWith(
				expect.objectContaining({ orgId: "org-1", contractId: "c-1" }),
			);
			const result = res.result as { obligations?: unknown[] };
			expect(result.obligations).toHaveLength(1);
		});
	});

	describe("send_counterparty_invite", () => {
		it("blocks without contracts.edit", async () => {
			const res = await tool("send_counterparty_invite").handler(ctx([]), {
				contractId: "c-1",
				email: "a@b.test",
				name: "A B",
			});
			expect((res.result as { error?: string }).error).toMatch(
				/permission|cannot/i,
			);
			expect(createAccess).not.toHaveBeenCalled();
		});

		it("rejects an invalid email", async () => {
			const res = await tool("send_counterparty_invite").handler(
				ctx([PERMISSIONS.CONTRACTS.EDIT]),
				{ contractId: "c-1", email: "not-an-email", name: "A B" },
			);
			expect((res.result as { error?: string }).error).toMatch(/email/i);
			expect(createAccess).not.toHaveBeenCalled();
		});

		it("creates access, emails the invite, and audits", async () => {
			getRow.mockResolvedValueOnce(contractRow);
			createAccess.mockResolvedValueOnce({
				access: { expiresAt: "2026-12-01" },
				token: "tok",
				urlPath: "/negotiate/tok",
			});
			const res = await tool("send_counterparty_invite").handler(
				ctx([PERMISSIONS.CONTRACTS.EDIT]),
				{ contractId: "c-1", email: "counterparty@vendor.test", name: "Pat" },
			);
			expect(sendEmail).toHaveBeenCalled();
			expect(logAuditEvent).toHaveBeenCalled();
			const result = res.result as { sent?: boolean };
			expect(result.sent).toBe(true);
		});
	});

	describe("send_for_signature", () => {
		it("blocks without contracts.sign", async () => {
			const res = await tool("send_for_signature").handler(ctx([]), {
				contractId: "c-1",
				signers: [{ email: "a@b.test", name: "A B" }],
			});
			expect((res.result as { error?: string }).error).toMatch(
				/permission|cannot/i,
			);
			expect(createEnvelope).not.toHaveBeenCalled();
		});

		it("requires at least one valid signer", async () => {
			const res = await tool("send_for_signature").handler(
				ctx([PERMISSIONS.CONTRACTS.SIGN]),
				{ contractId: "c-1", signers: [] },
			);
			expect((res.result as { error?: string }).error).toMatch(/signer/i);
			expect(createEnvelope).not.toHaveBeenCalled();
		});

		it("creates and sends the envelope, then audits", async () => {
			getRow.mockResolvedValueOnce(contractRow);
			createEnvelope.mockResolvedValueOnce({ $id: "env-1" });
			sendEnvelope.mockResolvedValueOnce({ $id: "env-1", status: "sent" });
			const res = await tool("send_for_signature").handler(
				ctx([PERMISSIONS.CONTRACTS.SIGN]),
				{
					contractId: "c-1",
					signers: [{ email: "signer@vendor.test", name: "Pat" }],
				},
			);
			expect(sendEnvelope).toHaveBeenCalledWith("env-1");
			expect(logAuditEvent).toHaveBeenCalled();
			const result = res.result as { status?: string };
			expect(result.status).toBe("sent");
		});
	});

	describe("approve_contract", () => {
		it("blocks without contracts.approve", async () => {
			const res = await tool("approve_contract").handler(ctx([]), {
				contractId: "c-1",
				decision: "approved",
			});
			expect((res.result as { error?: string }).error).toMatch(
				/permission|cannot/i,
			);
			expect(decide).not.toHaveBeenCalled();
		});

		it("rejects an invalid decision value", async () => {
			const res = await tool("approve_contract").handler(
				ctx([PERMISSIONS.CONTRACTS.APPROVE]),
				{ contractId: "c-1", decision: "maybe" },
			);
			expect((res.result as { error?: string }).error).toMatch(/decision/i);
		});

		it("denies the decision when the viewer cannot decide this step", async () => {
			getRow.mockResolvedValueOnce(contractRow);
			getWorkflowForViewer.mockResolvedValueOnce({
				canDecideAsAssignee: false,
				canAdminOverrideActiveStep: false,
				canAdminOverrideCompleted: false,
				canReject: false,
			});
			const res = await tool("approve_contract").handler(
				ctx([PERMISSIONS.CONTRACTS.APPROVE]),
				{ contractId: "c-1", decision: "approved" },
			);
			expect((res.result as { error?: string }).error).toMatch(
				/not the assignee/i,
			);
			expect(decide).not.toHaveBeenCalled();
		});

		it("records the decision and audits", async () => {
			getRow.mockResolvedValueOnce(contractRow);
			getWorkflowForViewer.mockResolvedValueOnce({
				canDecideAsAssignee: true,
				canAdminOverrideActiveStep: false,
				canAdminOverrideCompleted: false,
				canReject: true,
			});
			decide.mockResolvedValueOnce({
				state: {},
				contractStatus: "approved",
			});
			const res = await tool("approve_contract").handler(
				ctx([PERMISSIONS.CONTRACTS.APPROVE]),
				{ contractId: "c-1", decision: "approved" },
			);
			expect(decide).toHaveBeenCalled();
			expect(logAuditEvent).toHaveBeenCalled();
			const result = res.result as { contractStatus?: string };
			expect(result.contractStatus).toBe("approved");
		});
	});

	describe("renew_contract", () => {
		it("blocks without contracts.edit", async () => {
			const res = await tool("renew_contract").handler(ctx([]), {
				contractId: "c-1",
				newExpiryDate: "2027-01-01",
			});
			expect((res.result as { error?: string }).error).toMatch(
				/permission|cannot/i,
			);
			expect(renewContractAfterExpiry).not.toHaveBeenCalled();
		});

		it("rejects an invalid expiry date", async () => {
			const res = await tool("renew_contract").handler(
				ctx([PERMISSIONS.CONTRACTS.EDIT]),
				{ contractId: "c-1", newExpiryDate: "not-a-date" },
			);
			expect((res.result as { error?: string }).error).toMatch(/expiry/i);
			expect(renewContractAfterExpiry).not.toHaveBeenCalled();
		});

		it("renews the contract for an org match", async () => {
			getRow.mockResolvedValueOnce(contractRow);
			renewContractAfterExpiry.mockResolvedValueOnce(undefined);
			const res = await tool("renew_contract").handler(
				ctx([PERMISSIONS.CONTRACTS.EDIT]),
				{ contractId: "c-1", newExpiryDate: "2027-01-01" },
			);
			expect(renewContractAfterExpiry).toHaveBeenCalledWith(
				expect.objectContaining({
					contractId: "c-1",
					orgId: "org-1",
					newExpiryDate: "2027-01-01",
				}),
			);
			const result = res.result as { renewed?: boolean };
			expect(result.renewed).toBe(true);
		});
	});
});
