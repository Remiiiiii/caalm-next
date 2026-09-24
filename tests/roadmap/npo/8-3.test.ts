import { describe, expect, it } from "vitest";
import {
	computeDonorMetrics,
	formatRetentionPercent,
} from "@/lib/development";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 8.3 donor count, retention, new-donor cards", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[8]?.tasks.find(
		(row) => row.taskCode === "8.3",
	);

	it("is catalogued as donor metrics cards", () => {
		expect(task?.title).toMatch(/Donor count, retention/i);
	});

	it("computes retention as retained / prior-year donors", () => {
		const metrics = computeDonorMetrics(
			[
				{ constituentId: "a", amount: 10, giftDate: "2025-01-01" },
				{ constituentId: "a", amount: 10, giftDate: "2026-02-01" },
				{ constituentId: "b", amount: 10, giftDate: "2025-06-01" },
				{ constituentId: "c", amount: 10, giftDate: "2026-03-01" },
			],
			2026,
		);
		expect(metrics.uniqueDonorsYtd).toBe(2);
		expect(metrics.retentionRate).toBe(0.5);
		expect(metrics.newDonorsYtd).toBe(1);
	});

	it("shows em dash when no prior-year donors", () => {
		const metrics = computeDonorMetrics(
			[{ constituentId: "a", amount: 10, giftDate: "2026-01-01" }],
			2026,
		);
		expect(metrics.retentionRate).toBeNull();
		expect(formatRetentionPercent(metrics.retentionRate)).toBe("—");
	});
});
