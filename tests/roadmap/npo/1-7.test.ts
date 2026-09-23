import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isSelfLink, wouldCreateCycle } from "@/lib/constituents/relationships";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 1.7 households and relationship graph", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[1]?.tasks.find(
		(row) => row.taskCode === "1.7",
	);
	const relRoute = readFileSync(
		join(process.cwd(), "src/app/api/constituents/[id]/relationships/route.ts"),
		"utf8",
	);
	const deleteRoute = readFileSync(
		join(
			process.cwd(),
			"src/app/api/constituents/[id]/relationships/[relationshipId]/route.ts",
		),
		"utf8",
	);
	const relLib = readFileSync(
		join(process.cwd(), "src/lib/constituents/relationships.ts"),
		"utf8",
	);
	const household = readFileSync(
		join(process.cwd(), "src/components/constituents/HouseholdTab.tsx"),
		"utf8",
	);
	const dialog = readFileSync(
		join(process.cwd(), "src/components/constituents/AddRelationshipDialog.tsx"),
		"utf8",
	);
	const config = readFileSync(
		join(process.cwd(), "src/lib/appwrite/config.ts"),
		"utf8",
	);

	it("is catalogued with nested schema and UI tasks", () => {
		expect(task?.title).toMatch(/household/i);
		expect(task?.children?.map((row) => row.taskCode)).toEqual([
			"1.7.a",
			"1.7.b",
		]);
	});

	it("stores directed edges and rejects self and circular links", () => {
		expect(relLib).toMatch(/fromId/);
		expect(relLib).toMatch(/toId/);
		expect(relLib).toMatch(/softCredit/);
		expect(isSelfLink("a", "a")).toBe(true);
		expect(isSelfLink("a", "b")).toBe(false);
		expect(
			wouldCreateCycle("a", "b", [{ fromId: "b", toId: "a" }]),
		).toBe(true);
		expect(
			wouldCreateCycle("a", "b", [{ fromId: "c", toId: "d" }]),
		).toBe(false);
		expect(relRoute).toMatch(/status:\s*400/);
		expect(relRoute).toMatch(/PERMISSIONS\.CONSTITUENTS\.MANAGE/);
	});

	it("uses an alphanumeric relationships table and demo config key", () => {
		expect(config).toMatch(/69c8e8a1001f4e8c2a10/);
		expect(config).toMatch(/constituentRelationshipsCollectionId/);
		expect(relRoute).toMatch(/orgId:\s*ctx\.orgId/);
	});

	it("renders household UI with CAALM dialog and audited delete", () => {
		expect(household).toMatch(/Add relationship/);
		expect(household).toMatch(/dots\.svg/);
		expect(household).toMatch(/DropdownMenuSeparator/);
		expect(household).toMatch(/tone="danger"/);
		expect(dialog).toMatch(/bg-\[#d6d7d8\]/);
		expect(dialog).toMatch(/from-blue-50 to-indigo-50/);
		expect(deleteRoute).toMatch(/logConstituentAudit/);
		expect(deleteRoute).toMatch(/action:\s*"delete"/);
	});
});
