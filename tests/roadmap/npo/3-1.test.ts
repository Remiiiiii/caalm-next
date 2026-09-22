import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";
import { permissionSatisfied } from "@/lib/rbac/permission-implications";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 3.1 ai.fundraising permission", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[3]?.tasks.find(
		(row) => row.taskCode === "3.1",
	);

	it("catalogues ai.fundraising", () => {
		expect(task?.title).toMatch(/ai\.fundraising/i);
		expect(PERMISSIONS.AI.FUNDRAISING).toBe("ai.fundraising");
	});

	it("does not imply ai.fundraising from constituents.view", () => {
		expect(
			permissionSatisfied(
				[PERMISSIONS.CONSTITUENTS.VIEW],
				PERMISSIONS.AI.FUNDRAISING,
			),
		).toBe(false);
	});
});
