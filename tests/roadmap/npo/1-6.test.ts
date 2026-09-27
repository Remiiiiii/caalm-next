import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 1.6 constituent profile", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[1]?.tasks.find(
		(row) => row.taskCode === "1.6",
	);
	const page = readFileSync(
		join(process.cwd(), "src/app/(root)/constituents/[id]/page.tsx"),
		"utf8",
	);
	const profile = readFileSync(
		join(process.cwd(), "src/components/constituents/ConstituentProfile.tsx"),
		"utf8",
	);
	const timelineTab = readFileSync(
		join(process.cwd(), "src/components/constituents/TimelineTab.tsx"),
		"utf8",
	);
	const householdTab = readFileSync(
		join(process.cwd(), "src/components/constituents/HouseholdTab.tsx"),
		"utf8",
	);
	const display = readFileSync(
		join(process.cwd(), "src/lib/constituents/display.ts"),
		"utf8",
	);
	const idRoute = readFileSync(
		join(process.cwd(), "src/app/api/constituents/[id]/route.ts"),
		"utf8",
	);

	it("is catalogued as the constituent profile", () => {
		expect(task?.title).toMatch(/profile/i);
	});

	it("guards the route and 404s another org's id", () => {
		expect(page).toMatch(/requirePagePermission/);
		expect(page).toMatch(/PERMISSIONS\.CONSTITUENTS\.VIEW/);
		expect(page).toMatch(/notFound\(\)/);
		expect(page).toMatch(/constituent\.orgId !== org\.orgId/);
		expect(idRoute).toMatch(/existing\.orgId !== orgId/);
		expect(idRoute).toMatch(/status:\s*404/);
	});

	it("uses CAALM type badges and the danger do-not-contact badge", () => {
		expect(display).toMatch(/bg-red\/10 text-red border-red\/20/);
		expect(profile).toMatch(/CONSTITUENT_DNC_BADGE_CLASS/);
		expect(profile).toMatch(/Do not contact/);
		expect(profile).toMatch(/constituentTypeBadgeClass/);
	});

	it("renders later tabs as empty states without fake data", () => {
		expect(profile).toMatch(/Timeline/);
		expect(profile).toMatch(/Household/);
		expect(profile).toMatch(/Volunteer/);
		expect(profile).toMatch(/Intelligence/);
		expect(timelineTab).toMatch(/No timeline yet/);
		expect(householdTab).toMatch(/No household yet/);
		expect(profile).toMatch(/No volunteer record yet/);
		expect(`${profile}${timelineTab}${householdTab}`).not.toMatch(
			/Jane Doe|Acme Gala|\$1,000|mock score/i,
		);
	});
});
