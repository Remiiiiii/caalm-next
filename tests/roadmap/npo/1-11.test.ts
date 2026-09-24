import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	buildConstituentPiiViewEntry,
	CONSTITUENT_PII_VIEW_ACTION,
} from "@/lib/constituents/audit";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 1.11 PII access audit on profiles", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[1]?.tasks.find(
		(row) => row.taskCode === "1.11",
	);
	const idRoute = readFileSync(
		join(process.cwd(), "src/app/api/constituents/[id]/route.ts"),
		"utf8",
	);
	const listRoute = readFileSync(
		join(process.cwd(), "src/app/api/constituents/route.ts"),
		"utf8",
	);
	const page = readFileSync(
		join(process.cwd(), "src/app/(root)/constituents/[id]/page.tsx"),
		"utf8",
	);
	const audit = readFileSync(
		join(process.cwd(), "src/lib/constituents/audit.ts"),
		"utf8",
	);

	it("is catalogued as a profile PII access audit", () => {
		expect(task?.title).toMatch(/PII access audit/i);
		expect(task?.testSuiteRef).toBe("tests/roadmap/npo/1-11.test.ts");
	});

	it("writes view_pii from the profile GET and page, not the list search", () => {
		expect(idRoute).toMatch(/export async function GET/);
		expect(idRoute).toMatch(/logConstituentPiiView/);
		expect(page).toMatch(/logConstituentPiiView/);
		expect(listRoute).not.toMatch(/logConstituentPiiView/);
		expect(listRoute).not.toMatch(/view_pii/);
	});

	it("does not log PII views for missing or merged records", () => {
		const getFn = idRoute.slice(idRoute.indexOf("export async function GET"));
		const logIndex = getFn.indexOf("logConstituentPiiView");
		const notFoundIndex = getFn.indexOf("status: 404");
		const mergedIndex = getFn.indexOf("status: 410");
		expect(logIndex).toBeGreaterThan(notFoundIndex);
		expect(logIndex).toBeGreaterThan(mergedIndex);
	});

	it("audits resource id + actor + view_pii without donor field values", () => {
		expect(audit).toMatch(/CONSTITUENT_PII_VIEW_ACTION/);
		expect(audit).toMatch(/action: CONSTITUENT_PII_VIEW_ACTION/);
		expect(audit).not.toMatch(
			/input\.email|constituent\.email|constituent\.phone/,
		);

		const donorEmail = "donor.secret@example.com";
		const donorPhone = "555-0199";
		const entry = buildConstituentPiiViewEntry({
			actor: {
				userId: "staff-1",
				userName: "Ada Admin",
				userEmail: "ada@caalm.example",
			},
			orgId: "org-1",
			constituentId: "const-42",
		});
		const serialized = JSON.stringify(entry);

		expect(entry.action).toBe(CONSTITUENT_PII_VIEW_ACTION);
		expect(entry.target_id).toBe("const-42");
		expect(entry.user_id).toBe("staff-1");
		expect(serialized).not.toContain(donorEmail);
		expect(serialized).not.toContain(donorPhone);
		expect(serialized).not.toMatch(/"email"\s*:/);
		expect(serialized).not.toMatch(/"phone"\s*:/);
	});

	it("does not introduce a Super Admin role bypass", () => {
		expect(idRoute).not.toMatch(/role\s*===\s*['"]Super Admin['"]/);
		expect(idRoute).not.toMatch(/isSuperAdmin/);
		expect(page).not.toMatch(/role\s*===\s*['"]Super Admin['"]/);
	});
});
