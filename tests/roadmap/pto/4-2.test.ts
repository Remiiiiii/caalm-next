import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 4.2 approve_request tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/approvalTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "approve_request"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers approve_request and is mutating", () => {
		expect(source).toMatch(/name:\s*"approve_request"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});

	it("checks the approve permission per resourceType, real assignee state, and audits", () => {
		expect(toolBlock).toContain("approvePermissionFor(resourceType)");
		expect(toolBlock).toContain("canDecideAsAssignee");
		expect(toolBlock).toMatch(/action:\s*"approval_decided"/);
	});
});
