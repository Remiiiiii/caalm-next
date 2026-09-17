/**
 * Self-service profile update: signed-in user may change their own display name only.
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
const mockUpdateUserProfile = vi.fn();
const mockInvalidateUsers = vi.fn();

vi.mock("@/lib/actions/user.actions", () => ({
	getCurrentUser: () => mockGetCurrentUser(),
	updateUserProfile: (...args: unknown[]) => mockUpdateUserProfile(...args),
}));

vi.mock("@/lib/services/cache-manager", () => ({
	default: {
		invalidateUsers: (...args: unknown[]) => mockInvalidateUsers(...args),
	},
}));

describe("PATCH /api/user/profile", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCurrentUser.mockResolvedValue({
			$id: "user-1",
			accountId: "acct-1",
			email: "alex@example.com",
			fullName: "Alex Rivera",
		});
		mockUpdateUserProfile.mockResolvedValue({
			user: {
				$id: "user-1",
				accountId: "acct-1",
				fullName: "Alex Rivera",
			},
			previousStatus: "active",
		});
		mockInvalidateUsers.mockResolvedValue(undefined);
	});

	it("returns 401 when there is no signed-in user", async () => {
		mockGetCurrentUser.mockResolvedValue(null);
		const { PATCH } = await import("@/app/api/user/profile/route");
		const request = new NextRequest("http://localhost:3000/api/user/profile", {
			method: "PATCH",
			body: JSON.stringify({ fullName: "Alex Rivera" }),
			headers: { "Content-Type": "application/json" },
		});
		const response = await PATCH(request);
		expect(response.status).toBe(401);
		expect(mockUpdateUserProfile).not.toHaveBeenCalled();
	});

	it("returns 400 when fullName is missing", async () => {
		const { PATCH } = await import("@/app/api/user/profile/route");
		const request = new NextRequest("http://localhost:3000/api/user/profile", {
			method: "PATCH",
			body: JSON.stringify({}),
			headers: { "Content-Type": "application/json" },
		});
		const response = await PATCH(request);
		expect(response.status).toBe(400);
		expect(mockUpdateUserProfile).not.toHaveBeenCalled();
	});

	it("rejects role, email, and accountId so callers cannot escalate", async () => {
		const { PATCH } = await import("@/app/api/user/profile/route");
		const request = new NextRequest("http://localhost:3000/api/user/profile", {
			method: "PATCH",
			body: JSON.stringify({
				fullName: "Alex Rivera",
				role: "Super Admin",
				accountId: "someone-else",
				email: "new@example.com",
			}),
			headers: { "Content-Type": "application/json" },
		});
		const response = await PATCH(request);
		expect(response.status).toBe(400);
		expect(mockUpdateUserProfile).not.toHaveBeenCalled();
	});

	it("updates only the signed-in user's display name", async () => {
		const { PATCH } = await import("@/app/api/user/profile/route");
		const request = new NextRequest("http://localhost:3000/api/user/profile", {
			method: "PATCH",
			body: JSON.stringify({ fullName: "  Alex Rivera  " }),
			headers: { "Content-Type": "application/json" },
		});
		const response = await PATCH(request);
		expect(response.status).toBe(200);
		expect(mockUpdateUserProfile).toHaveBeenCalledWith({
			accountId: "acct-1",
			fullName: "Alex Rivera",
		});
		expect(mockInvalidateUsers).toHaveBeenCalledWith(
			"alex@example.com",
			"user-1",
			"acct-1",
			"Alex Rivera",
		);
	});
});
