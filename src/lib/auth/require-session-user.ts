import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createSessionClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export type SessionUser = {
	/** Users collection document id */
	profileId: string;
	/** Appwrite Auth account id */
	accountId: string;
	email: string;
	fullName: string;
};

/**
 * Require a real Appwrite session (not the 2FA cookie fallback).
 * Use for security settings so callers cannot act as another user via body userId.
 */
export async function requireSessionUser(): Promise<
	SessionUser | NextResponse
> {
	try {
		const { tablesDB, account } = await createSessionClient();
		const authUser = await account.get();
		if (!authUser?.$id) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const rows = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.usersCollectionId || "users",
			queries: [Query.equal("accountId", authUser.$id)],
		});

		if (rows.total === 0 || !rows.rows[0]) {
			return NextResponse.json(
				{ error: "User profile not found" },
				{ status: 404 },
			);
		}

		const profile = rows.rows[0];
		return {
			profileId: profile.$id,
			accountId: String(profile.accountId || authUser.$id),
			email: String(profile.email || authUser.email || ""),
			fullName: String(profile.fullName || authUser.name || ""),
		};
	} catch {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}
}

export function isSessionUserError(
	value: SessionUser | NextResponse,
): value is NextResponse {
	return value instanceof NextResponse;
}

/**
 * Reject body userId when it does not match the session account or profile id.
 * Returns null when OK (or when body omitted); returns a 403 response when mismatched.
 */
export function rejectUserIdMismatch(
	session: SessionUser,
	bodyUserId: string | undefined | null,
): NextResponse | null {
	if (!bodyUserId) return null;
	const id = String(bodyUserId).trim();
	if (!id) return null;
	if (id === session.accountId || id === session.profileId) return null;
	return NextResponse.json(
		{ error: "Cannot change two-factor settings for another user" },
		{ status: 403 },
	);
}
