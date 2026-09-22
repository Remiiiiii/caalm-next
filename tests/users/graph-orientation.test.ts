import { describe, expect, it } from "vitest";
import {
	parseGraphOrientation,
	isTopDownOrientation,
} from "@/lib/users/graph-orientation";

describe("parseGraphOrientation", () => {
	it("defaults to left-to-right", () => {
		expect(parseGraphOrientation(null)).toBe("ltr");
		expect(parseGraphOrientation(undefined)).toBe("ltr");
		expect(parseGraphOrientation("side")).toBe("ltr");
		expect(isTopDownOrientation("ltr")).toBe(false);
	});

	it("accepts top-down", () => {
		expect(parseGraphOrientation("tb")).toBe("tb");
		expect(isTopDownOrientation("tb")).toBe(true);
	});
});
