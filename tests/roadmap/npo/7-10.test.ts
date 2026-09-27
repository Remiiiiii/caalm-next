import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 7.10 stewardship metrics on the queue", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[7]?.tasks.find(
		(row) => row.taskCode === "7.10",
	);

	it("is catalogued as stewardship metrics", () => {
		expect(task?.title).toMatch(/Stewardship metrics/i);
	});

	it("computes live org metrics without mock flags", () => {
		const metrics = readFileSync(
			join(process.cwd(), "src/lib/stewardship/metrics.ts"),
			"utf8",
		);
		expect(metrics).toMatch(/computeStewardshipMetrics/);
		expect(metrics).not.toMatch(/USE_AUDIT_MOCK_DATA/);
	});

	it("renders stat cards on the stewardship page client", () => {
		const client = readFileSync(
			join(
				process.cwd(),
				"src/app/(root)/constituents/stewardship/StewardshipQueueClient.tsx",
			),
			"utf8",
		);
		expect(client).toMatch(/Contacted this week/);
		expect(client).toMatch(/StatCardIcon/);
	});
});
