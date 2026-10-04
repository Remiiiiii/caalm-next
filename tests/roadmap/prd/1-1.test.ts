import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PRD 1.1 org filter on view-all contract lists", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/rbac/data-scope.ts"),
		"utf8",
	);

	it("all_org scope always includes the workspace orgId", () => {
		expect(source).toMatch(/mode:\s*"all_org";\s*orgId:\s*string/);
		expect(source).toMatch(/case "all_org":\s*return \[[^\]]*orgFilter/);
		expect(source).toContain('Query.equal("orgId", scope.orgId)');
	});

	it("department and own scopes stay org-bound", () => {
		expect(source).toMatch(/case "department":[\s\S]*orgFilter/);
		expect(source).toMatch(/case "own":[\s\S]*orgFilter/);
		expect(source).toContain("return { mode: \"all_org\", orgId }");
	});
});
