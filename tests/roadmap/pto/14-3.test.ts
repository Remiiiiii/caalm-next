import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 14.3 schedule_report tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/analyticsTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "schedule_report"');
	const toolBlock = source.slice(start);

	it("registers schedule_report, gated on settings.view", () => {
		expect(source).toMatch(/name:\s*"schedule_report"/);
		expect(toolBlock).toContain("PERMISSIONS.SETTINGS.VIEW");
	});

	it("ships as an honest not-available stub (2a rule) — no backend exists yet", () => {
		expect(toolBlock).toContain("available: false");
		expect(toolBlock).toMatch(/isn't available yet/);
	});
});
