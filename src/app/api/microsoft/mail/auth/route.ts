import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getAppUrl } from "@/lib/config/environment";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";
import { generateAuthUrl, validateConfig } from "@/lib/microsoft/oauth";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.INTEGRATIONS.OUTLOOK_CONNECT,
	});
	if (denied) return denied;

	try {
		const { isDemoMode } = await import("@/lib/config/demo-mode");
		if (isDemoMode()) {
			return NextResponse.redirect(
				`${getAppUrl()}/settings/billing?tab=integrations&error=demo_integrations_disabled`,
			);
		}

		validateConfig();

		let userId: string;
		try {
			userId = await getCurrentUserId();
		} catch {
			return NextResponse.json(
				{
					error: "Authentication required",
					message:
						"Please log in to CAALM before connecting Microsoft 365 Mail",
					action: "login",
				},
				{ status: 401 },
			);
		}

		const state = `${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		const cookieStore = await cookies();
		cookieStore.set("microsoft-oauth-state", state, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 600,
		});
		// Same redirect URI as calendar; purpose cookie tells the callback which vault to fill.
		cookieStore.set("microsoft-oauth-purpose", "mail", {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 600,
		});

		const authUrl = generateAuthUrl(state, "mail");
		return NextResponse.redirect(authUrl);
	} catch (error) {
		console.error("[SERVER] Outlook mail OAuth initiation error:", error);
		return NextResponse.json(
			{
				error: "Failed to initiate Outlook mail OAuth",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
