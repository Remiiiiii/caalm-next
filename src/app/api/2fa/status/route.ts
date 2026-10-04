import { type NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	isSessionUserError,
	rejectUserIdMismatch,
	requireSessionUser,
} from "@/lib/auth/require-session-user";
import { CACHE_TTLS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

export async function POST(request: NextRequest) {
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

		const accountId = session.accountId;
		const cacheKey = `2fa:status:${accountId}`;
		const cachedData = await CacheManager.withCache(
			"2fa/status",
			cacheKey,
			async () => {
				const client = await createAdminClient();
				const userResponse = await client.tablesDB.listRows({
					databaseId: appwriteConfig.databaseId,
					tableId: appwriteConfig.usersCollectionId,
					queries: [Query.equal("accountId", accountId)],
				});

				if (userResponse.rows.length > 0) {
					const user = userResponse.rows[0];
					const has2FA =
						user.twoFactorEnabled === true &&
						user.twoFactorSecret !== null &&
						user.twoFactorSecret !== undefined &&
						user.twoFactorSecret !== "" &&
						user.twoFactorFactorId !== null &&
						user.twoFactorFactorId !== undefined &&
						user.twoFactorFactorId !== "" &&
						user.twoFactorSetupAt !== null &&
						user.twoFactorSetupAt !== undefined;

					// Never return the TOTP secret to the client
					return {
						success: true,
						has2FA,
						twoFactorEnabled: Boolean(user.twoFactorEnabled),
						twoFactorFactorId: has2FA ? user.twoFactorFactorId : null,
						twoFactorSetupAt: has2FA ? user.twoFactorSetupAt : null,
						timestamp: Date.now(),
					};
				}

				return {
					success: true,
					has2FA: false,
					timestamp: Date.now(),
				};
			},
			CACHE_TTLS.medium,
		);

		return NextResponse.json(cachedData, {
			headers: {
				"Cache-Control": "private, max-age=300",
			},
		});
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			console.error("Error checking 2FA status:", error);
		}
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}
}
