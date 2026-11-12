import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const getRow = vi.fn();
const getClauseById = vi.fn();
const listClauses = vi.fn();
const createClause = vi.fn();
const updateClause = vi.fn();
const archiveClause = vi.fn();
const getTemplateById = vi.fn();
const listTemplates = vi.fn();
const createTemplate = vi.fn();
const updateTemplate = vi.fn();
const archiveTemplate = vi.fn();
const getWizardSession = vi.fn();
const getWizardSessionForContract = vi.fn();
const saveWizardSession = vi.fn();
const searchContractsTable = vi.fn();
const parsePdfBuffer = vi.fn();
const extractClausesWithGemini = vi.fn();
const logAuditEvent = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/lib/appwrite", () => ({
	createAdminClient: async () => ({ tablesDB: { getRow } }),
}));
vi.mock("@/lib/clauses/clause-library.service", () => ({
	isClauseCategory: (v: unknown) =>
		["confidentiality", "payment", "other"].includes(String(v)),
	getClauseById: (...args: unknown[]) => getClauseById(...args),
	listClauses: (...args: unknown[]) => listClauses(...args),
	createClause: (...args: unknown[]) => createClause(...args),
	updateClause: (...args: unknown[]) => updateClause(...args),
	archiveClause: (...args: unknown[]) => archiveClause(...args),
}));
vi.mock("@/lib/templates/contract-template.service", () => ({
	getTemplateById: (...args: unknown[]) => getTemplateById(...args),
	listTemplates: (...args: unknown[]) => listTemplates(...args),
	createTemplate: (...args: unknown[]) => createTemplate(...args),
	updateTemplate: (...args: unknown[]) => updateTemplate(...args),
	archiveTemplate: (...args: unknown[]) => archiveTemplate(...args),
}));
vi.mock("@/lib/templates/wizard.service", () => ({
	getWizardSession: (...args: unknown[]) => getWizardSession(...args),
	getWizardSessionForContract: (...args: unknown[]) =>
		getWizardSessionForContract(...args),
	saveWizardSession: (...args: unknown[]) => saveWizardSession(...args),
}));
vi.mock("@/lib/assistant/tools/toolUtils", () => ({
	hasAll: (c: { permissions: string[] }, keys: string[]) =>
		keys.every((k) => c.permissions.includes(k)),
	searchContractsTable: (...args: unknown[]) => searchContractsTable(...args),
}));
vi.mock("@/lib/files/pdf-text", () => ({
	parsePdfBuffer: (...args: unknown[]) => parsePdfBuffer(...args),
}));
vi.mock("@/lib/playbook/compare-with-gemini", () => ({
	extractClausesWithGemini: (...args: unknown[]) =>
		extractClausesWithGemini(...args),
}));
vi.mock("@/lib/services/audit-logger", () => ({
	logAuditEvent: (...args: unknown[]) => logAuditEvent(...args),
}));
vi.mock("@/lib/utils", () => ({
	constructFileUrl: (id: string) => `https://files.example.test/${id}`,
}));

global.fetch = fetchMock as unknown as typeof fetch;

const { CLAUSE_TOOLS } = await import("./clauseTools");

function tool(name: string) {
	const found = CLAUSE_TOOLS.find((item) => item.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
}

function ctx(perms: string[]) {
	return {
		orgId: "org-1",
		permissions: perms,
		user: { $id: "admin-1", email: "admin@org.test", name: "Admin" },
	} as unknown as Parameters<(typeof CLAUSE_TOOLS)[number]["handler"]>[0];
}

const errorOf = (res: { result?: unknown }) =>
	(res.result as { error?: string }).error;

const clauseRow = {
	$id: "cl-1",
	orgId: "org-1",
	familyId: "fam-1",
	title: "Confidentiality",
	category: "confidentiality",
	body: "...",
	status: "active",
};

describe("CLAUSE_TOOLS", () => {
	beforeEach(() => {
		getRow.mockReset();
		getClauseById.mockReset();
		listClauses.mockReset();
		createClause.mockReset();
		updateClause.mockReset();
		archiveClause.mockReset();
		getTemplateById.mockReset();
		listTemplates.mockReset();
		createTemplate.mockReset();
		updateTemplate.mockReset();
		archiveTemplate.mockReset();
		getWizardSession.mockReset();
		getWizardSessionForContract.mockReset();
		saveWizardSession.mockReset();
		searchContractsTable.mockReset();
		parsePdfBuffer.mockReset();
		extractClausesWithGemini.mockReset();
		logAuditEvent.mockReset().mockResolvedValue(undefined);
		fetchMock.mockReset();
	});

	describe("search_clauses", () => {
		it("blocks without clauses.view", async () => {
			const res = await tool("search_clauses").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(listClauses).not.toHaveBeenCalled();
		});

		it("returns one clause by id, org-scoped", async () => {
			getClauseById.mockResolvedValueOnce(clauseRow);
			const res = await tool("search_clauses").handler(
				ctx([PERMISSIONS.CLAUSES.VIEW]),
				{ clauseId: "cl-1" },
			);
			expect((res.result as { clause: unknown }).clause).toMatchObject({
				$id: "cl-1",
			});
		});

		it("denies a clause from another org", async () => {
			getClauseById.mockResolvedValueOnce({ ...clauseRow, orgId: "org-2" });
			const res = await tool("search_clauses").handler(
				ctx([PERMISSIONS.CLAUSES.VIEW]),
				{ clauseId: "cl-1" },
			);
			expect(errorOf(res)).toMatch(/no clause found/i);
		});

		it("searches the library and returns a list", async () => {
			listClauses.mockResolvedValueOnce([clauseRow]);
			const res = await tool("search_clauses").handler(
				ctx([PERMISSIONS.CLAUSES.VIEW]),
				{ query: "confidential" },
			);
			expect(listClauses).toHaveBeenCalledWith(
				expect.objectContaining({ orgId: "org-1", search: "confidential" }),
			);
			expect((res.result as { count: number }).count).toBe(1);
		});
	});

	describe("create_clause", () => {
		it("blocks create without clauses.create", async () => {
			const res = await tool("create_clause").handler(ctx([]), {
				title: "New",
				category: "other",
				body: "x",
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(createClause).not.toHaveBeenCalled();
		});

		it("creates a clause and audits", async () => {
			createClause.mockResolvedValueOnce({ $id: "cl-9", title: "New" });
			const res = await tool("create_clause").handler(
				ctx([PERMISSIONS.CLAUSES.CREATE]),
				{ title: "New", category: "other", body: "x" },
			);
			expect(createClause).toHaveBeenCalledWith(
				expect.objectContaining({ orgId: "org-1", userId: "admin-1" }),
			);
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({ module: "governance", action: "create" }),
			);
			expect((res.result as { created: boolean }).created).toBe(true);
		});

		it("updating needs clauses.edit and is org-scoped", async () => {
			getClauseById.mockResolvedValueOnce({ ...clauseRow, orgId: "org-2" });
			const res = await tool("create_clause").handler(
				ctx([PERMISSIONS.CLAUSES.EDIT]),
				{ clauseId: "cl-1", body: "updated" },
			);
			expect(errorOf(res)).toMatch(/no clause found/i);
			expect(updateClause).not.toHaveBeenCalled();
		});

		it("retiring needs clauses.delete", async () => {
			getClauseById.mockResolvedValueOnce(clauseRow);
			const res = await tool("create_clause").handler(
				ctx([PERMISSIONS.CLAUSES.EDIT]),
				{ clauseId: "cl-1", archive: true },
			);
			expect(errorOf(res)).toMatch(/clauses\.delete/);
			expect(archiveClause).not.toHaveBeenCalled();
		});

		it("retires a clause and audits", async () => {
			getClauseById.mockResolvedValueOnce(clauseRow);
			archiveClause.mockResolvedValueOnce({
				$id: "cl-1",
				title: "Confidentiality",
			});
			const res = await tool("create_clause").handler(
				ctx([PERMISSIONS.CLAUSES.DELETE]),
				{ clauseId: "cl-1", archive: true },
			);
			expect(archiveClause).toHaveBeenCalled();
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({ action: "delete" }),
			);
			expect((res.result as { retired: boolean }).retired).toBe(true);
		});
	});

	describe("insert_clause_into_draft", () => {
		it("blocks without contracts.edit", async () => {
			const res = await tool("insert_clause_into_draft").handler(ctx([]), {
				sessionId: "s-1",
				clauseId: "cl-1",
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(saveWizardSession).not.toHaveBeenCalled();
		});

		it("requires a session id or contract id", async () => {
			const res = await tool("insert_clause_into_draft").handler(
				ctx([PERMISSIONS.CONTRACTS.EDIT]),
				{ clauseId: "cl-1" },
			);
			expect(errorOf(res)).toMatch(/session id or contract id/i);
		});

		it("refuses to duplicate an already-included clause", async () => {
			getClauseById.mockResolvedValueOnce(clauseRow);
			getWizardSession.mockResolvedValueOnce({
				$id: "s-1",
				orgId: "org-1",
				userId: "admin-1",
				currentStep: 2,
				contractId: null,
				payload: { sections: [{ familyId: "fam-1", source: "template" }] },
			});
			const res = await tool("insert_clause_into_draft").handler(
				ctx([PERMISSIONS.CONTRACTS.EDIT]),
				{ sessionId: "s-1", clauseId: "cl-1" },
			);
			expect(errorOf(res)).toMatch(/already included/i);
			expect(saveWizardSession).not.toHaveBeenCalled();
		});

		it("inserts the clause into the draft and audits", async () => {
			getClauseById.mockResolvedValueOnce(clauseRow);
			getWizardSession.mockResolvedValueOnce({
				$id: "s-1",
				orgId: "org-1",
				userId: "admin-1",
				currentStep: 2,
				contractId: null,
				payload: { sections: [] },
			});
			saveWizardSession.mockResolvedValueOnce({});
			const res = await tool("insert_clause_into_draft").handler(
				ctx([PERMISSIONS.CONTRACTS.EDIT]),
				{ sessionId: "s-1", clauseId: "cl-1" },
			);
			expect(saveWizardSession).toHaveBeenCalledWith(
				expect.objectContaining({
					orgId: "org-1",
					payload: expect.objectContaining({
						sections: [
							expect.objectContaining({
								familyId: "fam-1",
								source: "injected",
							}),
						],
					}),
				}),
			);
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { inserted: boolean }).inserted).toBe(true);
		});
	});

	describe("list_contract_templates", () => {
		it("blocks list without contract_templates.view", async () => {
			const res = await tool("list_contract_templates").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(listTemplates).not.toHaveBeenCalled();
		});

		it("lists templates for an org match", async () => {
			listTemplates.mockResolvedValueOnce([{ $id: "t-1", name: "MSA" }]);
			const res = await tool("list_contract_templates").handler(
				ctx([PERMISSIONS.CONTRACT_TEMPLATES.VIEW]),
				{},
			);
			expect(listTemplates).toHaveBeenCalledWith(
				expect.objectContaining({ orgId: "org-1" }),
			);
			expect((res.result as { count: number }).count).toBe(1);
		});

		it("blocks create without contract_templates.create", async () => {
			const res = await tool("list_contract_templates").handler(ctx([]), {
				action: "create",
				name: "MSA",
				contractType: "vendor",
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(createTemplate).not.toHaveBeenCalled();
		});

		it("creates a template and audits", async () => {
			createTemplate.mockResolvedValueOnce({ $id: "t-9", name: "MSA" });
			const res = await tool("list_contract_templates").handler(
				ctx([PERMISSIONS.CONTRACT_TEMPLATES.CREATE]),
				{ action: "create", name: "MSA", contractType: "vendor" },
			);
			expect(createTemplate).toHaveBeenCalledWith(
				expect.objectContaining({ orgId: "org-1", userId: "admin-1" }),
			);
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					module: "governance",
					target_type: "contract_template",
				}),
			);
			expect((res.result as { created: boolean }).created).toBe(true);
		});

		it("archiving needs contract_templates.delete", async () => {
			getTemplateById.mockResolvedValueOnce({
				$id: "t-1",
				orgId: "org-1",
				name: "MSA",
			});
			const res = await tool("list_contract_templates").handler(
				ctx([PERMISSIONS.CONTRACT_TEMPLATES.EDIT]),
				{ action: "archive", templateId: "t-1" },
			);
			expect(errorOf(res)).toMatch(/contract_templates\.delete/);
			expect(archiveTemplate).not.toHaveBeenCalled();
		});
	});

	describe("seed_clause_from_document", () => {
		it("blocks without clauses.create", async () => {
			const res = await tool("seed_clause_from_document").handler(ctx([]), {
				contractId: "c-1",
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(extractClausesWithGemini).not.toHaveBeenCalled();
		});

		it("denies a contract from another org", async () => {
			getRow.mockResolvedValueOnce({ $id: "c-1", orgId: "org-2" });
			const res = await tool("seed_clause_from_document").handler(
				ctx([PERMISSIONS.CLAUSES.CREATE]),
				{ contractId: "c-1" },
			);
			expect(errorOf(res)).toMatch(/no contract found/i);
		});

		it("errors when the contract has no file", async () => {
			getRow.mockResolvedValueOnce({
				$id: "c-1",
				orgId: "org-1",
				contractName: "Vendor Deal",
				fileId: "",
			});
			const res = await tool("seed_clause_from_document").handler(
				ctx([PERMISSIONS.CLAUSES.CREATE]),
				{ contractId: "c-1" },
			);
			expect(errorOf(res)).toMatch(/no attached document/i);
		});

		it("extracts candidates for review and saves nothing", async () => {
			getRow
				.mockResolvedValueOnce({
					$id: "c-1",
					orgId: "org-1",
					contractName: "Vendor Deal",
					fileId: "file-1",
				})
				.mockResolvedValueOnce({ url: "https://files.example.test/file-1" });
			fetchMock.mockResolvedValueOnce({
				ok: true,
				arrayBuffer: async () => new ArrayBuffer(4),
			});
			parsePdfBuffer.mockResolvedValueOnce({
				pageTexts: [{ page: 1, text: "Confidentiality clause text" }],
			});
			extractClausesWithGemini.mockResolvedValueOnce([
				{ title: "Confidentiality", category: "confidentiality", body: "..." },
			]);
			const res = await tool("seed_clause_from_document").handler(
				ctx([PERMISSIONS.CLAUSES.CREATE]),
				{ contractId: "c-1" },
			);
			const result = res.result as {
				candidates: unknown[];
				message: string;
			};
			expect(result.candidates).toHaveLength(1);
			expect(result.message).toMatch(/nothing was saved/i);
			expect(createClause).not.toHaveBeenCalled();
			expect(logAuditEvent).not.toHaveBeenCalled();
		});
	});
});
