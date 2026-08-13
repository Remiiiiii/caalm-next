import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import { deleteUserAccount } from "@/lib/users/delete-user.service";

function resolveErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}
	if (typeof error === "object" && error !== null && "message" in error) {
		const message = String((error as { message?: unknown }).message || "").trim();
		if (message) return message;
	}
	return fallback;
}

async function parseUserId(req: NextRequest): Promise<string | null> {
	const fromQuery = req.nextUrl.searchParams.get("userId")?.trim();
	if (fromQuery) return fromQuery;

	try {
		const body = await req.json();
		const fromBody = String(body?.userId || "").trim();
		return fromBody || null;
	} catch {
		return null;
	}
}

export async function DELETE(req: NextRequest) {
	try {
		const permissionCheck = await requirePermission(req, {
			permission: PERMISSIONS.USERS.EDIT,
		});
		if (permissionCheck) return permissionCheck;

		const userId = await parseUserId(req);
		if (!userId) {
			return NextResponse.json({ error: "Missing userId" }, { status: 400 });
		}

		const currentUser = await getCurrentUser();
		if (
			currentUser &&
			(currentUser.$id === userId || currentUser.accountId === userId)
		) {
			return NextResponse.json(
				{ error: "You cannot delete your own account" },
				{ status: 400 },
			);
		}

		const orgId = getOrgIdFromRequest(req);
		await deleteUserAccount(userId, orgId);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[DELETE /api/user/delete]", error);
		return NextResponse.json(
			{
				error: resolveErrorMessage(error, "Failed to delete user"),
			},
			{ status: 500 },
		);
	}
}

export function GET() {
	return new NextResponse("Method Not Allowed", { status: 405 });
}

export function POST() {
	return new NextResponse("Method Not Allowed", { status: 405 });
}

export function PATCH() {
	return new NextResponse("Method Not Allowed", { status: 405 });
}

export function PUT() {
	return new NextResponse("Method Not Allowed", { status: 405 });
}
