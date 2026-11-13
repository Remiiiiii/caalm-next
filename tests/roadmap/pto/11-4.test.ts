import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 11.4 get_system_health tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/itTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "get_system_health"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers get_system_health and is read-only, gated by it.view_monitoring", () => {
		expect(source).toMatch(/name:\s*"get_system_health"/);
		expect(toolBlock).toMatch(/mutating:\s*false/);
		expect(toolBlock).toContain("PERMISSIONS.IT.VIEW_MONITORING");
	});

	it("wraps buildOrgITSnapshot and never exposes force-delete, schema, or API-key tools", () => {
		expect(toolBlock).toContain("buildOrgITSnapshot(ctx.orgId)");
		expect(source).not.toMatch(/force.?delete/i);
		expect(source).not.toMatch(/manage.?schema/i);
		expect(source).not.toContain("MANAGE_API_KEYS");
		expect(source).not.toContain("MANAGE_DATABASE");
	});
});
