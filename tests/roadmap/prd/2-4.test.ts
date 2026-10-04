import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	getUnguardedRoutes,
	scanApiAuthzMatrix,
} from "@/lib/rbac/api-authz-matrix";

describe("PRD 2.4 retire duplicate contract pipeline routes", () => {
	it("blessed extract-data path requires permission", () => {
		const source = readFileSync(
			join(process.cwd(), "src/app/api/contracts/extract-data/route.ts"),
			"utf8",
		);
		expect(source).toMatch(/requirePermission/);
	});

	it("draft delete/mark helpers require owner auth", () => {
		for (const path of [
			"contracts/drafts/delete-by-contract",
			"contracts/drafts/mark-completed",
			"v1/contracts/drafts/delete-by-contract",
			"v1/contracts/drafts/mark-completed",
		]) {
			const source = readFileSync(
				join(process.cwd(), `src/app/api/${path}/route.ts`),
				"utf8",
			);
			expect(source).toMatch(/requireAuthAndOwner/);
		}
	});

	it("v1 expiry helpers use cron secret; database/get-details use permission", () => {
		for (const path of [
			"v1/contracts/check-expirations",
			"v1/contracts/check-expiry",
		]) {
			const source = readFileSync(
				join(process.cwd(), `src/app/api/${path}/route.ts`),
				"utf8",
			);
			expect(source).toMatch(/isAuthorizedCron/);
		}
		for (const path of ["v1/contracts/database", "v1/contracts/get-details"]) {
			const source = readFileSync(
				join(process.cwd(), `src/app/api/${path}/route.ts`),
				"utf8",
			);
			expect(source).toMatch(/requirePermission/);
		}
	});

	it("no production pipeline duplicates remain unguarded", () => {
		const unguarded = getUnguardedRoutes(scanApiAuthzMatrix()).map(
			(r) => r.path,
		);
		const gaps = unguarded.filter(
			(p) =>
				p.startsWith("v1/contracts") ||
				p.startsWith("contracts/drafts") ||
				p === "contracts/extract-data",
		);
		expect(gaps).toEqual([]);
	});
});
