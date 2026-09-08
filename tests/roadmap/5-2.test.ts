import { describe, expect, it } from "vitest";
import {
	assembleContract,
	assertCreatesNewContract,
	emptyWizardPayload,
} from "@/lib/templates/assemble-contract";
import { ROADMAP_CATALOG } from "@/lib/roadmap/catalog";
import type { ClauseSnapshot } from "@/types/contract-templates";

describe("roadmap task 5.2 contract templates", () => {
	const section = ROADMAP_CATALOG.find((row) => row.sectionNumber === 5);
	const task = section?.tasks.find((row) => row.taskCode === "5.2");

	it("is catalogued against PR 68", () => {
		expect(task).toBeDefined();
		expect(task?.linkedPrNumber).toBe(68);
		expect(task?.title).toMatch(/contract templates/i);
		expect(
			task?.acceptanceCriteria.some((line) =>
				/template from clause library produces a valid draft/i.test(line),
			),
		).toBe(true);
	});

	it("assembles a draft from clause library entries", () => {
		const payload = emptyWizardPayload();
		payload.startPath = "template";
		payload.templateId = "tmpl_1";
		payload.intake.contractName = "Acme Vendor MSA";
		payload.intake.counterparty = "Acme";
		payload.intake.expiryDate = "2027-01-01";
		payload.sections = [
			{
				familyId: "family_1",
				source: "template",
				required: true,
				enabled: true,
			},
			{
				familyId: "family_2",
				source: "template",
				required: true,
				enabled: true,
			},
		];

		const clausesByFamily = new Map<string, ClauseSnapshot>([
			[
				"family_1",
				{
					$id: "c1",
					familyId: "family_1",
					version: 1,
					title: "Confidentiality",
					category: "confidentiality",
					body: "Keep secrets.",
					status: "active",
				},
			],
			[
				"family_2",
				{
					$id: "c2",
					familyId: "family_2",
					version: 1,
					title: "Payment",
					category: "payment",
					body: "Net 30.",
					status: "active",
				},
			],
		]);

		const result = assembleContract({ payload, clausesByFamily });
		expect(result.sections.map((row) => row.body).join("\n")).toContain(
			"Keep secrets.",
		);
		expect(result.sections.map((row) => row.body).join("\n")).toContain(
			"Net 30.",
		);
		expect(() => assertCreatesNewContract(payload)).not.toThrow();
	});

	it("skips archived clauses instead of treating them as published", () => {
		const payload = emptyWizardPayload();
		payload.sections = [
			{
				familyId: "family_1",
				source: "template",
				required: true,
				enabled: true,
			},
			{
				familyId: "family_2",
				source: "template",
				required: true,
				enabled: true,
			},
		];

		const clausesByFamily = new Map<string, ClauseSnapshot>([
			[
				"family_1",
				{
					$id: "c1",
					familyId: "family_1",
					version: 1,
					title: "Confidentiality",
					category: "confidentiality",
					body: "Keep secrets.",
					status: "active",
				},
			],
			[
				"family_2",
				{
					$id: "c2",
					familyId: "family_2",
					version: 1,
					title: "Payment",
					category: "payment",
					body: "Net 30.",
					status: "archived",
				},
			],
		]);

		const result = assembleContract({ payload, clausesByFamily });
		const archived = result.sections.find((row) => row.familyId === "family_2");
		expect(archived?.skipped).toBe(true);
		expect(archived?.body).toBe("");
	});
});
