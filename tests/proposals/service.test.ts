import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/audit-logger", () => ({
	logAuditEvent: vi.fn(),
}));

vi.mock("@/lib/ai/proposal-generator", () => ({
	buildOutline: vi.fn(),
	draftSection: vi.fn(),
	shredSolicitation: vi.fn(),
}));

vi.mock("@/lib/proposals/repository", () => ({
	createLibraryEntry: vi.fn(),
	createProposal: vi.fn(),
	getProposalById: vi.fn(),
	listLibrary: vi.fn(),
	listRequirements: vi.fn(),
	listSections: vi.fn(),
	replaceRequirements: vi.fn(),
	replaceSections: vi.fn(),
	updateLibraryEntry: vi.fn(),
	updateProposal: vi.fn(),
	updateRequirement: vi.fn(),
	updateSection: vi.fn(),
}));

import { getProposalById, listRequirements } from "@/lib/proposals/repository";
import { generateDraft } from "@/lib/proposals/service";

describe("generateDraft", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getProposalById).mockResolvedValue({
			$id: "prop_1",
			$createdAt: "2026-01-01",
			$updatedAt: "2026-01-01",
			orgId: "org_1",
			title: "Test RFP",
			status: "draft",
			createdByUserId: "user_1",
		});
	});

	it("refuses to draft until every matrix row is certified", async () => {
		vi.mocked(listRequirements).mockResolvedValue([
			{
				$id: "req_1",
				orgId: "org_1",
				proposalId: "prop_1",
				requirementText: "The contractor shall report monthly.",
				sourceSection: "C",
				responseType: "clarification",
				status: "pending",
				order: 0,
			},
		]);

		await expect(
			generateDraft({
				proposalId: "prop_1",
				orgId: "org_1",
				userId: "user_1",
				userName: "Ada",
				userEmail: "ada@example.com",
			}),
		).rejects.toThrow("Certify every matrix row before generating a draft");
	});
});
