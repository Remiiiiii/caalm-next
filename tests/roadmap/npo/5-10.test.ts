import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 5.10 volunteer hour letter export", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[5]?.tasks.find(
		(row) => row.taskCode === "5.10",
	);

	it("is catalogued as hour letter export", () => {
		expect(task?.title).toMatch(/Volunteer hour letter export/i);
	});

	it("exports approved hours only for org-scoped constituent", () => {
		const route = readFileSync(
			join(
				process.cwd(),
				"src/app/api/constituents/[id]/volunteer/hours/export/route.ts",
			),
			"utf8",
		);
		expect(route).toMatch(/listApprovedHoursForVolunteer/);
		expect(route).toMatch(/constituent\.orgId !== ctx\.orgId/);
	});

	it("offers CSV and PDF export from volunteer tab", () => {
		const tab = readFileSync(
			join(process.cwd(), "src/components/constituents/VolunteerTab.tsx"),
			"utf8",
		);
		expect(tab).toMatch(/format=csv/);
		expect(tab).toMatch(/format=pdf/);
	});
});
