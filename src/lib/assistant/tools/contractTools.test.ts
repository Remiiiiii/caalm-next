import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const getRow = vi.fn();
const updateRow = vi.fn();
const listRows = vi.fn();
const logAuditEvent = vi.fn();
const invalidateContracts = vi.fn();
const answerContractQuestion = vi.fn();
const parsePdfBuffer = vi.fn();
const createWizardSession = vi.fn();
const saveWizardSession = vi.fn();
const submitWizard = vi.fn();
const fetchMock = vi.fn();

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
		parsePdfBuffer.mockReset();
		createWizardSession.mockReset();
		saveWizardSession.mockReset();
		submitWizard.mockReset();
		fetchMock.mockReset();
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
});
