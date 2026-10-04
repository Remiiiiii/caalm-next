import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	getUnguardedRoutes,
	loadApiAuthzBaseline,
	scanApiAuthzMatrix,
} from "@/lib/rbac/api-authz-matrix";

describe("PRD 3.1 session-bound two-factor setup", () => {
	const routes = ["setup", "verify", "status"] as const;

	it("setup, verify, and status require a session user", () => {
		for (const path of routes) {
			const source = readFileSync(
				join(process.cwd(), `src/app/api/2fa/${path}/route.ts`),
				"utf8",
			);
			expect(source).toMatch(/requireSessionUser/);
			expect(source).toMatch(/rejectUserIdMismatch/);
		}
	});

	it("rejectUserIdMismatch blocks another user's id", () => {
		const source = readFileSync(
			join(process.cwd(), "src/lib/auth/require-session-user.ts"),
			"utf8",
		);
		expect(source).toMatch(/Cannot change two-factor settings for another user/);
		expect(source).toMatch(/status: 403/);
		expect(source).toMatch(/status: 401/);
	});

	it("2fa setup/verify/status are not on the unguarded baseline", () => {
		const unguarded = new Set(
			getUnguardedRoutes(scanApiAuthzMatrix()).map((r) => r.path),
		);
		const baseline = new Set(loadApiAuthzBaseline().unguarded);
		for (const path of ["2fa/setup", "2fa/verify", "2fa/status"]) {
			expect(unguarded.has(path)).toBe(false);
			expect(baseline.has(path)).toBe(false);
		}
	});
});
