import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 6.10 run_readiness_check tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "run_readiness_check"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers run_readiness_check gated by audit.documents_view", () => {
		expect(source).toMatch(/name:\s*"run_readiness_check"/);
		expect(toolBlock).toMatch(/PERMISSIONS\.AUDIT\.DOCUMENTS_VIEW/);
	});

	it("wraps the real readiness service and is org-scoped", () => {
		expect(toolBlock).toContain("runReadinessAuditForOrg(");
		expect(toolBlock).toContain("ctx.orgId");
	});
});
