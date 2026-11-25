import { describe, expect, it } from "vitest";
import { hasVisibleDarkSurface } from "@/hooks/useDarkSurfaceBehind";

const VIEWPORT = { width: 1024, height: 768 };

describe("hasVisibleDarkSurface", () => {
	it("is false with no dark surfaces", () => {
		expect(hasVisibleDarkSurface([], VIEWPORT)).toBe(false);
	});

	it("is true when a dark surface rect is inside the viewport", () => {
		const rect = { top: 100, left: 100, right: 400, bottom: 400 };
		expect(hasVisibleDarkSurface([rect], VIEWPORT)).toBe(true);
	});

	it("is false when the only dark surface is fully scrolled out of view", () => {
		const belowViewport = { top: 900, left: 0, right: 200, bottom: 1100 };
		expect(hasVisibleDarkSurface([belowViewport], VIEWPORT)).toBe(false);
	});

	it("is true when at least one of several rects is visible", () => {
		const offscreen = { top: -500, left: 0, right: 200, bottom: -100 };
		const onscreen = { top: 10, left: 10, right: 50, bottom: 50 };
		expect(hasVisibleDarkSurface([offscreen, onscreen], VIEWPORT)).toBe(true);
	});
});
