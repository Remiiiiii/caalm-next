import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { createNewsFeed } from "@/lib/database/news-feeds";
import { upsertNewsSocialConnection } from "@/lib/database/news-social-connections";
import { parseNewsOAuthState } from "@/lib/news/social/oauth-state";
import { exchangeXCode } from "@/lib/news/social/x-adapter";

export async function GET(request: NextRequest) {
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const cookieStore = await cookies();
	const cookieState = cookieStore.get("news-x-oauth-state")?.value;
	const verifier = cookieStore.get("news-x-code-verifier")?.value;
	const parsed = parseNewsOAuthState(state || cookieState);
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
	const redirectBase = `${appUrl}/dashboard/content-creator?tab=sources`;
	if (!code || !verifier || !parsed || parsed.provider !== "x") {
		return NextResponse.redirect(`${redirectBase}&error=x_oauth`);
	}
	try {
		const tokens = await exchangeXCode({ code, codeVerifier: verifier });
		const connection = await upsertNewsSocialConnection({
			orgId: parsed.orgId,
			provider: "x",
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			expiresAt: tokens.expiresAt,
			connectedBy: parsed.userId,
		});
		await createNewsFeed({
			orgId: parsed.orgId,
			name: "X",
			type: "x",
			socialConnectionId: connection.$id,
		});
		cookieStore.delete("news-x-oauth-state");
		cookieStore.delete("news-x-code-verifier");
		return NextResponse.redirect(`${redirectBase}&connected=x`);
	} catch {
		return NextResponse.redirect(`${redirectBase}&error=x_oauth`);
	}
}
