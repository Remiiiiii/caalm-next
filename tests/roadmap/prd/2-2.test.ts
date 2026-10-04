import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	getUnguardedRoutes,
	scanApiAuthzMatrix,
} from "@/lib/rbac/api-authz-matrix";

describe("PRD 2.2 protect analytics and reporting APIs", () => {
	it("unified analytics requires permission and scopes contracts by orgId", () => {
		const source = readFileSync(
			join(process.cwd(), "src/app/api/analytics/unified/route.ts"),
			"utf8",
		);
		expect(source).toMatch(/requirePermission/);
		expect(source).toMatch(/Query\.equal\(\s*["']orgId["']/);
		expect(source).toMatch(/Organization context required/);
	});

	it("calendar and admin analytics call requirePermission", () => {
		for (const path of ["calendar", "admin"]) {
			const source = readFileSync(
				join(process.cwd(), `src/app/api/analytics/${path}/route.ts`),
				"utf8",
			);
			expect(source).toMatch(/requirePermission/);
		}
	});

	it("analytics routes are not on the unguarded list", () => {
		const unguarded = getUnguardedRoutes(scanApiAuthzMatrix()).map(
			(r) => r.path,
		);
		const analyticsGaps = unguarded.filter(
			(p) => p.startsWith("analytics/") || p === "search/analytics",
		);
		expect(analyticsGaps).toEqual([]);
	});
});
