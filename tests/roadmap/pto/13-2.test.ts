import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 13.2 list_notifications tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/newsTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "list_notifications"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers list_notifications, scoped to the caller", () => {
		expect(source).toMatch(/name:\s*"list_notifications"/);
		expect(toolBlock).toContain("ctx.user.$id");
		expect(toolBlock).toContain("PERMISSIONS.AI.CHAT");
	});

	it("marking one read verifies ownership before calling markAsRead", () => {
		expect(toolBlock).toContain("markAsRead(");
		expect(toolBlock).toContain("owned.data.find(");
		expect(toolBlock).toMatch(/couldn't find a notification/i);
	});
});
