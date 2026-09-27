import { describe, expect, it } from "vitest";
import {
	graphLayoutStorageKey,
	readGraphLayoutPositions,
	writeGraphLayoutPositions,
} from "@/lib/users/graph-layout-storage";

describe("graph layout storage", () => {
	it("round-trips top-down spots in localStorage", () => {
		window.localStorage.removeItem(graphLayoutStorageKey("reporting", "tb"));
		writeGraphLayoutPositions(
			"reporting",
			"tb",
			new Map([["ceo", { x: 40, y: 80 }]]),
		);
		expect(readGraphLayoutPositions("reporting", "tb").get("ceo")).toEqual({
			x: 40,
			y: 80,
		});
	});
});
