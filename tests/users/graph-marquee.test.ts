import { describe, expect, it } from "vitest";
import { nodeHitsMarquee, rectsOverlap } from "@/lib/users/graph-marquee";

describe("graph marquee", () => {
	it("treats overlapping boxes as a hit", () => {
		expect(
			rectsOverlap(
				{ x: 0, y: 0, width: 80, height: 80 },
				{ x: 40, y: 40, width: 80, height: 80 },
			),
		).toBe(true);
	});

	it("misses when the box only touches a gap", () => {
		expect(
			rectsOverlap(
				{ x: 0, y: 0, width: 40, height: 40 },
				{ x: 41, y: 0, width: 40, height: 40 },
			),
		).toBe(false);
	});

	it("uses measured size when picking nodes inside the box", () => {
		expect(
			nodeHitsMarquee(
				{ position: { x: 100, y: 80 }, measured: { width: 50, height: 40 } },
				{ x: 120, y: 90, width: 20, height: 20 },
				252,
				176,
			),
		).toBe(true);
	});
});
