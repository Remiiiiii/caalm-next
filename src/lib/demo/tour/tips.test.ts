import { describe, expect, it } from "vitest";
import {
	getNextTip,
	getPreviousTip,
	getTipForPathname,
	getTipNavHref,
	getTipStep,
} from "./tips";

describe("getTipForPathname", () => {
	it("returns welcome tip for role dashboard homes", () => {
		const tip = getTipForPathname("/dashboard/organizationadmin", []);
		expect(tip?.id).toBe("demo-welcome");
	});

	it("skips IT dashboard for welcome tip", () => {
		const tip = getTipForPathname("/dashboard/it/system-overview", []);
		expect(tip).toBeNull();
	});

	it("matches audits and analytics routes", () => {
		expect(getTipForPathname("/audits/status", [])?.id).toBe("demo-audits");
		expect(getTipForPathname("/analytics/quick-view", [])?.id).toBe(
			"demo-analytics",
		);
	});

	it("respects seen tip ids", () => {
		expect(getTipForPathname("/contracts", ["demo-contracts"])).toBeNull();
	});

	it("returns step position and next tip in tour order", () => {
		expect(getTipStep("demo-welcome")).toEqual({ current: 1, total: 5 });
		expect(getTipStep("demo-analytics")).toEqual({ current: 5, total: 5 });
		expect(getNextTip("demo-welcome")?.id).toBe("demo-contracts");
		expect(getNextTip("demo-analytics")).toBeNull();
		expect(getPreviousTip("demo-welcome")).toBeNull();
		expect(getPreviousTip("demo-contracts")?.id).toBe("demo-welcome");
		expect(getTipNavHref(getNextTip("demo-welcome")!)).toBe("/contracts");
	});
});
