/**
 * Documents expected permission gates on license API routes.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "src/app/api/licenses");

function routeSource(rel: string): string {
	return readFileSync(join(ROOT, rel), "utf8");
}

describe("license API permission gates", () => {
	it("list/create use VIEW and CREATE", () => {
		const src = routeSource("route.ts");
		expect(src).toContain("PERMISSIONS.LICENSES.VIEW");
		expect(src).toContain("PERMISSIONS.LICENSES.CREATE");
	});

	it("id routes use VIEW / EDIT / DELETE", () => {
		const src = routeSource("[id]/route.ts");
		expect(src).toContain("PERMISSIONS.LICENSES.VIEW");
		expect(src).toContain("PERMISSIONS.LICENSES.EDIT");
		expect(src).toContain("PERMISSIONS.LICENSES.DELETE");
	});

	it("allocate uses ALLOCATE", () => {
		expect(routeSource("[id]/allocate/route.ts")).toContain(
			"PERMISSIONS.LICENSES.ALLOCATE",
		);
	});

	it("renew uses RENEW", () => {
		expect(routeSource("[id]/renew/route.ts")).toContain(
			"PERMISSIONS.LICENSES.RENEW",
		);
	});

	it("reports/expiring/database use VIEW", () => {
		for (const rel of [
			"reports/route.ts",
			"expiring/route.ts",
			"database/route.ts",
		]) {
			expect(routeSource(rel)).toContain("PERMISSIONS.LICENSES.VIEW");
		}
	});

	it("extract-data and drafts use CREATE for mutating paths", () => {
		expect(routeSource("extract-data/route.ts")).toContain(
			"PERMISSIONS.LICENSES.CREATE",
		);
		expect(routeSource("drafts/route.ts")).toContain(
			"PERMISSIONS.LICENSES.CREATE",
		);
		expect(routeSource("drafts/fetch-file/route.ts")).toContain(
			"PERMISSIONS.LICENSES.CREATE",
		);
	});
});
