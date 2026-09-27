import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyDismissedKinds } from "@/lib/fundraising/next-best-action";
import { NBA_DISMISS_COOLDOWN_DAYS } from "@/lib/stewardship/constants";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 7.6 dismiss NBA with cooldown", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[7]?.tasks.find(
		(row) => row.taskCode === "7.6",
	);

	it("is catalogued as dismiss NBA", () => {
		expect(task?.title).toMatch(/Dismiss NBA/i);
	});

	it("uses a 14-day cooldown default", () => {
		expect(NBA_DISMISS_COOLDOWN_DAYS).toBe(14);
		const repo = readFileSync(
			join(
				process.cwd(),
				"src/lib/stewardship/nba-dismissals.repository.ts",
			),
			"utf8",
		);
		expect(repo).toMatch(/cooldownUntil/);
	});

	it("filters dismissed kinds before showing NBA", () => {
		const filtered = applyDismissedKinds(
			[
				{ kind: "thank", title: "T", rationale: "r" },
				{ kind: "call", title: "C", rationale: "r" },
			],
			new Set(["thank"]),
		);
		expect(filtered.map((a) => a.kind)).toEqual(["call"]);
	});
});
