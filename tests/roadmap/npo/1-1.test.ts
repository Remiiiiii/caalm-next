import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	hasNavigationPermission,
	PERMISSION_BASED_NAV,
} from "@/constants/navigation-permissions";
import { PERMISSIONS } from "@/constants/permissions";
import { permissionSatisfied } from "@/lib/rbac/permission-implications";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

const NEW_FILES = [
	"src/lib/constituents/request-context.ts",
	"src/lib/constituents/repository.ts",
	"src/app/api/constituents/route.ts",
	"src/app/api/constituents/[id]/route.ts",
	"src/app/(root)/constituents/page.tsx",
	"src/components/constituents/ConstituentsPageClient.tsx",
];

describe("NPO 1.1 constituent permission keys and nav", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[1]?.tasks.find(
		(row) => row.taskCode === "1.1",
	);

	it("catalogues VIEW and MANAGE keys", () => {
		expect(task?.title).toMatch(/permission/i);
		expect(PERMISSIONS.CONSTITUENTS.VIEW).toBe("constituents.view");
		expect(PERMISSIONS.CONSTITUENTS.MANAGE).toBe("constituents.manage");
	});

	it("lets manage satisfy view without a Super Admin name check", () => {
		expect(
			permissionSatisfied(
				[PERMISSIONS.CONSTITUENTS.MANAGE],
				PERMISSIONS.CONSTITUENTS.VIEW,
			),
		).toBe(true);
		expect(
			permissionSatisfied(
				[PERMISSIONS.CONSTITUENTS.VIEW],
				PERMISSIONS.CONSTITUENTS.MANAGE,
			),
		).toBe(false);
	});

	it("gates the sidebar item with hasNavigationPermission", () => {
		const item = PERMISSION_BASED_NAV.flatMap((section) => section.items).find(
			(row) => row.url === "/constituents",
		);
		expect(item).toBeDefined();
		expect(item?.permissions).toEqual([PERMISSIONS.CONSTITUENTS.VIEW]);
		expect(hasNavigationPermission([PERMISSIONS.CONSTITUENTS.VIEW], item!)).toBe(
			true,
		);
		expect(hasNavigationPermission([], item!)).toBe(false);
		expect(
			hasNavigationPermission([PERMISSIONS.CONSTITUENTS.MANAGE], item!),
		).toBe(true);
	});

	it("does not introduce a Super Admin role bypass in new files", () => {
		for (const relative of NEW_FILES) {
			const source = readFileSync(join(process.cwd(), relative), "utf8");
			expect(source).not.toMatch(/role\s*===\s*['"]Super Admin['"]/);
			expect(source).not.toMatch(/isSuperAdmin/);
		}
	});
});
