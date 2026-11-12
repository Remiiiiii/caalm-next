import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 8.4 share_donation_page tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/constituentTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "share_donation_page"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers share_donation_page", () => {
		expect(source).toMatch(/name:\s*"share_donation_page"/);
	});

	it("shares under donations.config.view, updates/publishes under donations.config.edit, and audits writes", () => {
		expect(toolBlock).toMatch(/PERMISSIONS\.DONATIONS\.CONFIG_VIEW/);
		expect(toolBlock).toMatch(/PERMISSIONS\.DONATIONS\.CONFIG_EDIT/);
		expect(toolBlock).toContain("getOrCreateDraft(");
		expect(toolBlock).toContain("updateDraft(");
		expect(toolBlock).toContain("service.publish(");
		expect(toolBlock).toContain("auditNonprofit(");
	});
});
