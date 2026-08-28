import { describe, expect, it } from "vitest";
import type {
	ClauseSlot,
	ClauseSnapshot,
	WizardPayload,
	WizardSection,
} from "@/types/contract-templates";
import {
	applyMergeFields,
	assembleContract,
	assertCreatesNewContract,
	buildMergeValues,
	evaluateCondition,
	injectClauseFamily,
	injectTemplateSlots,
	moveSection,
	validateIntake,
} from "./assemble-contract";

function clause(overrides: Partial<ClauseSnapshot> = {}): ClauseSnapshot {
	return {
		$id: "c1",
		familyId: "fam_conf",
		title: "Confidentiality",
		category: "confidentiality",
		body: "{{counterparty}} shall keep {{contractName}} confidential.",
		version: 2,
		status: "active",
		...overrides,
	};
}

function payload(overrides: Partial<WizardPayload> = {}): WizardPayload {
	return {
		startPath: "template",
		templateId: "tpl_1",
		intake: {
			contractName: "Acme NDA",
			contractType: "vendor",
			department: "Legal",
			counterparty: "Acme Corp",
			amount: "75000",
			currency: "USD",
			startDate: "2026-09-01",
			expiryDate: "2027-09-01",
			governingLaw: "Delaware",
			description: "",
		},
		sections: [
			{
				familyId: "fam_conf",
				source: "template",
				required: true,
				enabled: true,
			},
		],
		...overrides,
	};
}

describe("guided contract assembly", () => {
	it("fills merge fields from intake answers", () => {
		const text = applyMergeFields(
			"{{counterparty}} pays {{currency}} {{amount}}.",
			buildMergeValues(payload().intake, new Date("2026-08-28T12:00:00Z")),
		);
		expect(text).toBe("Acme Corp pays USD 75000.");
	});

	it("leaves unknown placeholders in the snapshot", () => {
		expect(applyMergeFields("See {{missing}}", { counterparty: "Acme" })).toBe(
			"See {{missing}}",
		);
	});

	it("includes a published clause and stamps lineage", () => {
		const result = assembleContract({
			payload: payload(),
			clausesByFamily: new Map([["fam_conf", clause()]]),
			today: new Date("2026-08-28T12:00:00Z"),
		});
		expect(result.markdown).toContain("# Acme NDA");
		expect(result.markdown).toContain(
			"Acme Corp shall keep Acme NDA confidential.",
		);
		expect(result.markdown).toContain("Clause lineage");
		expect(result.lineage).toEqual([
			{
				familyId: "fam_conf",
				clauseId: "c1",
				version: 2,
				title: "Confidentiality",
				source: "template",
			},
		]);
	});

	it("skips a clause when the amount rule fails", () => {
		const sections: WizardSection[] = [
			{
				familyId: "fam_conf",
				source: "template",
				required: false,
				enabled: true,
				condition: { field: "amountNumber", op: "gte", value: "100000" },
			},
		];
		const result = assembleContract({
			payload: payload({ sections }),
			clausesByFamily: new Map([["fam_conf", clause()]]),
		});
		expect(result.sections[0].skipped).toBe(true);
		expect(result.lineage).toEqual([]);
	});

	it("includes the clause when the amount rule passes", () => {
		expect(
			evaluateCondition(
				{ field: "amountNumber", op: "gte", value: "50000" },
				buildMergeValues(payload().intake),
			).ok,
		).toBe(true);
	});

	it("does not snapshot draft library wording", () => {
		const result = assembleContract({
			payload: payload(),
			clausesByFamily: new Map([["fam_conf", clause({ status: "draft" })]]),
		});
		expect(result.sections[0].skipped).toBe(true);
		expect(result.markdown).not.toContain("shall keep");
	});

	it("rejects patching an existing contract id", () => {
		expect(() =>
			assertCreatesNewContract(payload({ existingContractId: "contract_abc" })),
		).toThrow(/cannot patch/i);
		expect(() =>
			assembleContract({
				payload: payload({ existingContractId: "contract_abc" }),
				clausesByFamily: new Map(),
			}),
		).toThrow(/cannot patch/i);
	});

	it("injects a second template without replacing the first recipe", () => {
		const first: ClauseSlot[] = [{ familyId: "fam_conf", required: true }];
		const second: ClauseSlot[] = [
			{ familyId: "fam_pay", required: true },
			{ familyId: "fam_conf", required: true },
		];
		const merged = injectTemplateSlots(
			injectTemplateSlots([], first, "tpl_a"),
			second,
			"tpl_b",
		);
		expect(merged.map((row) => row.familyId)).toEqual(["fam_conf", "fam_pay"]);
		expect(merged[1].source).toBe("injected");
		expect(merged[1].fromTemplateId).toBe("tpl_b");
	});

	it("injects a single clause family once", () => {
		const once = injectClauseFamily([], "fam_term");
		const twice = injectClauseFamily(once, "fam_term");
		expect(twice).toHaveLength(1);
		expect(twice[0].source).toBe("injected");
	});

	it("reorders sections without dropping required slots", () => {
		const rows: WizardSection[] = [
			{ familyId: "a", source: "template", required: true, enabled: true },
			{ familyId: "b", source: "injected", required: false, enabled: true },
		];
		expect(moveSection(rows, 1, -1).map((row) => row.familyId)).toEqual([
			"b",
			"a",
		]);
		expect(moveSection(rows, 0, -1)).toEqual(rows);
	});

	it("requires name, type, counterparty, and expiry before submit", () => {
		const errors = validateIntake({
			contractName: "",
			contractType: "",
			department: "",
			counterparty: "",
			amount: "",
			currency: "USD",
			startDate: "",
			expiryDate: "",
			governingLaw: "",
			description: "",
		});
		expect(errors).toEqual([
			"Name the contract",
			"Pick a contract type",
			"Name the other party",
			"Set an expiry date",
		]);
	});
});
