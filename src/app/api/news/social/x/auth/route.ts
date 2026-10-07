import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { signNewsOAuthState } from "@/lib/news/social/oauth-state";
import { xAuthUrl } from "@/lib/news/social/x-adapter";
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
		const verifier = randomBytes(32).toString("base64url");
		const challenge = createHash("sha256").update(verifier).digest("base64url");
		const state = signNewsOAuthState({
			orgId: org.orgId,
			userId: user.$id,
			provider: "x",
			exp: Date.now() + 10 * 60 * 1000,
		});
		const cookieStore = await cookies();
		cookieStore.set("news-x-oauth-state", state, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 600,
		});
		cookieStore.set("news-x-code-verifier", verifier, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 600,
		});
		return NextResponse.redirect(xAuthUrl(state, challenge));
	} catch (error) {
		const message = error instanceof Error ? error.message : "X OAuth failed";
		const code = message.includes("not configured")
			? "x_not_configured"
			: "x_oauth";
		return NextResponse.redirect(`${redirectBase}&error=${code}`);
	}
}
