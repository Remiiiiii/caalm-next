import { describe, expect, it } from "vitest";
import {
	CONTENT_CROSSFADE_DURATION,
	CONTENT_CROSSFADE_ENTER_DELAY,
	contentCrossfadeExit,
	contentCrossfadeInitial,
	contentCrossfadeTransition,
} from "@/lib/ui/content-crossfade";

describe("content-crossfade", () => {
	it("is opacity-only on enter", () => {
		expect(contentCrossfadeInitial).toEqual({ opacity: 0 });
		expect("x" in contentCrossfadeInitial).toBe(false);
		expect("y" in contentCrossfadeInitial).toBe(false);
	});

	it("pins the exiting panel so old and new can overlap", () => {
		expect(contentCrossfadeExit.opacity).toBe(0);
		expect(contentCrossfadeExit.position).toBe("absolute");
		expect(CONTENT_CROSSFADE_DURATION).toBe(0.8);
		expect(CONTENT_CROSSFADE_ENTER_DELAY).toBe(0.12);
		expect(contentCrossfadeTransition.duration).toBe(0.8);
	});
});
