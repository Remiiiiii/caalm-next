import { type NextRequest, NextResponse } from "next/server";
import * as sdk from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { requirePermission } from "@/lib/rbac/middleware";

/**
 * POST /api/admin/users/[userId]/reset-password
 * Sends an Appwrite password recovery email for the target user.
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

		const email = String((userDoc as { email?: string }).email || "");
		if (!email) {
			return NextResponse.json(
				{ error: "User email is missing" },
				{ status: 400 },
			);
		}

		const client = new sdk.Client()
			.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
			.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
			.setKey(process.env.NEXT_APPWRITE_API_KEY!);
		const account = new sdk.Account(client);

		const origin =
			request.headers.get("origin") ||
			process.env.NEXT_PUBLIC_APP_URL ||
			"http://localhost:3000";
		const recoveryUrl = `${origin.replace(/\/$/, "")}/reset-password`;

		await account.createRecovery(email, recoveryUrl);

		return NextResponse.json({
			success: true,
			message: `Password reset email sent to ${email}`,
		});
	} catch (error) {
		console.error("Reset password failed:", error);
		return NextResponse.json(
			{
				error:
					(error as Error).message || "Failed to send password reset email",
			},
			{ status: 500 },
		);
	}
}
