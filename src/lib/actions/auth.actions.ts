"use server";

import type { Models } from "appwrite";
import { cookies } from "next/headers";
import { Account, Client, Users } from "node-appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getCurrentUser } from "./user.actions";

export const getSessionUser =
	async (): Promise<Models.User<Models.Preferences> | null> => {
		try {
			if (!appwriteConfig.endpointUrl || !appwriteConfig.projectId) {
				console.error("Appwrite configuration is incomplete");
				return null;
			}

			const session = (await cookies()).get("appwrite-session");

			if (!session?.value) {
				return null;
			}

			const client = new Client()
				.setEndpoint(appwriteConfig.endpointUrl)
				.setProject(appwriteConfig.projectId)
				.setSession(session.value);

			const account = new Account(client);
			const user = await account.get();

			// Return only plain user data, not the full Appwrite user object
			// Use JSON.parse(JSON.stringify()) to ensure complete serialization
			const plainUser = {
				$id: user.$id,
				name: user.name,
				email: user.email,
				emailVerification: user.emailVerification,
				phone: user.phone,
				phoneVerification: user.phoneVerification,
				prefs: user.prefs ? JSON.parse(JSON.stringify(user.prefs)) : undefined,
				registration: user.registration,
				status: user.status,
				passwordUpdate: user.passwordUpdate,
				accessedAt: user.accessedAt,
				$createdAt: user.$createdAt,
				$updatedAt: user.$updatedAt,
			};

			// Ensure complete serialization by parsing and stringifying
			return JSON.parse(
				JSON.stringify(plainUser),
			) as Models.User<Models.Preferences>;
		} catch (error) {
			console.error("Session check failed:", error);
			return null;
		}
	};

/**
 * Gives the browser's Appwrite client a real session secret so its Realtime
 * WebSocket can authenticate as the signed-in user. This has to be a session,
 * not a JWT: Appwrite's Realtime handshake sends `client.setSession(...)`'s
 * value, and never looks at a JWT at all — `setJWT()` only adds a header for
 * REST calls. Without this, Realtime connects anonymously and can never see
 * document-permission-gated events (e.g. `read(Role.user(...))` rows), even
 * though regular REST reads work fine via the server-side session.
 *
 * Two login paths exist here: a normal login leaves a real Appwrite session
 * secret in the `appwrite-session` cookie — just reuse it. The 2FA login path
 * never establishes one — `getCurrentUser()` falls back to resolving the user
 * from a different cookie via the admin API — so there is no session to
 * reuse. For that path, mint a throwaway one via the admin API for the user's
 * real Appwrite account id (`accountId`, NOT the `users` collection row id
 * most of this app calls "userId" — those two differ, and only `accountId`
 * is a real `Role.user(...)` target). Unlike a JWT, a session secret has no
 * short-duration option, so the caller (`realtime-service.ts`) re-mints this
 * on an interval; each mint revokes the previous rotation's session first, so
 * a stolen secret is only ever valid until the next rotation and the old one
 * is actively revoked, not just outlived.
 */
export const getRealtimeSessionSecret = async (): Promise<string | null> => {
	try {
		if (!appwriteConfig.endpointUrl || !appwriteConfig.projectId) {
			console.error("Appwrite configuration is incomplete");
			return null;
		}

		const cookieStore = await cookies();
		const sessionCookie = cookieStore.get("appwrite-session");
		if (sessionCookie?.value) return sessionCookie.value;

		if (!appwriteConfig.secretKey) return null;
		const user = await getCurrentUser();
		const accountId = (user as { accountId?: string } | null)?.accountId;
		if (!accountId) return null;

		const adminClient = new Client()
			.setEndpoint(appwriteConfig.endpointUrl)
			.setProject(appwriteConfig.projectId)
			.setKey(appwriteConfig.secretKey);
		const users = new Users(adminClient);

		const previousSessionId = cookieStore.get("rt-session-id")?.value;
		if (previousSessionId) {
			await users
				.deleteSession({ userId: accountId, sessionId: previousSessionId })
				.catch(() => {});
		}

		const session = await users.createSession({ userId: accountId });
		cookieStore.set("rt-session-id", session.$id, {
			path: "/",
			httpOnly: true,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
		});
		return session.secret;
	} catch (error) {
		console.error("Realtime session mint failed:", error);
		return null;
	}
};
