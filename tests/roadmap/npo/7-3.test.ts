import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PERMISSION_BASED_NAV } from "@/constants/navigation-permissions";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 7.3 at-risk donor queue page", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[7]?.tasks.find(
		(row) => row.taskCode === "7.3",
	);

	it("is catalogued as at-risk queue", () => {
		expect(task?.title).toMatch(/At-risk donor queue/i);
	});

	it("exposes stewardship queue page and API", () => {
		const page = readFileSync(
			join(
				process.cwd(),
				"src/app/(root)/constituents/stewardship/page.tsx",
			),
			"utf8",
		);
		expect(page).toMatch(/Stewardship queue/);
		const queue = readFileSync(
			join(process.cwd(), "src/lib/stewardship/stewardship-queue.ts"),
			"utf8",
		);
		expect(queue).toMatch(/At-risk/);
		expect(queue).toMatch(/lapseRiskScore - a.lapseRiskScore/);
	});

	it("adds nav under Constituents", () => {
		const section = PERMISSION_BASED_NAV.find((s) => s.header === "Constituents");
		expect(
			section?.items.some((item) => item.url === "/constituents/stewardship"),
		).toBe(true);
	});
});
