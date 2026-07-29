import { type NextRequest, NextResponse } from "next/server";
import * as sdk from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { requirePermission } from "@/lib/rbac/middleware";

/**
 * POST /api/admin/users/[userId]/revoke-sessions
 * Deletes all Auth sessions for the target user.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ userId: string }> },
) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.USERS.EDIT,
		});
		if (permissionCheck) return permissionCheck;

		const { userId } = await params;
		if (!userId) {
			return NextResponse.json({ error: "Missing userId" }, { status: 400 });
		}

		const { tablesDB } = await createAdminClient();
		const userDoc = await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.usersCollectionId || "users",
			rowId: userId,
		});

		const accountId = String(
			(userDoc as { accountId?: string }).accountId || "",
		);
		if (!accountId) {
			return NextResponse.json(
				{ error: "User account is incomplete" },
				{ status: 400 },
			);
		}

		const client = new sdk.Client()
			.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
			.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
			.setKey(process.env.NEXT_APPWRITE_API_KEY!);
		const users = new sdk.Users(client);

		await users.deleteSessions(accountId);

		return NextResponse.json({
			success: true,
			message: "All active sessions revoked",
		});
	} catch (error) {
		console.error("Revoke sessions failed:", error);
		return NextResponse.json(
			{
				error: (error as Error).message || "Failed to revoke sessions",
			},
			{ status: 500 },
		);
	}
}
