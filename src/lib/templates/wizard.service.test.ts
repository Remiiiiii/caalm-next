import { describe, expect, it } from "vitest";
import { emptyWizardPayload } from "./assemble-contract";
import { parseWizardPayload } from "./wizard.service";

describe("wizard payload parsing", () => {
	it("starts from a blank scratch payload", () => {
		const payload = emptyWizardPayload();
		expect(payload.startPath).toBe("scratch");
		expect(payload.templateId).toBeNull();
		expect(payload.sections).toEqual([]);
		expect(payload.existingContractId).toBeUndefined();
	});

	it("drops empty family ids and keeps injected source", () => {
		const parsed = parseWizardPayload({
			startPath: "scratch",
			templateId: "",
			intake: { contractName: "Grant 2026", contractType: "grant" },
			sections: [
				{ familyId: "fam_pay", source: "injected", enabled: true },
				{ familyId: "", source: "template" },
			],
			existingContractId: "should-stay-so-submit-can-reject",
		});
		expect(parsed.intake.contractName).toBe("Grant 2026");
		expect(parsed.sections).toEqual([
			{
				familyId: "fam_pay",
				source: "injected",
				fromTemplateId: undefined,
				required: false,
				enabled: true,
				condition: undefined,
			},
		]);
		expect(parsed.existingContractId).toBe("should-stay-so-submit-can-reject");
	});
});
