import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	getUnguardedRoutes,
	loadApiAuthzBaseline,
	scanApiAuthzMatrix,
} from "@/lib/rbac/api-authz-matrix";

describe("PRD 2.1 protect file upload and download", () => {
	const fileRoutes = [
		"files/upload",
		"files/download",
		"files/get-by-ids",
	] as const;

	it("file upload and download call requirePermission", () => {
		for (const path of ["upload", "download", "get-by-ids"]) {
			const source = readFileSync(
				join(process.cwd(), `src/app/api/files/${path}/route.ts`),
				"utf8",
			);
			expect(source).toMatch(/requirePermission/);
		}
	});

	it("share-by-id route still requires an authenticated user", () => {
		const source = readFileSync(
			join(process.cwd(), "src/app/api/files/shared/[fileId]/route.ts"),
			"utf8",
		);
		expect(source).toMatch(/getCurrentUser/);
	});

	it("baseline no longer lists the primary file routes", () => {
		const unguarded = new Set(
			getUnguardedRoutes(scanApiAuthzMatrix()).map((r) => r.path),
		);
		const baseline = new Set(loadApiAuthzBaseline().unguarded);
		for (const path of fileRoutes) {
			expect(unguarded.has(path)).toBe(false);
			expect(baseline.has(path)).toBe(false);
		}
	});
});
