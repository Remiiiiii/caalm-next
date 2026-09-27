import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";
import { PERMISSION_BASED_NAV } from "@/constants/navigation-permissions";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 5.1 volunteer permission keys", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[5]?.tasks.find(
		(row) => row.taskCode === "5.1",
	);

	it("is catalogued as volunteer permissions", () => {
		expect(task?.title).toMatch(/Volunteer permission/i);
	});

	it("defines volunteers.view and volunteers.manage", () => {
		expect(PERMISSIONS.VOLUNTEERS.VIEW).toBe("volunteers.view");
		expect(PERMISSIONS.VOLUNTEERS.MANAGE).toBe("volunteers.manage");
	});

	it("does not grant volunteers.view via constituents.view nav", () => {
		const constituents = PERMISSION_BASED_NAV.find(
			(s) => s.header === "Constituents",
		);
		const volunteers = PERMISSION_BASED_NAV.find(
			(s) => s.header === "Volunteers",
		);
		expect(constituents?.items.some((i) => i.url === "/constituents")).toBe(
			true,
		);
		expect(
			constituents?.items.every(
				(i) => !i.permissions.includes(PERMISSIONS.VOLUNTEERS.VIEW),
			),
		).toBe(true);
		expect(
			volunteers?.items.some((i) =>
				i.permissions.includes(PERMISSIONS.VOLUNTEERS.VIEW),
			),
		).toBe(true);
	});
});
