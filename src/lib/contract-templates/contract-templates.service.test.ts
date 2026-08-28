import { describe, expect, it } from "vitest";
import {
	assembleTemplateDocument,
	buildApplyContractPayload,
	buildCreateTemplateData,
	parseClauseRefs,
	planTemplateArchive,
	planTemplateUpdate,
	resolveActiveClausesForRefs,
	serializeClauseRefs,
	TemplateApplyError,
} from "./contract-templates.service";
import type { Clause } from "@/types/clauses";
import type { ContractTemplate } from "@/types/contract-templates";

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
		body: "Each party shall keep confidential information secret.",
		status: "active",
		createdBy: "user_1",
		updatedBy: "user_1",
		...overrides,
	};
}

function template(
	overrides: Partial<ContractTemplate> = {},
): ContractTemplate {
	return {
		$id: "tmpl_1",
		$createdAt: "2026-08-01T00:00:00.000Z",
		$updatedAt: "2026-08-01T00:00:00.000Z",
		orgId: "org_a",
		title: "Vendor MSA",
		status: "active",
		contractTypeId: "vendor",
		clauseRefs: [
			{ familyId: "family_1", sortOrder: 0 },
			{ familyId: "family_2", sortOrder: 1 },
		],
		createdBy: "user_1",
		updatedBy: "user_1",
		...overrides,
	};
}

describe("contract template clause refs", () => {
	it("sorts refs and rejects duplicates", () => {
		const refs = parseClauseRefs(
			JSON.stringify([
				{ familyId: "family_2", sortOrder: 1 },
				{ familyId: "family_1", sortOrder: 0 },
			]),
		);
		expect(refs.map((ref) => ref.familyId)).toEqual(["family_1", "family_2"]);
		expect(() =>
			serializeClauseRefs([
				{ familyId: "family_1", sortOrder: 0 },
				{ familyId: "family_1", sortOrder: 1 },
			]),
		).toThrow(/Duplicate/);
	});

	it("creates a draft template payload", () => {
		const data = buildCreateTemplateData(
			{
				title: "Vendor MSA",
				contractTypeId: "vendor",
				clauseRefs: [{ familyId: "family_1", sortOrder: 0 }],
			},
			{ orgId: "org_a", userId: "user_1" },
		);
		expect(data).toMatchObject({
			orgId: "org_a",
			status: "draft",
			contractTypeId: "vendor",
			createdBy: "user_1",
		});
	});

	it("rejects an unknown contract type", () => {
		expect(() =>
			buildCreateTemplateData(
				{
					title: "Bad",
					contractTypeId: "not-a-type",
					clauseRefs: [{ familyId: "family_1", sortOrder: 0 }],
				},
				{ orgId: "org_a", userId: "user_1" },
			),
		).toThrow(/Invalid contract type/);
	});

	it("archives in place", () => {
		const plan = planTemplateArchive(template(), "user_2");
		expect(plan.patch).toMatchObject({
			status: "archived",
			updatedBy: "user_2",
		});
	});

	it("updates title in place", () => {
		const plan = planTemplateUpdate(
			template({ status: "draft" }),
			{ title: "Vendor MSA v2" },
			"user_2",
		);
		expect(plan.patch.title).toBe("Vendor MSA v2");
		expect(plan.patch.updatedBy).toBe("user_2");
	});
});

describe("apply template assembly", () => {
	it("builds markdown from two clauses", () => {
		const markdown = assembleTemplateDocument({
			templateTitle: "Vendor MSA",
			clauses: [
				{
					clauseId: "c1",
					familyId: "family_1",
					version: 2,
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
		expect(markdown).toContain("# Vendor MSA");
		expect(markdown).toContain("Keep secrets.");
		expect(markdown).toContain("Net 30.");
	});

	it("throws when a family has no current active clause", () => {
		expect(() =>
			resolveActiveClausesForRefs(
				[
					{ familyId: "family_1", sortOrder: 0 },
					{ familyId: "family_missing", sortOrder: 1 },
				],
				[clause({ familyId: "family_1" })],
			),
		).toThrow(TemplateApplyError);
	});

	it("builds a draft contract payload with templateUsed", () => {
		const payload = buildApplyContractPayload({
			template: template(),
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
		expect(payload.status).toBe("pending-review");
		expect(payload.templateUsed).toBe("tmpl_1");
		expect(payload.fileId).toBe("file_1");
		expect(payload.fileRef).toBeUndefined();
		expect(payload.keyObligations).toEqual(["Confidentiality"]);
		expect(payload.contractExpiryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(payload.contractNumber).toBe("TPL-tmpl_1");
		expect(payload.department).toBe("Administration");
		expect(payload.amount).toBe(0);
	});
});
