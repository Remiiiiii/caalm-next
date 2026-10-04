import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	classifyRouteSource,
	getUnguardedRoutes,
	scanApiAuthzMatrix,
} from "@/lib/rbac/api-authz-matrix";

describe("PRD 4.3 unified analytics API honesty", () => {
	const unifiedSource = readFileSync(
		join(process.cwd(), "src/app/api/analytics/unified/route.ts"),
		"utf8",
	);

	it("requires permission and org scope", () => {
		expect(unifiedSource).toMatch(/requirePermission/);
		expect(unifiedSource).toMatch(/Query\.equal\(\s*["']orgId["']/);
		expect(unifiedSource).toMatch(/Organization context required/);
	});

	it("is not on the unguarded authz list", () => {
		const classified = classifyRouteSource(unifiedSource, "analytics/unified");
		expect(classified.detected).toBe("permission");
		const unguarded = getUnguardedRoutes(scanApiAuthzMatrix()).map(
			(r) => r.path,
		);
		expect(unguarded).not.toContain("analytics/unified");
	});

	it("customer analytics UI calls unified only through the shared hook", () => {
		const page = readFileSync(
			join(process.cwd(), "src/app/(root)/analytics/page.tsx"),
			"utf8",
		);
		const hook = readFileSync(
			join(process.cwd(), "src/hooks/useUnifiedAnalyticsData.ts"),
			"utf8",
		);
		expect(page).toMatch(/useUnifiedAnalyticsData/);
		expect(hook).toMatch(/\/api\/analytics\/unified/);
	});
});
