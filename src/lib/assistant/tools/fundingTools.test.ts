import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const getPursuitById = vi.fn();
const listPursuits = vi.fn();
const getObligationById = vi.fn();
const listObligations = vi.fn();
const updateObligation = vi.fn();
const getProposalById = vi.fn();
const createProposal = vi.fn();
const updateProposal = vi.fn();
const loadContractForOrg = vi.fn();
const assertFundInOrg = vi.fn();
const setGrantFundIdForContract = vi.fn();
const logAuditEvent = vi.fn();

vi.mock("@/lib/funding/pursuit.repository", () => ({
	getPursuitById: (...args: unknown[]) => getPursuitById(...args),
	listPursuits: (...args: unknown[]) => listPursuits(...args),
}));
vi.mock("@/lib/funding/obligation.repository", () => ({
	getObligationById: (...args: unknown[]) => getObligationById(...args),
	listObligations: (...args: unknown[]) => listObligations(...args),
	updateObligation: (...args: unknown[]) => updateObligation(...args),
}));
vi.mock("@/lib/proposals/repository", () => ({
	getProposalById: (...args: unknown[]) => getProposalById(...args),
	createProposal: (...args: unknown[]) => createProposal(...args),
	updateProposal: (...args: unknown[]) => updateProposal(...args),
}));
vi.mock("@/lib/contracts/negotiation/contract-scope", () => ({
	loadContractForOrg: (...args: unknown[]) => loadContractForOrg(...args),
}));
vi.mock("@/lib/funds", () => ({
	assertFundInOrg: (...args: unknown[]) => assertFundInOrg(...args),
}));
vi.mock("@/lib/funding/grant-fund.repository", () => ({
	setGrantFundIdForContract: (...args: unknown[]) =>
		setGrantFundIdForContract(...args),
}));
vi.mock("@/lib/services/audit-logger", () => ({
	logAuditEvent: (...args: unknown[]) => logAuditEvent(...args),
}));

const { FUNDING_TOOLS } = await import("./fundingTools");

function tool(name: string) {
	const found = FUNDING_TOOLS.find((t) => t.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
}

function ctx(perms: string[]) {
	return {
		orgId: "org-1",
		permissions: perms,
		user: { $id: "admin-1", email: "admin@org.test", name: "Admin" },
	} as unknown as Parameters<(typeof FUNDING_TOOLS)[number]["handler"]>[0];
}

const errorOf = (res: { result?: unknown }) =>
	(res.result as { error?: string }).error;

const pursuitRow = {
	$id: "p-1",
	orgId: "org-1",
	title: "City resilience grant",
	description: "flood mitigation",
	stage: "pursuing",
};

const obligationRow = {
	$id: "o-1",
	orgId: "org-1",
	title: "Q1 progress report",
	status: "open",
};

const proposalRow = {
	$id: "prop-1",
	orgId: "org-1",
	title: "Resilience proposal",
	status: "draft",
};

describe("FUNDING_TOOLS (7.1-7.4)", () => {
	beforeEach(() => {
		getPursuitById.mockReset();
		listPursuits.mockReset();
		getObligationById.mockReset();
		listObligations.mockReset();
		updateObligation.mockReset();
		getProposalById.mockReset();
		createProposal.mockReset();
		updateProposal.mockReset();
		loadContractForOrg.mockReset();
		assertFundInOrg.mockReset();
		setGrantFundIdForContract.mockReset();
		logAuditEvent.mockReset().mockResolvedValue(undefined);
	});

	describe("search_funding", () => {
		it("blocks without funding.view", async () => {
			const res = await tool("search_funding").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(listPursuits).not.toHaveBeenCalled();
		});

		it("denies a pursuit from another org", async () => {
			getPursuitById.mockResolvedValueOnce({ ...pursuitRow, orgId: "org-2" });
			const res = await tool("search_funding").handler(
				ctx([PERMISSIONS.FUNDING.VIEW]),
				{ pursuitId: "p-1" },
			);
			expect(errorOf(res)).toMatch(/no funding pursuit found/i);
		});

		it("searches by title/description substring", async () => {
			listPursuits.mockResolvedValueOnce([pursuitRow]);
			const res = await tool("search_funding").handler(
				ctx([PERMISSIONS.FUNDING.VIEW]),
				{ query: "flood" },
			);
			expect((res.result as { count: number }).count).toBe(1);
		});
	});

	describe("list_funding_obligations", () => {
		it("blocks listing without funding.view", async () => {
			const res = await tool("list_funding_obligations").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(listObligations).not.toHaveBeenCalled();
		});

		it("blocks completing without funding.manage", async () => {
			const res = await tool("list_funding_obligations").handler(ctx([]), {
				obligationId: "o-1",
				complete: true,
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(updateObligation).not.toHaveBeenCalled();
		});

		it("lists obligations for the org", async () => {
			listObligations.mockResolvedValueOnce([obligationRow]);
			const res = await tool("list_funding_obligations").handler(
				ctx([PERMISSIONS.FUNDING.VIEW]),
				{},
			);
			expect(listObligations).toHaveBeenCalledWith(
				expect.objectContaining({ orgId: "org-1" }),
			);
			expect((res.result as { count: number }).count).toBe(1);
		});

		it("completes an obligation and audits", async () => {
			getObligationById.mockResolvedValueOnce(obligationRow);
			updateObligation.mockResolvedValueOnce({
				...obligationRow,
				status: "done",
			});
			const res = await tool("list_funding_obligations").handler(
				ctx([PERMISSIONS.FUNDING.MANAGE]),
				{ obligationId: "o-1", complete: true },
			);
			expect(updateObligation).toHaveBeenCalledWith("o-1", { status: "done" });
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { completed: boolean }).completed).toBe(true);
		});
	});

	describe("create_proposal", () => {
		it("blocks creating without proposals.create", async () => {
			const res = await tool("create_proposal").handler(ctx([]), {
				title: "New",
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(createProposal).not.toHaveBeenCalled();
		});

		it("blocks updating without proposals.edit", async () => {
			const res = await tool("create_proposal").handler(ctx([]), {
				proposalId: "prop-1",
				status: "final",
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(updateProposal).not.toHaveBeenCalled();
		});

		it("creates a proposal and audits", async () => {
			createProposal.mockResolvedValueOnce(proposalRow);
			const res = await tool("create_proposal").handler(
				ctx([PERMISSIONS.PROPOSALS.CREATE]),
				{ title: "Resilience proposal" },
			);
			expect(createProposal).toHaveBeenCalledWith(
				expect.objectContaining({
					orgId: "org-1",
					title: "Resilience proposal",
				}),
			);
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { created: boolean }).created).toBe(true);
		});

		it("rejects an invalid status on update", async () => {
			getProposalById.mockResolvedValueOnce(proposalRow);
			const res = await tool("create_proposal").handler(
				ctx([PERMISSIONS.PROPOSALS.EDIT]),
				{ proposalId: "prop-1", status: "approved" },
			);
			expect(errorOf(res)).toMatch(/status must be/i);
			expect(updateProposal).not.toHaveBeenCalled();
		});

		it("updates status and audits", async () => {
			getProposalById.mockResolvedValueOnce(proposalRow);
			updateProposal.mockResolvedValueOnce({ ...proposalRow, status: "final" });
			const res = await tool("create_proposal").handler(
				ctx([PERMISSIONS.PROPOSALS.EDIT]),
				{ proposalId: "prop-1", status: "final" },
			);
			expect(updateProposal).toHaveBeenCalledWith(
				"prop-1",
				expect.objectContaining({ status: "final" }),
			);
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { status: string }).status).toBe("final");
		});
	});

	describe("link_contract_to_funding", () => {
		it("blocks without both contracts.edit and funding.manage", async () => {
			const res = await tool("link_contract_to_funding").handler(
				ctx([PERMISSIONS.CONTRACTS.EDIT]),
				{ contractId: "c-1", fundId: "f-1" },
			);
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(setGrantFundIdForContract).not.toHaveBeenCalled();
		});

		it("errors when the contract isn't found in this org", async () => {
			loadContractForOrg.mockRejectedValueOnce(new Error("Contract not found"));
			const res = await tool("link_contract_to_funding").handler(
				ctx([PERMISSIONS.CONTRACTS.EDIT, PERMISSIONS.FUNDING.MANAGE]),
				{ contractId: "c-1", fundId: "f-1" },
			);
			expect(errorOf(res)).toMatch(/no contract found/i);
			expect(setGrantFundIdForContract).not.toHaveBeenCalled();
		});

		it("checks the fund belongs to the org before linking", async () => {
			loadContractForOrg.mockResolvedValueOnce({
				$id: "c-1",
				contractType: "grant",
			});
			assertFundInOrg.mockRejectedValueOnce(
				new Error("Fund not found in this organization"),
			);
			const res = await tool("link_contract_to_funding").handler(
				ctx([PERMISSIONS.CONTRACTS.EDIT, PERMISSIONS.FUNDING.MANAGE]),
				{ contractId: "c-1", fundId: "f-1" },
			);
			expect(errorOf(res)).toMatch(/fund not found/i);
			expect(setGrantFundIdForContract).not.toHaveBeenCalled();
		});

		it("links the fund and audits", async () => {
			loadContractForOrg.mockResolvedValueOnce({
				$id: "c-1",
				contractType: "services",
			});
			setGrantFundIdForContract.mockResolvedValueOnce("f-1");
			const res = await tool("link_contract_to_funding").handler(
				ctx([PERMISSIONS.CONTRACTS.EDIT, PERMISSIONS.FUNDING.MANAGE]),
				{ contractId: "c-1", fundId: "f-1" },
			);
			expect(setGrantFundIdForContract).toHaveBeenCalledWith(
				expect.objectContaining({
					orgId: "org-1",
					contractId: "c-1",
					fundId: "f-1",
				}),
			);
			expect(logAuditEvent).toHaveBeenCalled();
			expect((res.result as { linked: boolean }).linked).toBe(true);
		});
	});
});
