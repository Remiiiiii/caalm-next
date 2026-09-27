import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 1.3 org-scoped constituent APIs", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[1]?.tasks.find(
		(row) => row.taskCode === "1.3",
	);
	const listRoute = readFileSync(
		join(process.cwd(), "src/app/api/constituents/route.ts"),
		"utf8",
	);
	const idRoute = readFileSync(
		join(process.cwd(), "src/app/api/constituents/[id]/route.ts"),
		"utf8",
	);

	it("is catalogued as org-scoped APIs", () => {
		expect(task?.title).toMatch(/org-scoped/i);
	});

	it("gates list and write methods with requireConstituentOrgContext", () => {
		expect(listRoute).toMatch(/requireConstituentOrgContext/);
		expect(listRoute).toMatch(/PERMISSIONS\.CONSTITUENTS\.VIEW/);
		expect(listRoute).toMatch(/PERMISSIONS\.CONSTITUENTS\.MANAGE/);
		expect(idRoute).toMatch(/requireConstituentOrgContext/);
	});

	it("stamps orgId from session context, not the request body", () => {
		expect(listRoute).toMatch(/orgId:\s*ctx\.orgId/);
		expect(listRoute).not.toMatch(/orgId:\s*body\.orgId/);
		expect(idRoute).toMatch(/existing\.orgId !== orgId/);
		expect(idRoute).toMatch(/loadOwnedConstituent\(id,\s*ctx\.orgId\)/);
		expect(idRoute).toMatch(/status:\s*404/);
	});
});
