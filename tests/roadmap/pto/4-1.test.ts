import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 4.1 get_approval tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/approvalTools.ts"),
		"utf8",
	);
	const registry = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/registry.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "get_approval"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers get_approval and wires APPROVAL_TOOLS into the registry", () => {
		expect(source).toMatch(/name:\s*"get_approval"/);
		expect(registry).toContain("...APPROVAL_TOOLS");
	});

	it("is read-only, checks view permission per resourceType, and is org-scoped", () => {
		expect(toolBlock).toMatch(/mutating:\s*false/);
		expect(toolBlock).toContain("viewPermissionFor(resourceType)");
		expect(toolBlock).toContain("resolveApprovalTarget(");
	});
});
