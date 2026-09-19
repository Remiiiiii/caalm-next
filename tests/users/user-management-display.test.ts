import { describe, expect, it } from "vitest";
import {
	USER_MANAGEMENT_PAGE_SIZE,
	hasAssignedRole,
	pageSlice,
	userRoleBadgeClass,
} from "@/lib/users/user-management-display";

describe("user management table helpers", () => {
	it("treats blank and placeholder roles as unassigned", () => {
		expect(hasAssignedRole("Executive")).toBe(true);
		expect(hasAssignedRole("")).toBe(false);
		expect(hasAssignedRole("   ")).toBe(false);
		expect(hasAssignedRole(undefined)).toBe(false);
		expect(hasAssignedRole("Unassigned")).toBe(false);
		expect(hasAssignedRole("N/A")).toBe(false);
	});

	it("gives known roles stable badge colors", () => {
		expect(userRoleBadgeClass("Super Admin")).toContain("text-navy");
		expect(userRoleBadgeClass("Viewer")).toContain("text-purple-600");
		expect(userRoleBadgeClass("Department Manager")).toContain("text-green");
		expect(userRoleBadgeClass("Unassigned")).toContain("text-orange");
		expect(userRoleBadgeClass("Custom Analyst")).toBe(
			userRoleBadgeClass("Custom Analyst"),
		);
		expect(userRoleBadgeClass("Custom Analyst")).not.toBe(
			userRoleBadgeClass("Viewer"),
		);
	});

	it("pages 12 users at a time", () => {
		const users = Array.from({ length: 25 }, (_, index) => `user-${index}`);
		expect(USER_MANAGEMENT_PAGE_SIZE).toBe(12);
		expect(pageSlice(users, 1, USER_MANAGEMENT_PAGE_SIZE)).toHaveLength(12);
		expect(pageSlice(users, 3, USER_MANAGEMENT_PAGE_SIZE)).toEqual([
			"user-24",
		]);
	});
});
