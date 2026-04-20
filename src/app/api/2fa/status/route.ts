import { type NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { CACHE_TTLS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

export async function POST(request: NextRequest) {
	try {
		const { userId } = await request.json();

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 },
			);
		}

		// Check cache first for faster response
		const cacheKey = `2fa:status:${userId}`;
		const cachedData = await CacheManager.withCache(
			"2fa/status",
			cacheKey,
			async () => {
				const client = await createAdminClient();

				// Check if user has 2FA enabled by looking for stored 2FA data
				const userResponse = await client.tablesDB.listRows({
					databaseId: appwriteConfig.databaseId,
					tableId: appwriteConfig.usersCollectionId,
					queries: [Query.equal("accountId", userId)],
				});

				if (userResponse.rows.length > 0) {
					const user = userResponse.rows[0];

					// Check if user has 2FA enabled according to the schema
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

					return {
						success: true,
						has2FA,
						twoFactorEnabled: user.twoFactorEnabled,
						twoFactorSecret: user.twoFactorSecret,
						twoFactorFactorId: user.twoFactorFactorId,
						twoFactorSetupAt: user.twoFactorSetupAt,
						timestamp: Date.now(),
					};
				} else {
					return {
						success: true,
						has2FA: false,
						timestamp: Date.now(),
					};
				}
			},
			CACHE_TTLS.medium, // 5 minutes
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
		// Return false on error to allow sign-in to continue
		return NextResponse.json({
			success: true,
			has2FA: false,
		});
	}
}
