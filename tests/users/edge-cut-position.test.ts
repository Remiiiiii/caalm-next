import { describe, expect, it } from "vitest";
import {
	closestPointOnCubicBezier,
	cutPositionAlongEdge,
	parseCubicBezierPath,
} from "@/lib/users/edge-cut-position";

const HORIZONTAL: ReturnType<typeof parseCubicBezierPath> = {
	p0: { x: 10, y: 40 },
	p1: { x: 50, y: 40 },
	p2: { x: 140, y: 40 },
	p3: { x: 180, y: 40 },
};

describe("edge-cut-position", () => {
	it("parses React Flow cubic path strings", () => {
		expect(parseCubicBezierPath("M10,40 C50,40 140,40 180,40")).toEqual(
			HORIZONTAL,
		);
		expect(
			parseCubicBezierPath("M 10 40 C 50 40 140 40 180 40"),
		).toEqual(HORIZONTAL);
	});

	it("snaps a pointer onto the curve instead of leaving it off the line", () => {
		const onLine = closestPointOnCubicBezier({ x: 80, y: 40 }, HORIZONTAL!);
		expect(onLine.x).toBeCloseTo(80, 0);
		expect(onLine.y).toBeCloseTo(40, 5);

		const offLine = closestPointOnCubicBezier({ x: 80, y: 90 }, HORIZONTAL!);
		expect(offLine.x).toBeCloseTo(80, 0);
		expect(offLine.y).toBeCloseTo(40, 5);
	});

	it("follows the pointer along different parts of the same edge", () => {
		const nearSource = cutPositionAlongEdge(
			"M10,40C50,40 140,40 180,40",
			{ x: 24, y: 38 },
			{ x: 95, y: 40 },
		);
		const nearTarget = cutPositionAlongEdge(
			"M10,40C50,40 140,40 180,40",
			{ x: 168, y: 44 },
			{ x: 95, y: 40 },
		);
		expect(nearSource.x).toBeLessThan(60);
		expect(nearTarget.x).toBeGreaterThan(140);
	});
});
