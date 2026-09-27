import { describe, expect, it } from "vitest";
import {
	clientDragToFlowRect,
	isTinyMarquee,
	nodeHitsMarquee,
	pointInRect,
	rectsOverlap,
	SELECTION_FRAME_PAD,
	selectionBounds,
} from "@/lib/users/graph-marquee";

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

	it("keeps a click inside the drawn box, and misses a click just outside", () => {
		const box = { x: 10, y: 20, width: 100, height: 80 };
		expect(pointInRect({ x: 10, y: 20 }, box)).toBe(true);
		expect(pointInRect({ x: 110, y: 100 }, box)).toBe(true);
		expect(pointInRect({ x: 111, y: 60 }, box)).toBe(false);
	});

	it("ignores a tiny right-click that was not a real drag", () => {
		expect(isTinyMarquee({ x: 0, y: 0, width: 4, height: 4 })).toBe(true);
		expect(isTinyMarquee({ x: 0, y: 0, width: 40, height: 4 })).toBe(false);
	});

	it("builds a flow-space box from two drag corners", () => {
		expect(
			clientDragToFlowRect({ x: 80, y: 40 }, { x: 20, y: 10 }),
		).toEqual({ x: 20, y: 10, width: 60, height: 30 });
	});

	it("snaps the frame to every selected card plus padding", () => {
		expect(
			selectionBounds(
				[
					{
						selected: true,
						position: { x: 0, y: 0 },
						measured: { width: 100, height: 50 },
					},
					{
						selected: true,
						position: { x: 200, y: 80 },
						measured: { width: 100, height: 50 },
					},
					{ selected: false, position: { x: 900, y: 900 } },
				],
				252,
				176,
			),
		).toEqual({
			x: -SELECTION_FRAME_PAD,
			y: -SELECTION_FRAME_PAD,
			width: 300 + SELECTION_FRAME_PAD * 2,
			height: 130 + SELECTION_FRAME_PAD * 2,
		});
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
