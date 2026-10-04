import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	classifyRouteSource,
	getUnguardedRoutes,
	scanApiAuthzMatrix,
} from "@/lib/rbac/api-authz-matrix";

describe("PRD 2.3 protect assistant and legacy AI routes", () => {
	it("scanner treats requireAssistantAccess as a permission gate", () => {
		const classified = classifyRouteSource(
			'await requireAssistantAccess();',
			"assistant/chat",
		);
		expect(classified.detected).toBe("permission");
		expect(classified.signals).toContain("requireAssistantAccess");
	});

	it("assistant chat uses requireAssistantAccess", () => {
		const source = readFileSync(
			join(process.cwd(), "src/app/api/assistant/chat/route.ts"),
			"utf8",
		);
		expect(source).toMatch(/requireAssistantAccess/);
	});

	it("legacy AI routes call requirePermission", () => {
		for (const path of ["ai-analyze", "ai-contract-type-suggest", "extract-pdf-text"]) {
			const source = readFileSync(
				join(process.cwd(), `src/app/api/${path}/route.ts`),
				"utf8",
			);
			expect(source).toMatch(/requirePermission/);
		}
	});

	it("unguarded baseline no longer lists assistant/*", () => {
		const unguarded = getUnguardedRoutes(scanApiAuthzMatrix()).map(
			(r) => r.path,
		);
		expect(unguarded.filter((p) => p.startsWith("assistant/"))).toEqual([]);
	});
});
