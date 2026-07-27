/**
 * Demo-mode session helper: set 2FA cookies without TOTP.
 * Only available when APP_MODE=demo.
 */

import { type NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/actions/user.actions";
import { isDemoMode } from "@/lib/config/demo-mode";

export async function POST(request: NextRequest) {
	if (!isDemoMode()) {
		return NextResponse.json(
			{ error: "Demo session is only available in demo mode" },
			{ status: 403 },
		);
	}

	try {
		const body = await request.json();
		const email = typeof body.email === "string" ? body.email.trim() : "";
		if (!email) {
			return NextResponse.json({ error: "Email is required" }, { status: 400 });
		}

		const user = await getUserByEmail(email);
		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const response = NextResponse.json({
			success: true,
			userId: user.$id,
			accountId: user.accountId,
		});

		const cookieOpts = {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax" as const,
			maxAge: 60 * 60 * 24 * 7,
		};

		response.cookies.set("2fa_completed", "true", cookieOpts);
		response.cookies.set("2fa_user_id", user.$id, cookieOpts);

		return response;
	} catch (error) {
		console.error("[demo/session] Error:", error);
		return NextResponse.json(
			{ error: "Failed to create demo session" },
			{ status: 500 },
		);
	}
}
