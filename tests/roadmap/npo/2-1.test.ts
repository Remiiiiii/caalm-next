import { describe, expect, it } from "vitest";
import {
	hasNavigationPermission,
	PERMISSION_BASED_NAV,
} from "@/constants/navigation-permissions";
import { PERMISSIONS } from "@/constants/permissions";
import { permissionSatisfied } from "@/lib/rbac/permission-implications";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 2.1 gift permission keys", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[2]?.tasks.find(
		(row) => row.taskCode === "2.1",
	);

	it("catalogues gift permission keys", () => {
		expect(task?.title).toMatch(/permission/i);
		expect(PERMISSIONS.GIFTS.VIEW).toBe("gifts.view");
		expect(PERMISSIONS.GIFTS.CREATE).toBe("gifts.create");
		expect(PERMISSIONS.GIFTS.VOID).toBe("gifts.void");
	});

	it("keeps void separate from create", () => {
		expect(
			permissionSatisfied([PERMISSIONS.GIFTS.CREATE], PERMISSIONS.GIFTS.VOID),
		).toBe(false);
		expect(
			permissionSatisfied([PERMISSIONS.GIFTS.VOID], PERMISSIONS.GIFTS.VIEW),
		).toBe(true);
	});

	it("gates gifts nav with gifts.view", () => {
		const item = PERMISSION_BASED_NAV.flatMap((s) => s.items).find(
			(row) => row.url === "/gifts",
		);
		expect(item?.permissions).toEqual([PERMISSIONS.GIFTS.VIEW]);
		expect(hasNavigationPermission([PERMISSIONS.GIFTS.VIEW], item!)).toBe(true);
	});
});
