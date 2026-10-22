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
		// #region agent log
		{
			const { cookies } = await import("next/headers");
			const jar = await cookies();
			const hasSession = Boolean(jar.get("appwrite-session")?.value);
			const has2fa = jar.get("2fa_completed")?.value === "true";
			fetch("http://127.0.0.1:7246/ingest/851d37c7-2223-45c1-89c0-a79ca1139a1d", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Debug-Session-Id": "da7416",
				},
				body: JSON.stringify({
					sessionId: "da7416",
					runId: "post-fix",
					hypothesisId: "H1",
					location: "require-session-user.ts:entry",
					message: "requireSessionUser cookie state",
					data: {
						hasSessionCookie: hasSession,
						has2faCompletedCookie: has2fa,
						nodeEnv: process.env.NODE_ENV,
					},
					timestamp: Date.now(),
				}),
			}).catch(() => {});
		}
		// #endregion
		const { tablesDB, account } = await createSessionClient();
		const authUser = await account.get();
		if (!authUser?.$id) {
			// #region agent log
			fetch("http://127.0.0.1:7246/ingest/851d37c7-2223-45c1-89c0-a79ca1139a1d", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Debug-Session-Id": "da7416",
				},
				body: JSON.stringify({
					sessionId: "da7416",
					runId: "pre-fix",
					hypothesisId: "H2",
					location: "require-session-user.ts:no-auth-user",
					message: "account.get returned empty user",
					data: {},
					timestamp: Date.now(),
				}),
			}).catch(() => {});
			// #endregion
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
	} catch (error) {
		// #region agent log
		fetch("http://127.0.0.1:7246/ingest/851d37c7-2223-45c1-89c0-a79ca1139a1d", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Debug-Session-Id": "da7416",
			},
			body: JSON.stringify({
				sessionId: "da7416",
				runId: "pre-fix",
				hypothesisId: "H1",
				location: "require-session-user.ts:catch",
				message: "requireSessionUser failed",
				data: {
					errorName: error instanceof Error ? error.name : "unknown",
					errorMessage:
						error instanceof Error ? error.message.slice(0, 120) : "unknown",
				},
				timestamp: Date.now(),
			}),
		}).catch(() => {});
		// #endregion
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
