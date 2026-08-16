import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";
import { isITSidebarPath } from "@/constants/it-navigation";
import {
	canAccessITPortal,
	resolveAccessibleDashboardLinks,
} from "@/lib/navigation/dashboard-links";
import { isITDepartment } from "@/lib/rbac/it-department";

describe("isITDepartment", () => {
	it("matches department or departmentLabel case-insensitively", () => {
		expect(isITDepartment({ department: "IT" })).toBe(true);
		expect(isITDepartment({ departmentLabel: "it" })).toBe(true);
		expect(isITDepartment({ department: "Administration" })).toBe(false);
		expect(isITDepartment({})).toBe(false);
	});
});

describe("canAccessITPortal", () => {
	it("requires IT department and monitoring permission", () => {
		expect(
			canAccessITPortal([PERMISSIONS.IT.VIEW_MONITORING], {
				department: "IT",
			}),
		).toBe(true);
		expect(
			canAccessITPortal([PERMISSIONS.IT.VIEW_MONITORING], {
				department: "Administration",
			}),
		).toBe(false);
		expect(canAccessITPortal([], { department: "IT" })).toBe(false);
	});
});

describe("resolveAccessibleDashboardLinks IT entry", () => {
	it("hides IT for org admins outside IT department", () => {
		const links = resolveAccessibleDashboardLinks(
			[PERMISSIONS.IT.VIEW_MONITORING, PERMISSIONS.USERS.VIEW],
			["Organization Admin"],
			{ department: "Administration" },
		);
		expect(links.some((l) => l.url === "/dashboard/it")).toBe(false);
	});

	it("shows IT for users in IT department with monitoring permission", () => {
		const links = resolveAccessibleDashboardLinks(
			[PERMISSIONS.IT.VIEW_MONITORING],
			["Super Admin"],
			{ department: "IT" },
		);
		expect(links.some((l) => l.url === "/dashboard/it")).toBe(true);
	});
});

describe("isITSidebarPath", () => {
	it("keeps IT chrome on ticket pages linked from the IT sidebar", () => {
		expect(isITSidebarPath("/dashboard/it")).toBe(true);
		expect(isITSidebarPath("/dashboard/it/status")).toBe(true);
		expect(isITSidebarPath("/dashboard/it/issuehistory")).toBe(true);
		expect(isITSidebarPath("/tickets")).toBe(true);
		expect(isITSidebarPath("/tickets/new")).toBe(true);
		expect(isITSidebarPath("/tickets/abc123")).toBe(true);
		expect(isITSidebarPath("/incident/abc")).toBe(true);
	});

	it("does not treat other dashboards as IT chrome", () => {
		expect(isITSidebarPath("/dashboard/superadmin")).toBe(false);
		expect(isITSidebarPath("/licenses")).toBe(false);
	});
});
