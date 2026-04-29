import { type NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { CACHE_KEYS, getTTLForRoute } from "@/lib/services/cache-keys";
import * as cache from "@/lib/services/redis-cache";

function getProfileImageId(user: {
	avatar?: string | null;
	profileImageId?: string | null;
}): string | null {
	const avatarValue = user.avatar?.trim();
	if (avatarValue && !avatarValue.startsWith("/") && !/^https?:\/\//i.test(avatarValue)) {
		return avatarValue;
	}
	return user.profileImageId || null;
}

/**
 * Fetch a single user by ID, accountId, or fullName with caching
 */
async function fetchUserByIdentifier(
	identifier: string,
	adminClient: any,
): Promise<any | null> {
	// Try individual cache keys first for better hit rates
	let cachedUser = await cache.get(CACHE_KEYS.users.single(identifier));
	if (cachedUser) return cachedUser;

	cachedUser = await cache.get(CACHE_KEYS.users.byAccountId(identifier));
	if (cachedUser) return cachedUser;

	cachedUser = await cache.get(CACHE_KEYS.users.byFullName(identifier));
	if (cachedUser) return cachedUser;

	// User not in cache, fetch from database
	try {
		// First try to get by document ID ($id) using getRow (most direct)
		try {
			const user = await adminClient.tablesDB.getRow({
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.usersCollectionId,
				rowId: identifier,
			});

			if (user) {
				const userData = {
					$id: user.$id,
					accountId: user.accountId,
					fullName: user.fullName,
					email: user.email,
					profileImageId: getProfileImageId(user),
				};

				// Cache by all identifiers for future lookups
				const ttl = getTTLForRoute("users/get-by-ids");
				await cache.set(CACHE_KEYS.users.single(user.$id), userData, ttl);
				if (user.accountId) {
					await cache.set(
						CACHE_KEYS.users.byAccountId(user.accountId),
						userData,
						ttl,
					);
				}
				if (user.fullName) {
					await cache.set(
						CACHE_KEYS.users.byFullName(user.fullName),
						userData,
						ttl,
					);
				}

				return userData;
			}
		} catch (_getRowError: any) {
			// getRow returns 404 if not found, which is expected - continue to next lookup method
		}

		// If not found by $id, try accountId using listRows
		try {
			const accountIdResponse = await adminClient.tablesDB.listRows(
				appwriteConfig.databaseId,
				appwriteConfig.usersCollectionId,
				[Query.equal("accountId", identifier), Query.limit(1)],
			);

			if (accountIdResponse.rows && accountIdResponse.rows.length > 0) {
				const user = accountIdResponse.rows[0];
				const userData = {
					$id: user.$id,
					accountId: user.accountId,
					fullName: user.fullName,
					email: user.email,
					profileImageId: getProfileImageId(user),
				};

				// Cache by all identifiers
				const ttl = getTTLForRoute("users/get-by-ids");
				await cache.set(CACHE_KEYS.users.single(user.$id), userData, ttl);
				if (user.accountId) {
					await cache.set(
						CACHE_KEYS.users.byAccountId(user.accountId),
						userData,
						ttl,
					);
				}
				if (user.fullName) {
					await cache.set(
						CACHE_KEYS.users.byFullName(user.fullName),
						userData,
						ttl,
					);
				}

				return userData;
			}
		} catch (_accountIdError: any) {
			// Continue to next lookup method
		}

		// If not found by $id or accountId, try fullName (assignedManagers might be stored as names)
		try {
			const nameResponse = await adminClient.tablesDB.listRows(
				appwriteConfig.databaseId,
				appwriteConfig.usersCollectionId,
				[Query.equal("fullName", identifier), Query.limit(1)],
			);

			if (nameResponse.rows && nameResponse.rows.length > 0) {
				const user = nameResponse.rows[0];
				const userData = {
					$id: user.$id,
					accountId: user.accountId,
					fullName: user.fullName,
					email: user.email,
					profileImageId: getProfileImageId(user),
				};

				// Cache by all identifiers
				const ttl = getTTLForRoute("users/get-by-ids");
				await cache.set(CACHE_KEYS.users.single(user.$id), userData, ttl);
				if (user.accountId) {
					await cache.set(
						CACHE_KEYS.users.byAccountId(user.accountId),
						userData,
						ttl,
					);
				}
				if (user.fullName) {
					await cache.set(
						CACHE_KEYS.users.byFullName(user.fullName),
						userData,
						ttl,
					);
				}

				return userData;
			}
		} catch (_nameError: any) {
			// Continue - user not found by any method
		}
	} catch (_error: any) {
		// Error fetching user - return null
	}

	return null;
}

export async function POST(request: NextRequest) {
	try {
		const { userIds } = await request.json();

		if (!Array.isArray(userIds) || userIds.length === 0) {
			return NextResponse.json(
				{ error: "Invalid or empty userIds array" },
				{ status: 400 },
			);
		}

		// Validate configuration
		if (!appwriteConfig.databaseId || !appwriteConfig.usersCollectionId) {
			console.error("[get-by-ids] Missing configuration:", {
				databaseId: appwriteConfig.databaseId,
				usersCollectionId: appwriteConfig.usersCollectionId,
			});
			return NextResponse.json(
				{ error: "Database configuration missing" },
				{ status: 500 },
			);
		}

		// Check cache for the entire batch first
		const cacheKey = CACHE_KEYS.users.byIds(userIds);
		const cachedResult = await cache.get<any[]>(cacheKey);
		if (cachedResult) {
			return NextResponse.json(cachedResult);
		}

		// Fetch users in parallel for better performance
		const adminClient = await createAdminClient();
		const uniqueUserIds = Array.from(new Set(userIds)); // Remove duplicates

		// Fetch all users in parallel instead of sequentially
		const userPromises = uniqueUserIds.map((userId) =>
			fetchUserByIdentifier(userId, adminClient).catch((error) => {
				console.warn(`Failed to fetch user ${userId}:`, error);
				return null; // Return null for failed fetches
			}),
		);

		const userResults = await Promise.all(userPromises);

		// Filter out nulls and deduplicate by $id
		const usersMap = new Map<string, any>();
		userResults.forEach((user) => {
			if (user?.$id && !usersMap.has(user.$id)) {
				usersMap.set(user.$id, user);
			}
		});

		const users = Array.from(usersMap.values());

		// Cache the entire batch result
		const ttl = getTTLForRoute("users/get-by-ids");
		await cache.set(cacheKey, users, ttl);

		return NextResponse.json(users);
	} catch (error) {
		console.error("Error fetching users by IDs:", error);
		return NextResponse.json(
			{ error: "Failed to fetch users" },
			{ status: 500 },
		);
	}
}
