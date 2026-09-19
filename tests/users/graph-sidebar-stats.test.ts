import { describe, expect, it } from "vitest";
import type { UserManagementUser } from "@/hooks/useUsers";
import {
	computeGraphSidebarStats,
	countNeedsAttention,
	graphCreatedTrend,
	hasAssignerManagerMismatch,
	hasOrgAssignment,
	userMatchesGraphHighlight,
} from "@/lib/users/graph-sidebar-stats";

const NOW = Date.parse("2026-09-17T18:00:00.000Z");

function user(
	partial: Partial<UserManagementUser> & Pick<UserManagementUser, "$id" | "fullName">,
): UserManagementUser {
	return {
		email: `${partial.$id}@caalm.test`,
		avatar: "",
		accountId: `${partial.$id}-account`,
		role: "viewer",
		roleName: "Viewer",
		status: "active",
		...partial,
	};
}

describe("computeGraphSidebarStats", () => {
	it("splits system, admin, and ghost assigners and measures depth", () => {
		const users = [
			user({
				$id: "ada",
				fullName: "Ada Admin",
				assignedById: "system",
				assignedByName: "System",
				roleName: "Super Admin",
			}),
			user({
				$id: "mgr",
				fullName: "Morgan Lee",
				assignedById: "ada",
				assignedByName: "Ada Admin",
				managerUserId: "ada",
			}),
			user({
				$id: "leaf",
				fullName: "Riley Chen",
				assignedById: "mgr",
				assignedByName: "Morgan Lee",
				managerUserId: "mgr",
			}),
			user({
				$id: "ghosted",
				fullName: "Pat Gomez",
				assignedById: "former-lead",
				assignedByName: "Former Lead",
			}),
		];

		const stats = computeGraphSidebarStats(users, NOW);
		expect(stats.systemAssigned).toBe(1);
		expect(stats.adminAssigned).toBe(2);
		expect(stats.ghostAssigned).toBe(1);
		expect(stats.maxTreeDepth).toBe(3);
		expect(stats.extraRoots).toBe(1);
		expect(stats.maxReports).toBe(1);
		expect(stats.maxReportsUserId).toBe("ada");
		expect(stats.avgReports).toBe(1);
		expect(stats.ghostUsers.map((item) => item.$id)).toEqual(["ghosted"]);
	});

	it("treats System + empty manager as OK and flags person/account mismatches", () => {
		const users = [
			user({
				$id: "ada",
				fullName: "Ada Admin",
				accountId: "ada-auth",
				assignedById: "system",
				assignedByName: "System",
			}),
			user({
				$id: "vic",
				fullName: "Victor Ramirez",
				assignedById: "ada",
				assignedByName: "Ada Admin",
				managerUserId: "ada-auth",
			}),
			user({
				$id: "sys-mgr",
				fullName: "System With Manager",
				assignedById: "system",
				assignedByName: "System",
				managerUserId: "ada",
			}),
			user({
				$id: "no-mgr",
				fullName: "Person No Manager",
				assignedById: "ada",
				assignedByName: "Ada Admin",
			}),
		];

		expect(hasAssignerManagerMismatch(users[0], users)).toBe(false);
		expect(hasAssignerManagerMismatch(users[1], users)).toBe(false);
		expect(hasAssignerManagerMismatch(users[2], users)).toBe(true);
		expect(hasAssignerManagerMismatch(users[3], users)).toBe(true);

		const stats = computeGraphSidebarStats(users, NOW);
		expect(stats.mismatch).toBe(2);
	});

	it("counts stale, never, deactivated-with-reports, 2FA, and password age", () => {
		const weekAgo = new Date(NOW - 2 * 24 * 60 * 60 * 1000).toISOString();
		const stale = new Date(NOW - 40 * 24 * 60 * 60 * 1000).toISOString();
		const passwordStale = new Date(NOW - 100 * 24 * 60 * 60 * 1000).toISOString();
		const passwordFresh = new Date(NOW - 10 * 24 * 60 * 60 * 1000).toISOString();

		const users = [
			user({
				$id: "mgr",
				fullName: "Inactive Manager",
				status: "inactive",
				assignedById: "system",
				assignedByName: "System",
				department: "IT",
				division: "Help Desk",
				lastActiveAt: stale,
				twoFactorEnabled: false,
				passwordUpdatedAt: null,
			}),
			user({
				$id: "rpt",
				fullName: "Active Report",
				assignedById: "mgr",
				assignedByName: "Inactive Manager",
				managerUserId: "mgr",
				department: "IT",
				division: "Help Desk",
				lastActiveAt: weekAgo,
				twoFactorEnabled: true,
				passwordUpdatedAt: passwordFresh,
			}),
			user({
				$id: "new",
				fullName: "Never User",
				assignedById: "system",
				assignedByName: "System",
				lastActiveAt: undefined,
				twoFactorEnabled: false,
				passwordUpdatedAt: passwordStale,
				roleName: "",
				department: "",
				division: "",
			}),
		];

		const stats = computeGraphSidebarStats(users, NOW);
		expect(stats.stale30d).toBe(1);
		expect(stats.active7d).toBe(1);
		expect(stats.neverLoggedIn).toBe(1);
		expect(stats.deactivatedWithReports.map((item) => item.$id)).toEqual(["mgr"]);
		expect(stats.twoFactorOn).toBe(1);
		expect(stats.twoFactorOff).toBe(2);
		expect(stats.passwordNever).toBe(1);
		expect(stats.passwordStale).toBe(1);
		expect(stats.passwordHistoryAvailable).toBe(true);
		expect(stats.noDepartment).toBe(1);
		expect(stats.noDivision).toBe(1);
		expect(stats.noRole).toBe(1);
		expect(
			userMatchesGraphHighlight(
				users[1],
				{ kind: "security", value: "no-2fa" },
				stats,
			),
		).toBe(false);
		expect(
			userMatchesGraphHighlight(
				users[0],
				{ kind: "security", value: "no-2fa" },
				stats,
			),
		).toBe(true);
	});

	it("counts unique people in needs-attention, not the sum of rows", () => {
		const lastChangedAt = "2026-08-01T00:00:00.000Z";
		const users = [
			user({
				$id: "ada",
				fullName: "Ada Admin",
				twoFactorEnabled: false,
				passwordUpdatedAt: null,
				department: "",
				division: "",
			}),
			user({
				$id: "ok",
				fullName: "Casey Brooks",
				twoFactorEnabled: true,
				passwordUpdatedAt: lastChangedAt,
				department: "IT",
				division: "Help Desk",
			}),
		];
		const stats = computeGraphSidebarStats(users, NOW);
		expect(stats.twoFactorOff).toBe(1);
		expect(stats.passwordNever).toBe(1);
		expect(stats.noDepartment).toBe(1);
		expect(countNeedsAttention(stats)).toBe(1);
	});

	it("omits password metrics when Auth timestamps are missing", () => {
		const users = [user({ $id: "ada", fullName: "Ada Admin" })];
		const stats = computeGraphSidebarStats(users, NOW);
		expect(stats.passwordHistoryAvailable).toBe(false);
		expect(stats.passwordNever).toBe(0);
		expect(stats.passwordStale).toBe(0);
	});

	it("lists unassigned users by missing department or division, not System assigner", () => {
		const users = [
			user({
				$id: "john",
				fullName: "John Doe",
				assignedById: "system",
				assignedByName: "System",
				department: "Executive",
				division: "c-suite",
			}),
			user({
				$id: "no-div",
				fullName: "Sam Rivera",
				assignedById: "john",
				assignedByName: "John Doe",
				department: "Finance",
			}),
			user({
				$id: "no-dept",
				fullName: "Lee Park",
				assignedById: "john",
				assignedByName: "John Doe",
				division: "Help Desk",
			}),
		];

		expect(hasOrgAssignment(users[0])).toBe(true);
		expect(hasOrgAssignment(users[1])).toBe(false);
		expect(hasOrgAssignment(users[2])).toBe(false);

		const stats = computeGraphSidebarStats(users, NOW);
		expect(stats.systemAssigned).toBe(1);
		expect(stats.unassignedUsers.map((item) => item.$id)).toEqual([
			"no-div",
			"no-dept",
		]);
		expect(
			userMatchesGraphHighlight(
				users[0],
				{ kind: "issue", value: "unassigned" },
				stats,
			),
		).toBe(false);
		expect(
			userMatchesGraphHighlight(
				users[1],
				{ kind: "issue", value: "unassigned" },
				stats,
			),
		).toBe(true);
	});

	it("counts created users this week vs last week for the All users trend", () => {
		const thisWeek = new Date(NOW - 2 * 24 * 60 * 60 * 1000).toISOString();
		const lastWeek = new Date(NOW - 10 * 24 * 60 * 60 * 1000).toISOString();
		const lastMonth = "2026-08-10T12:00:00.000Z";

		const users = [
			user({ $id: "new-a", fullName: "New A", $createdAt: thisWeek }),
			user({ $id: "new-b", fullName: "New B", $createdAt: thisWeek }),
			user({ $id: "old-a", fullName: "Old A", $createdAt: lastWeek }),
			user({ $id: "aug", fullName: "August Hire", $createdAt: lastMonth }),
		];

		const stats = computeGraphSidebarStats(users, NOW);
		expect(stats.createdThisWeek).toBe(2);
		expect(stats.createdLastWeek).toBe(1);
		expect(stats.createdThisMonth).toBe(3);
		expect(stats.createdLastMonth).toBe(1);
		expect(graphCreatedTrend(stats.createdThisWeek, stats.createdLastWeek)).toBe(
			"up",
		);
		expect(graphCreatedTrend(0, 2)).toBe("down");
		expect(graphCreatedTrend(1, 1)).toBe("flat");
	});

	it("groups location and cost center rows", () => {
		const users = [
			user({
				$id: "ada",
				fullName: "Ada Admin",
				workLocation: "Austin office",
				costCenterName: "FIN-100 Corporate",
			}),
			user({
				$id: "vic",
				fullName: "Victor Ramirez",
				workLocation: "Austin office",
				costCenterCode: "IT-200",
			}),
		];
		const stats = computeGraphSidebarStats(users, NOW);
		expect(stats.locationRows).toEqual([
			{ label: "Austin office", count: 2 },
		]);
		expect(stats.costCenterRows.map((row) => row.label).sort()).toEqual([
			"FIN-100 Corporate",
			"IT-200",
		]);
		expect(
			userMatchesGraphHighlight(
				users[0],
				{ kind: "location", value: "Austin office" },
				stats,
			),
		).toBe(true);
	});
});
