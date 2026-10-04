import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ANALYTICS_WIDGET_INVENTORY } from "@/lib/analytics/widget-inventory";

describe("PRD 4.2 label or replace sample analytics widgets", () => {
	it("inventories every widget as live, sample, or mixed", () => {
		expect(ANALYTICS_WIDGET_INVENTORY.length).toBeGreaterThanOrEqual(6);
		for (const widget of ANALYTICS_WIDGET_INVENTORY) {
			expect(["live", "sample", "mixed"]).toContain(widget.source);
			expect(widget.id.length).toBeGreaterThan(2);
			expect(widget.component.length).toBeGreaterThan(2);
		}
	});

	it("marks executive and organization dashboards as live (no silent mock)", () => {
		const executive = ANALYTICS_WIDGET_INVENTORY.find(
			(w) => w.id === "executive-dashboard",
		);
		const organization = ANALYTICS_WIDGET_INVENTORY.find(
			(w) => w.id === "organization-analytics",
		);
		expect(executive?.source).toBe("live");
		expect(organization?.source).toBe("live");
	});

	it("labels unused enhanced dashboard as sample", () => {
		const enhanced = ANALYTICS_WIDGET_INVENTORY.find(
			(w) => w.id === "enhanced-analytics-dashboard",
		);
		expect(enhanced?.source).toBe("sample");
		expect(enhanced?.unused).toBe(true);

		const source = readFileSync(
			join(
				process.cwd(),
				"src/components/analytics/EnhancedAnalyticsDashboard.tsx",
			),
			"utf8",
		);
		expect(source).toMatch(/SampleDataBadge/);
	});

	it("provides a shared Sample data badge component", () => {
		const source = readFileSync(
			join(process.cwd(), "src/components/ui/sample-data-badge.tsx"),
			"utf8",
		);
		expect(source).toMatch(/Sample data/);
		expect(source).toMatch(/DEMO/);
	});
});
