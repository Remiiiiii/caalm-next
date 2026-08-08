/**
 * Side effects when auth lockout triggers: revoke sessions, burn OTPs, notify owner.
 */

import { cookies } from "next/headers";
import * as sdk from "node-appwrite";
import { Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export async function invalidateUnusedOtpsForEmail(
	email: string,
): Promise<number> {
	if (!email) return 0;
	try {
		const { tablesDB } = await createAdminClient();
		const result = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.otpTokensCollectionId || "otp-tokens",
			queries: [
				Query.equal("email", email),
				Query.equal("used", false),
				Query.limit(100),
			],
		});

		await Promise.all(
			(result.rows || []).map((row) =>
				tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId || "default-db",
					tableId: appwriteConfig.otpTokensCollectionId || "otp-tokens",
					rowId: row.$id,
					data: { used: true },
				}),
			),
		);

		return result.rows?.length ?? 0;
	} catch (error) {
		console.error("[lockout] Failed to invalidate OTPs:", error);
		return 0;
	}
}

export async function revokeAllSessionsForAccountId(
	accountId: string,
): Promise<void> {
	if (!accountId) return;
	try {
		const client = new sdk.Client()
			.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
			.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
			.setKey(process.env.NEXT_APPWRITE_API_KEY!);
		const users = new sdk.Users(client);
		await users.deleteSessions(accountId);
	} catch (error) {
		console.error("[lockout] Failed to revoke Appwrite sessions:", error);
	}
}

export async function clearAuthCookies(): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.delete("appwrite-session");
	cookieStore.delete("2fa_completed");
	cookieStore.delete("2fa_user_id");
}

/** Clear cookies + best-effort current session delete. No redirect. */
export async function forceAuthReset(): Promise<{ success: true }> {
	await clearAuthCookies();
	try {
		const { account } = await createSessionClient();
		await account.deleteSession("current");
	} catch {
		// Session may already be gone
	}
	return { success: true };
}

export async function notifySuspiciousSignInAttempt(params: {
	email: string;
	fullName?: string | null;
	channel: "email-otp" | "2fa";
}): Promise<void> {
	const { email, fullName, channel } = params;
	if (!email) return;

	const name = (fullName || "there").split(" ")[0];
	const where =
		channel === "2fa" ? "two-factor authentication" : "email verification";

	try {
		const { mailgunService } = await import("@/lib/services/mailgun");
		await mailgunService.sendEmail({
			to: email,
			subject: "Security alert: Sign-in attempts on your CAALM account",
			text: `Hello ${name},

Someone tried to sign in to your CAALM account and failed ${where} too many times.

If this was you, wait a few minutes and sign in again with a new verification code.

If this was not you, we recommend:
- Do not share codes from your email or authenticator app
- Contact support if you keep seeing these alerts

This message was sent automatically. Your unused email verification codes for this attempt have been invalidated.

— CAALM Solutions`,
			html: `<p>Hello ${name},</p>
<p>Someone tried to sign in to your CAALM account and failed <strong>${where}</strong> too many times.</p>
<p>If this was you, wait a few minutes and sign in again with a new verification code.</p>
<p>If this was not you:</p>
<ul>
<li>Do not share codes from your email or authenticator app</li>
<li>Contact support if you keep seeing these alerts</li>
</ul>
<p>Unused email verification codes for this attempt have been invalidated.</p>
<p>— CAALM Solutions</p>`,
		});
	} catch (error) {
		console.error("[lockout] Failed to send security email:", error);
	}

	// Best-effort in-app notification (skip if type / user missing)
	try {
		const { tablesDB } = await createAdminClient();
		const users = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.usersCollectionId || "users",
			queries: [Query.equal("email", email), Query.limit(1)],
		});
		const user = users.rows?.[0];
		if (!user?.$id) return;

		const { NotificationService } = await import(
			"@/lib/services/notificationService"
		);
		const service = new NotificationService();
		await service.createNotification({
			userId: user.$id,
			type: "system_alert",
			title: "Suspicious sign-in attempts",
			message:
				"Someone tried to sign in to your account and failed too many times. Unused verification codes were invalidated.",
			priority: "high",
		});
	} catch {
		// Type may not exist; email is the primary signal
	}
}

export async function runLockoutSideEffects(params: {
	email?: string | null;
	accountId?: string | null;
	fullName?: string | null;
	channel: "email-otp" | "2fa";
}): Promise<void> {
	const email = params.email || undefined;
	const tasks: Promise<unknown>[] = [];

	if (params.accountId) {
		tasks.push(revokeAllSessionsForAccountId(params.accountId));
	}
	tasks.push(clearAuthCookies());
	if (email) {
		tasks.push(invalidateUnusedOtpsForEmail(email));
		tasks.push(
			notifySuspiciousSignInAttempt({
				email,
				fullName: params.fullName,
				channel: params.channel,
			}),
		);
	}

	await Promise.allSettled(tasks);
}
