import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 5.2 volunteer profile fields", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[5]?.tasks.find(
		(row) => row.taskCode === "5.2",
	);

	it("is catalogued on the constituent profile", () => {
		expect(task?.title).toMatch(/Volunteer profile/i);
	});

	it("hides the volunteer tab without volunteers.view", () => {
		const profile = readFileSync(
			join(process.cwd(), "src/components/constituents/ConstituentProfile.tsx"),
			"utf8",
		);
		expect(profile).toMatch(/VOLUNTEERS\.VIEW/);
		expect(profile).toMatch(/VolunteerTab/);
	});

	it("keeps background check on coordinator-only volunteer API", () => {
		const route = readFileSync(
			join(
				process.cwd(),
				"src/app/api/constituents/[id]/volunteer/route.ts",
			),
			"utf8",
		);
		expect(route).toMatch(/backgroundCheckDate/);
		expect(route).toMatch(/VOLUNTEERS\.MANAGE/);
	});
});
