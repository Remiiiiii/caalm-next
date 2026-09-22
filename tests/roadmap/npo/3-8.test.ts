import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 3.8 intelligence card UI", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[3]?.tasks.find(
		(row) => row.taskCode === "3.8",
	);

	it("is catalogued as intelligence card", () => {
		expect(task?.title).toMatch(/Intelligence card/i);
	});

	it("hides the intelligence tab without ai.fundraising", () => {
		const profile = readFileSync(
			join(process.cwd(), "src/components/constituents/ConstituentProfile.tsx"),
			"utf8",
		);
		expect(profile).toMatch(/PERMISSIONS\.AI\.FUNDRAISING/);
		expect(profile).toMatch(/canFundraising/);
	});

	it("shows empty state copy instead of zero scores", () => {
		const tab = readFileSync(
			join(
				process.cwd(),
				"src/components/constituents/FundraisingIntelligenceTab.tsx",
			),
			"utf8",
		);
		expect(tab).toMatch(/No scores yet/);
		expect(tab).toMatch(/upgradeReadinessScore/);
		expect(tab).toMatch(/effectiveAsk/);
	});
});
