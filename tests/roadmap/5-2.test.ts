import { describe, expect, it } from "vitest";
import {
	assembleTemplateDocument,
	buildApplyContractPayload,
	resolveActiveClausesForRefs,
	TemplateApplyError,
} from "@/lib/contract-templates/contract-templates.service";
import type { Clause } from "@/types/clauses";

function clause(overrides: Partial<Clause> = {}): Clause {
	return {
		$id: "clause_1",
		$createdAt: "2026-08-01T00:00:00.000Z",
		$updatedAt: "2026-08-01T00:00:00.000Z",
		orgId: "org_a",
		familyId: "family_1",
		version: 1,
		isCurrent: true,
		title: "Confidentiality",
		category: "confidentiality",
		body: "Keep secrets.",
		status: "active",
		createdBy: "user_1",
		updatedBy: "user_1",
		...overrides,
	};
}

describe("roadmap 5.2 contract templates", () => {
	it("assembles a template from two clause library entries", () => {
		const markdown = assembleTemplateDocument({
			templateTitle: "Vendor MSA",
			clauses: [
				{
					clauseId: "c1",
					familyId: "family_1",
					version: 1,
					title: "Confidentiality",
					category: "confidentiality",
					body: "Keep secrets.",
				},
				{
					clauseId: "c2",
					familyId: "family_2",
					version: 1,
					title: "Payment",
					category: "payment",
					body: "Net 30.",
				},
			],
		});
		expect(markdown).toContain("Keep secrets.");
		expect(markdown).toContain("Net 30.");
	});

	it("produces a valid draft payload from a template", () => {
		const payload = buildApplyContractPayload({
			template: {
				$id: "tmpl_1",
				title: "Vendor MSA",
				contractTypeId: "vendor",
			},
			contractName: "Acme Vendor MSA",
			orgId: "org_a",
			userId: "user_1",
			fileId: "file_1",
			clauses: [
				{
					clauseId: "c1",
					familyId: "family_1",
					version: 1,
					title: "Confidentiality",
					category: "confidentiality",
					body: "Keep secrets.",
				},
			],
		});
		expect(payload.lifecycleStatus).toBe("draft");
		expect(payload.templateUsed).toBe("tmpl_1");
		expect(payload.status).toBe("pending-review");
		expect(payload.contractExpiryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(payload.contractNumber).toBe("TPL-tmpl_1");
		expect(payload.amount).toBe(0);
	});

	it("rejects a missing or archived clause instead of skipping it", () => {
		expect(() =>
			resolveActiveClausesForRefs(
				[
					{ familyId: "family_1", sortOrder: 0 },
					{ familyId: "family_2", sortOrder: 1 },
				],
				[
					clause({ familyId: "family_1" }),
					clause({
						$id: "clause_2",
						familyId: "family_2",
						status: "archived",
						isCurrent: false,
					}),
				],
			),
		).toThrow(TemplateApplyError);
	});
});
