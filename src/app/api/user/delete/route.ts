import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { deleteUser } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";

export async function DELETE(req: NextRequest) {
	try {
		const permissionCheck = await requirePermission(req, {
			permission: PERMISSIONS.USERS.EDIT,
		});
		if (permissionCheck) return permissionCheck;

		const body = await req.json();
		const { userId } = body;
		if (!userId) {
			return NextResponse.json({ error: "Missing userId" }, { status: 400 });
		}
		await deleteUser(userId);
		return NextResponse.json({ success: true });
	} catch (error) {
		return NextResponse.json(
			{ error: (error as Error).message || "Failed to delete user" },
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
