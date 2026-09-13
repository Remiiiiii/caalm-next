import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Account, Client } from "node-appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export async function GET() {
	try {
		const cookieStore = await cookies();
		const session = cookieStore.get("appwrite-session");

		if (session?.value) {
			const client = new Client()
				.setEndpoint(appwriteConfig.endpointUrl)
				.setProject(appwriteConfig.projectId)
				.setSession(session.value);

			const account = new Account(client);

			try {
				const user = await account.get();
				return NextResponse.json({
					valid: true,
					user: {
						$id: user.$id,
						email: user.email,
						name: user.name,
					},
				});
			} catch {
				// Fall through to 2FA cookie check — session cookie may be stale.
			}
		}

		// CAALM app sessions often use httpOnly 2FA cookies (same as proxy auth).
		const hasCompleted2FA = cookieStore.get("2fa_completed")?.value === "true";
		const twoFaUserId = cookieStore.get("2fa_user_id")?.value;
		if (hasCompleted2FA && twoFaUserId) {
			return NextResponse.json({
				valid: true,
				auth: "2fa",
				user: {
					$id: twoFaUserId,
				},
			});
		}

		return NextResponse.json(
			{ valid: false, reason: session?.value ? "invalid_session" : "no_session" },
			{ status: 401 },
		);
	} catch (error) {
		console.error("Session validation error:", error);
		return NextResponse.json(
			{ valid: false, reason: "validation_error" },
			{ status: 500 },
		);
	}
}
