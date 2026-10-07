import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { signNewsOAuthState } from "@/lib/news/social/oauth-state";
import { linkedinAuthUrl } from "@/lib/news/social/linkedin-adapter";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.NEWS.FEEDS_MANAGE,
	});
	if (denied) return denied;
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return NextResponse.json({ error: "Organization not found" }, { status: 400 });
	}
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
	const redirectBase = `${appUrl}/dashboard/content-creator?tab=sources`;
	try {
		const state = signNewsOAuthState({
			orgId: org.orgId,
			userId: user.$id,
			provider: "linkedin",
			exp: Date.now() + 10 * 60 * 1000,
		});
		const cookieStore = await cookies();
		cookieStore.set("news-linkedin-oauth-state", state, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 600,
		});
		return NextResponse.redirect(linkedinAuthUrl(state));
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "LinkedIn OAuth failed";
		const code = message.includes("not configured")
			? "linkedin_not_configured"
			: "linkedin_oauth";
		return NextResponse.redirect(`${redirectBase}&error=${code}`);
	}
}
