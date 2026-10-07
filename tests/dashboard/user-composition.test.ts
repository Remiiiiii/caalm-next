import { describe, expect, it } from "vitest";
import { computeDashboardUserComposition } from "@/lib/dashboard/user-composition";

const rolesById = new Map([
	["role_super_admin", { name: "Super Admin", priority: 10 }],
	["role_org_admin", { name: "Organization Admin", priority: 30 }],
	["role_dept_manager", { name: "Department Manager", priority: 50 }],
]);

describe("computeDashboardUserComposition", () => {
	it("counts primary role once — Super Admin leftover dept role is not a dept manager", () => {
		const result = computeDashboardUserComposition({
			orgId: "default_organization",
			orgMemberProfileIds: new Set(["sa1", "dm1"]),
			rolesById,
			users: [
				{
					$id: "sa1",
					accountId: "sa1-acct",
					status: "active",
					orgId: "default_organization",
				},
				{
					$id: "dm1",
					accountId: "dm1-acct",
					status: "active",
					orgId: "default_organization",
				},
			],
			assignments: [
				{ userId: "sa1", roleId: "role_super_admin" },
				{ userId: "sa1", roleId: "role_dept_manager" },
				{ userId: "dm1", roleId: "role_dept_manager" },
			],
		});

		expect(result.superAdmin).toBe(1);
		expect(result.deptManager).toBe(1);
		expect(result.orgAdmin).toBe(0);
	});

	it("dedupes profile $id and accountId role rows for the same person", () => {
		const result = computeDashboardUserComposition({
			orgId: "default_organization",
			orgMemberProfileIds: new Set(["profile-john"]),
			rolesById,
			users: [
				{
					$id: "profile-john",
					accountId: "account-john",
					status: "active",
					orgId: "default_organization",
				},
			],
			assignments: [
				{ userId: "profile-john", roleId: "role_dept_manager" },
				{ userId: "account-john", roleId: "role_dept_manager" },
			],
		});

		expect(result.deptManager).toBe(1);
	});

	it("tracks unassigned active users and inactive accounts separately", () => {
		const result = computeDashboardUserComposition({
			orgId: "default_organization",
			orgMemberProfileIds: new Set(["u1", "u2", "u3"]),
			rolesById,
			users: [
				{
					$id: "u1",
					status: "active",
					orgId: "default_organization",
				},
				{
					$id: "u2",
					status: "inactive",
					orgId: "default_organization",
				},
				{
					$id: "u3",
					status: "active",
					orgId: "default_organization",
				},
			],
			assignments: [{ userId: "u3", roleId: "role_org_admin" }],
		});

		expect(result.unassigned).toBe(1);
		expect(result.inactive).toBe(1);
		expect(result.orgAdmin).toBe(1);
		expect(result.deptManager).toBe(0);
	});
});
