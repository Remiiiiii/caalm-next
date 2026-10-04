import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	getUnguardedRoutes,
	loadApiAuthzBaseline,
	scanApiAuthzMatrix,
} from "@/lib/rbac/api-authz-matrix";

describe("PRD 3.2 remove test-only 2FA from production", () => {
	it("test and test-totp return 404 outside development", () => {
		for (const path of ["test", "test-totp"]) {
			const source = readFileSync(
				join(process.cwd(), `src/app/api/2fa/${path}/route.ts`),
				"utf8",
			);
			expect(source).toMatch(/NODE_ENV !== ["']development["']/);
			expect(source).toMatch(/status: 404/);
		}
	});

	it("verify has no anonymous test-mode success path", () => {
		const source = readFileSync(
			join(process.cwd(), "src/app/api/2fa/verify/route.ts"),
			"utf8",
		);
		expect(source).not.toMatch(/test mode/i);
		expect(source).not.toMatch(/68682eba0038a0e0b7fd/);
		expect(source).toMatch(/requireSessionUser/);
	});

	it("baseline no longer lists 2fa test routes as unguarded gaps", () => {
		const baseline = new Set(loadApiAuthzBaseline().unguarded);
		const unguarded = new Set(
			getUnguardedRoutes(scanApiAuthzMatrix()).map((r) => r.path),
		);
		for (const path of ["2fa/test", "2fa/test-totp"]) {
			expect(baseline.has(path)).toBe(false);
			expect(unguarded.has(path)).toBe(false);
		}
	});
});
