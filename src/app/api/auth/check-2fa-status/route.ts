import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	isSessionUserError,
	requireSessionUser,
} from "@/lib/auth/require-session-user";

export async function GET() {
	try {
		const session = await requireSessionUser();
		if (isSessionUserError(session)) return session;

		const adminClient = await createAdminClient();
		const userResponse = await adminClient.tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.usersCollectionId,
			queries: [Query.equal("accountId", session.accountId)],
		});

		if (userResponse.rows.length === 0) {
			return NextResponse.json(
				{ has2FA: false, needsSetup: true },
				{ status: 200 },
			);
		}

		const userData = userResponse.rows[0];
		const has2FA = !!(userData.twoFactorEnabled && userData.twoFactorSecret);

		const response = NextResponse.json({
			has2FA,
			needsSetup: !has2FA,
			user: {
				$id: userData.$id,
				accountId: userData.accountId,
				email: userData.email,
				fullName: userData.fullName,
				role: userData.role,
				department: userData.department,
			},
		});

		if (has2FA) {
			response.cookies.set("2fa_completed", "true", {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				maxAge: 60 * 60 * 24 * 30,
			});
		}

		return response;
	} catch (error) {
		console.error("Error checking 2FA status:", error);
		return NextResponse.json(
			{ error: "Failed to check 2FA status" },
			{ status: 500 },
		);
	}
}
