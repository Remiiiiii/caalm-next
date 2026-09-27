import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appwriteConfig } from "@/lib/appwrite/config";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 5.3 shift template schema", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[5]?.tasks.find(
		(row) => row.taskCode === "5.3",
	);

	it("is catalogued as shift templates", () => {
		expect(task?.title).toMatch(/Shift template/i);
	});

	it("uses alphanumeric volunteer_shift_templates collection id", () => {
		expect(appwriteConfig.volunteerShiftTemplatesCollectionId).toMatch(
			/^[a-zA-Z0-9]{20,36}$/,
		);
	});

	it("gates template POST with volunteers.manage", () => {
		const route = readFileSync(
			join(
				process.cwd(),
				"src/app/api/volunteer-shift-templates/route.ts",
			),
			"utf8",
		);
		expect(route).toMatch(/VOLUNTEERS\.MANAGE/);
	});
});
