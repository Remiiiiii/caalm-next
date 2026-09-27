import { describe, expect, it } from "vitest";
import {
	actorIsSuperAdmin,
	isSuperAdminProfile,
	usersVisibleOnGraph,
} from "@/lib/users/graph-visibility";

const superAdmin = {
	$id: "victor-profile",
	accountId: "victor-account",
	roleName: "Super Admin",
};
const ceo = {
	$id: "remy-profile",
	accountId: "remy-account",
	roleName: "Organization Admin",
};

describe("graph visibility", () => {
	it("treats Super Admin as the hidden-root profile", () => {
		expect(isSuperAdminProfile(superAdmin)).toBe(true);
		expect(isSuperAdminProfile(ceo)).toBe(false);
	});

	it("shows Super Admin only to that Super Admin", () => {
		const users = [superAdmin, ceo];
		expect(
			usersVisibleOnGraph(users, {
				$id: "victor-profile",
				accountId: "victor-account",
			}).map((user) => user.$id),
		).toEqual(["victor-profile", "remy-profile"]);
		expect(
			usersVisibleOnGraph(users, {
				$id: "remy-profile",
				accountId: "remy-account",
			}).map((user) => user.$id),
		).toEqual(["remy-profile"]);
		expect(usersVisibleOnGraph(users, null).map((user) => user.$id)).toEqual([
			"remy-profile",
		]);
		expect(actorIsSuperAdmin({ $id: "victor-account" }, users)).toBe(true);
		expect(actorIsSuperAdmin({ $id: "remy-account" }, users)).toBe(false);
	});
});
