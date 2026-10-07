import type { IngestItem } from "@/lib/news/ingest/types";
import { sanitizeIngestItem } from "@/lib/news/ingest/sanitize-import";

const AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.twitter.com/2/oauth2/token";

export function xAuthUrl(state: string, codeChallenge: string): string {
	const clientId = process.env.X_CLIENT_ID;
	const redirectUri = process.env.X_REDIRECT_URI;
	if (!clientId || !redirectUri) {
		throw new Error("X OAuth is not configured");
	}
	const params = new URLSearchParams({
		response_type: "code",
		client_id: clientId,
		redirect_uri: redirectUri,
		scope: "tweet.read users.read offline.access",
		state,
		code_challenge: codeChallenge,
		code_challenge_method: "S256",
	});
	return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeXCode(options: {
	code: string;
	codeVerifier: string;
}): Promise<{
	accessToken: string;
	refreshToken?: string;
	expiresAt?: string;
}> {
	const clientId = process.env.X_CLIENT_ID;
	const clientSecret = process.env.X_CLIENT_SECRET;
	const redirectUri = process.env.X_REDIRECT_URI;
	if (!clientId || !clientSecret || !redirectUri) {
		throw new Error("X OAuth is not configured");
	}
	const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
	const body = new URLSearchParams({
		grant_type: "authorization_code",
		code: options.code,
		redirect_uri: redirectUri,
		code_verifier: options.codeVerifier,
		client_id: clientId,
	});
	const response = await fetch(TOKEN_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: `Basic ${basic}`,
		},
		body,
	});
	if (!response.ok) {
		throw new Error(`X token exchange failed (${response.status})`);
	}
	const json = (await response.json()) as {
		access_token?: string;
		refresh_token?: string;
		expires_in?: number;
	};
	if (!json.access_token) throw new Error("X did not return an access token");
	return {
		accessToken: json.access_token,
		refreshToken: json.refresh_token,
		expiresAt: json.expires_in
			? new Date(Date.now() + json.expires_in * 1000).toISOString()
			: undefined,
	};
}

export async function fetchXPosts(options: {
	accessToken: string;
	userId?: string | null;
}): Promise<IngestItem[]> {
	const userId = options.userId || "me";
	const meResponse = await fetch(
		userId === "me"
			? "https://api.twitter.com/2/users/me"
			: `https://api.twitter.com/2/users/${encodeURIComponent(userId)}`,
		{ headers: { Authorization: `Bearer ${options.accessToken}` } },
	);
	if (!meResponse.ok) {
		throw new Error(`X user lookup failed (${meResponse.status})`);
	}
	const me = (await meResponse.json()) as {
		data?: { id?: string; username?: string };
	};
	const accountId = me.data?.id;
	const username = me.data?.username || "x";
	if (!accountId) return [];

	const tweetsResponse = await fetch(
		`https://api.twitter.com/2/users/${accountId}/tweets?max_results=20&tweet.fields=created_at`,
		{ headers: { Authorization: `Bearer ${options.accessToken}` } },
	);
	if (!tweetsResponse.ok) {
		throw new Error(`X tweets fetch failed (${tweetsResponse.status})`);
	}
	const json = (await tweetsResponse.json()) as {
		data?: Array<{ id?: string; text?: string; created_at?: string }>;
	};
	const items: IngestItem[] = [];
	for (const tweet of json.data || []) {
		const id = tweet.id || "";
		const sanitized = sanitizeIngestItem({
			externalId: id,
			title: (tweet.text || "Post on X").slice(0, 120),
			excerpt: tweet.text || "",
			canonicalUrl: id ? `https://x.com/${username}/status/${id}` : "",
			publishedAt: tweet.created_at || null,
		});
		if (sanitized) items.push(sanitized);
	}
	return items;
}
