import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 8.9 insight empty states", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[8]?.tasks.find(
		(row) => row.taskCode === "8.9",
	);

	it("is catalogued as insight empty states", () => {
		expect(task?.title).toMatch(/Insight empty states/i);
	});

	it("shows empty state when hasPostedGifts is false", () => {
		const client = readFileSync(
			join(
				process.cwd(),
				"src/app/(root)/dashboard/development/DevelopmentDashboardClient.tsx",
			),
			"utf8",
		);
		expect(client).toMatch(/hasPostedGifts/);
		expect(client).toMatch(/No posted gifts yet/);
		expect(client).not.toMatch(/sparkline/i);
	});

	it("uses Lucide, not emoji, in empty copy", () => {
		const client = readFileSync(
			join(
				process.cwd(),
				"src/app/(root)/dashboard/development/DevelopmentDashboardClient.tsx",
			),
			"utf8",
		);
		expect(client).toMatch(/lucide-react/);
		expect(client).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
	});
});
