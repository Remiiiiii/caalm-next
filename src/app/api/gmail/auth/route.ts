import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { generateAuthUrl, validateGmailConfig } from "@/lib/gmail/oauth";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.INTEGRATIONS.GMAIL_CONNECT,
	});
	if (denied) return denied;

	try {
		const { isDemoMode } = await import("@/lib/config/demo-mode");
		if (isDemoMode()) {
			return NextResponse.redirect(
				`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings/billing?tab=integrations&error=demo_integrations_disabled`,
			);
		}

		validateGmailConfig();

		let userId: string;
		try {
			userId = await getCurrentUserId();
		} catch {
			return NextResponse.json(
				{ error: "Authentication required", action: "login" },
				{ status: 401 },
			);
		}

		const state = `${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		const cookieStore = await cookies();
		cookieStore.set("gmail-oauth-state", state, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 600,
		});

		return NextResponse.redirect(generateAuthUrl(state));
	} catch (error) {
		console.error("[SERVER] Gmail OAuth initiation error:", error);
		return NextResponse.json(
			{
				error: "Failed to initiate Gmail OAuth",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
