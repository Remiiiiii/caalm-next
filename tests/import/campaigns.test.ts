import { describe, expect, it } from "vitest";
import { guessCampaignImportField } from "@/lib/campaigns/import/fields";
import { applyCampaignColumnMapping } from "@/lib/campaigns/import/parse";

describe("campaign import mapping", () => {
	it("guesses campaign headers", () => {
		expect(guessCampaignImportField("campaign_name")).toBe("name");
		expect(guessCampaignImportField("goal_amount")).toBe("goalAmount");
	});

	it("requires a name and a numeric goal", () => {
		const { valid, errors } = applyCampaignColumnMapping(
			[
				{ name: "Annual appeal", goal: "150000" },
				{ name: "", goal: "10" },
				{ name: "Bad goal", goal: "abc" },
			],
			{ name: "name", goal: "goalAmount" },
		);
		expect(valid).toHaveLength(1);
		expect(valid[0]?.goalAmount).toBe(150000);
		expect(errors).toHaveLength(2);
	});
});
