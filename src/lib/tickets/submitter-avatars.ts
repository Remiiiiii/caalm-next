import "server-only";

import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { flattenTableRow } from "@/lib/appwrite/flatten-row";
import { resolveAvatarDisplayUrl } from "@/lib/utils";

const BATCH_SIZE = 50;

export type UserProfile = {
	name: string;
	/** Missing when the user has no uploaded photo, so callers fall back to initials. */
	avatarUrl?: string;
};

/**
 * Display name and photo URL for users, keyed by user id. A lookup failure only
 * costs the names and photos, never the page that asked.
 */
export async function getUserProfiles(
	userIds: string[],
): Promise<Record<string, UserProfile>> {
	const ids = [...new Set(userIds.filter(Boolean))];
	const profiles: Record<string, UserProfile> = {};
	if (ids.length === 0) return profiles;

	try {
		const { tablesDB } = await createAdminClient();
		for (let i = 0; i < ids.length; i += BATCH_SIZE) {
			const batch = ids.slice(i, i + BATCH_SIZE);
			const result = await tablesDB.listRows({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId: appwriteConfig.usersCollectionId || "users",
				queries: [Query.equal("$id", batch), Query.limit(batch.length)],
			});
			for (const row of result.rows) {
				const user = flattenTableRow(row as unknown as Record<string, unknown>);
				const url = resolveAvatarDisplayUrl({
					avatar: user.avatar as string | null | undefined,
					profileImageId: user.profileImageId as string | null | undefined,
				});
				profiles[String(user.$id)] = {
					name: String(user.fullName || user.name || "").trim(),
					...(url ? { avatarUrl: url } : {}),
				};
			}
		}
	} catch (error) {
		console.error("[tickets] Could not load user profiles:", error);
	}
	return profiles;
}

/** Photo URLs for ticket submitters, keyed by user id; users without a photo are left out. */
export async function getSubmitterAvatarUrls(
	userIds: string[],
): Promise<Record<string, string>> {
	const profiles = await getUserProfiles(userIds);
	const urls: Record<string, string> = {};
	for (const [id, profile] of Object.entries(profiles)) {
		if (profile.avatarUrl) urls[id] = profile.avatarUrl;
	}
	return urls;
}
