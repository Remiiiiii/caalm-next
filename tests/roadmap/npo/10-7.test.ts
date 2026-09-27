import { describe, expect, it } from "vitest";
import {
	findMissingNpoShippedRouteModules,
	NPO_CLAIMED_SHIPPED_ROUTES,
} from "@/lib/roadmap/nonprofit/npo-shipped-routes";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 10.7 Pricing and docs match shipped routes", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[10]?.tasks.find(
		(row) => row.taskCode === "10.7",
	);

	it("is catalogued", () => {
		expect(task?.title).toMatch(/shipped routes/i);
	});

	it("lists core constituent and fundraising routes", () => {
		const paths = new Set(NPO_CLAIMED_SHIPPED_ROUTES.map((r) => r.pathname));
		expect(paths.has("/constituents")).toBe(true);
		expect(paths.has("/gifts")).toBe(true);
		expect(paths.has("/campaigns")).toBe(true);
	});

	it("every claimed route resolves to a page module", () => {
		expect(findMissingNpoShippedRouteModules()).toEqual([]);
	});
});
