import { describe, expect, it } from "vitest";
import {
	applyNpoPackagingProgressCap,
	evaluateNpoPackagingGate,
} from "@/lib/roadmap/nonprofit/npo-packaging-gate";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 10.8 Roadmap 100% gate", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[10]?.tasks.find(
		(row) => row.taskCode === "10.8",
	);

	it("is catalogued", () => {
		expect(task?.title).toMatch(/100% gate/i);
	});

	it("caps overall progress at 99% when packaging checks fail", () => {
		expect(
			applyNpoPackagingProgressCap(100, { ok: false, reason: "test" }),
		).toBe(99);
		expect(applyNpoPackagingProgressCap(100, { ok: true })).toBe(100);
		expect(applyNpoPackagingProgressCap(42, { ok: false })).toBe(42);
	});

	it("packaging gate passes in CI (10.6 + 10.7)", () => {
		expect(evaluateNpoPackagingGate().ok).toBe(true);
	});
});
