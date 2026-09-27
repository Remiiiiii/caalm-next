import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";
import { ReassignManagerError } from "@/lib/users/reassign-manager";

const mockRequirePermission = vi.fn();
const mockReassignManager = vi.fn();

vi.mock("@/lib/rbac/middleware", () => ({
	requirePermission: (req: NextRequest, opts: unknown) =>
		mockRequirePermission(req, opts),
}));

vi.mock("@/lib/users/reassign-manager", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/users/reassign-manager")>();
	return {
		...actual,
		reassignManager: (...args: unknown[]) => mockReassignManager(...args),
	};
});

function request(body: unknown) {
	return new NextRequest("http://localhost:3000/api/users/leaf/reassign-manager", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /api/users/[userId]/reassign-manager", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 403 without USERS.EDIT", async () => {
		mockRequirePermission.mockResolvedValue(
			NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }),
		);
		const { POST } = await import(
			"@/app/api/users/[userId]/reassign-manager/route"
		);
		const response = await POST(request({ managerUserId: "ceo" }), {
			params: Promise.resolve({ userId: "leaf" }),
		});
		expect(response.status).toBe(403);
		expect(mockRequirePermission).toHaveBeenCalledWith(
			expect.any(NextRequest),
			expect.objectContaining({ permission: PERMISSIONS.USERS.EDIT }),
		);
		expect(mockReassignManager).not.toHaveBeenCalled();
	});

	it("returns 409 when SCIM owns manager", async () => {
		mockRequirePermission.mockResolvedValue(null);
		mockReassignManager.mockRejectedValue(
			new ReassignManagerError(
				"Manager is owned by SCIM for this organization",
				409,
			),
		);
		const { POST } = await import(
			"@/app/api/users/[userId]/reassign-manager/route"
		);
		const response = await POST(request({ managerUserId: "ceo" }), {
			params: Promise.resolve({ userId: "leaf" }),
		});
		expect(response.status).toBe(409);
		await expect(response.json()).resolves.toEqual({
			success: false,
			error: "Manager is owned by SCIM for this organization",
		});
	});

	it("returns 400 when the reporting chain would cycle", async () => {
		mockRequirePermission.mockResolvedValue(null);
		mockReassignManager.mockRejectedValue(
			new ReassignManagerError(
				"That connection would create a circular reporting chain",
				400,
			),
		);
		const { POST } = await import(
			"@/app/api/users/[userId]/reassign-manager/route"
		);
		const response = await POST(request({ managerUserId: "leaf" }), {
			params: Promise.resolve({ userId: "ceo" }),
		});
		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({
			success: false,
			error: "That connection would create a circular reporting chain",
		});
	});
});
