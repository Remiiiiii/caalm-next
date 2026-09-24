import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	computeNextBestActions,
	pickPrimaryNextBestAction,
} from "@/lib/fundraising/next-best-action";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 7.5 next-best-action rules", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[7]?.tasks.find(
		(row) => row.taskCode === "7.5",
	);

	it("is catalogued as next-best-action rules", () => {
		expect(task?.title).toMatch(/Next-best-action/i);
	});

	it("hides ask when suggested ask is null", () => {
		const actions = computeNextBestActions({
			segment: "Champion",
			lapseRiskScore: 10,
			daysSinceLastGift: 120,
			suggestedAskAmount: null,
			hasOpenPledgeInstallment: false,
			hasUpcomingPublicEvent: true,
			daysSinceLastPostedGift: 120,
		});
		expect(actions.some((a) => a.kind === "ask")).toBe(false);
	});

	it("prioritizes thank-you after a recent gift", () => {
		const primary = pickPrimaryNextBestAction({
			segment: "Loyal",
			lapseRiskScore: 20,
			daysSinceLastGift: 3,
			suggestedAskAmount: 500,
			hasOpenPledgeInstallment: false,
			hasUpcomingPublicEvent: false,
			daysSinceLastPostedGift: 3,
		});
		expect(primary?.kind).toBe("thank");
	});

	it("surfaces NBA on the Intelligence tab", () => {
		const tab = readFileSync(
			join(
				process.cwd(),
				"src/components/constituents/FundraisingIntelligenceTab.tsx",
			),
			"utf8",
		);
		expect(tab).toMatch(/Next best action/);
		expect(tab).toMatch(/nextBestAction.kind !== "ask"/);
	});
});
