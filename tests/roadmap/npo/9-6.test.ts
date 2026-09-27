import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DONATION_MIN_CENTS } from "@/lib/stripe/donations";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 9.6 Give page UI", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[9]?.tasks.find(
		(row) => row.taskCode === "9.6",
	);

	it("is catalogued as Give page UI", () => {
		expect(task?.title).toMatch(/Give page UI/i);
	});

	it("public give page is a client page without auth guards", () => {
		const page = readFileSync(
			join(process.cwd(), "src/app/give/[orgSlug]/page.tsx"),
			"utf8",
		);
		expect(page).toMatch(/PublicGivePage/);
		expect(page).not.toMatch(/requirePagePermission/);
		expect(page).not.toMatch(/getLoggedInUser/);
	});

	it("validates minimum donation before checkout", () => {
		const page = readFileSync(
			join(process.cwd(), "src/app/give/[orgSlug]/page.tsx"),
			"utf8",
		);
		expect(page).toMatch(/DONATION_MIN_CENTS/);
		expect(page).toMatch(/Minimum gift is \$1\.00/);
		expect(page).toMatch(/amountError/);
		expect(DONATION_MIN_CENTS).toBeGreaterThanOrEqual(100);
	});

	it("supports optional designation and org branding", () => {
		const page = readFileSync(
			join(process.cwd(), "src/app/give/[orgSlug]/page.tsx"),
			"utf8",
		);
		expect(page).toMatch(/designationId/);
		expect(page).toMatch(/logoUrl/);
		const orgRoute = readFileSync(
			join(process.cwd(), "src/app/api/give/org/[orgSlug]/route.ts"),
			"utf8",
		);
		expect(orgRoute).toMatch(/designations/);
		expect(orgRoute).toMatch(/logoUrl/);
	});
});
