import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	isSessionUserError,
	rejectUserIdMismatch,
	requireSessionUser,
} from "@/lib/auth/require-session-user";
import { logSecurityAudit } from "@/lib/auth/security-audit";

/**
 * PUT /api/2fa/disable — reset the logged-in user's two-factor settings.
 */
export async function PUT(request: NextRequest) {
	try {
		const session = await requireSessionUser();
		if (isSessionUserError(session)) return session;

		let bodyUserId: string | undefined;
		try {
			const body = await request.json();
			bodyUserId =
				typeof body?.userId === "string" ? body.userId : undefined;
		} catch {
			// optional
		}

		const mismatch = rejectUserIdMismatch(session, bodyUserId);
		if (mismatch) return mismatch;

		if (!appwriteConfig.databaseId || !appwriteConfig.usersCollectionId) {
			return NextResponse.json(
				{ error: "Database configuration missing" },
				{ status: 500 },
			);
		}

		const client = await createAdminClient();
		await client.tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.usersCollectionId,
			rowId: session.profileId,
			data: {
				twoFactorEnabled: false,
				twoFactorSecret: null,
				twoFactorFactorId: null,
				twoFactorSetupAt: null,
			},
		});

		await logSecurityAudit({
			kind: "two_factor_reset",
			actor: {
				$id: session.profileId,
				fullName: session.fullName,
				email: session.email,
			},
			target: {
				$id: session.profileId,
				fullName: session.fullName,
				email: session.email,
			},
			request,
		});

		const response = NextResponse.json({
			success: true,
			message: "2FA disabled successfully",
		});
		response.cookies.delete("2fa_completed");
		response.cookies.delete("2fa_user_id");
		return response;
	} catch (error) {
		console.error("Error disabling 2FA:", error);
		return NextResponse.json(
			{ error: "Failed to disable 2FA" },
			{ status: 500 },
		);
	}
}
