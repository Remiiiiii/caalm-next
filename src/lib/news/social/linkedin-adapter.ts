import type { IngestItem } from "@/lib/news/ingest/types";
import { sanitizeIngestItem } from "@/lib/news/ingest/sanitize-import";

const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";

export function linkedinAuthUrl(state: string): string {
	const clientId = process.env.LINKEDIN_CLIENT_ID;
	const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
	if (!clientId || !redirectUri) {
		throw new Error("LinkedIn OAuth is not configured");
	}
	const params = new URLSearchParams({
		response_type: "code",
		client_id: clientId,
		redirect_uri: redirectUri,
		state,
		scope: "r_organization_social r_basicprofile offline_access",
	});
	return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeLinkedInCode(code: string): Promise<{
	accessToken: string;
	refreshToken?: string;
	expiresAt?: string;
}> {
	const clientId = process.env.LINKEDIN_CLIENT_ID;
	const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
	const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
	if (!clientId || !clientSecret || !redirectUri) {
		throw new Error("LinkedIn OAuth is not configured");
	}
	const body = new URLSearchParams({
		grant_type: "authorization_code",
		code,
		redirect_uri: redirectUri,
		client_id: clientId,
		client_secret: clientSecret,
	});
	const response = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body,
	});
	if (!response.ok) {
		const detail = await response.text().catch(() => "");
		throw new Error(
			`LinkedIn token exchange failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
		);
	}
	const json = (await response.json()) as {
		access_token?: string;
		refresh_token?: string;
		expires_in?: number;
	};
	if (!json.access_token) throw new Error("LinkedIn did not return an access token");
	return {
		accessToken: json.access_token,
		refreshToken: json.refresh_token,
		expiresAt: json.expires_in
			? new Date(Date.now() + json.expires_in * 1000).toISOString()
			: undefined,
	};
}

export async function fetchLinkedInPosts(options: {
	accessToken: string;
	organizationUrn?: string | null;
}): Promise<IngestItem[]> {
	const author = options.organizationUrn
		? encodeURIComponent(options.organizationUrn)
		: "";
	const url = author
		? `https://api.linkedin.com/rest/posts?q=author&author=${author}&count=20`
		: "https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List()&count=1";
	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${options.accessToken}`,
			"LinkedIn-Version": "202401",
			"X-Restli-Protocol-Version": "2.0.0",
		},
	});
	if (!response.ok) {
		throw new Error(`LinkedIn posts fetch failed (${response.status})`);
	}
	const json = (await response.json()) as {
		elements?: Array<{
			id?: string;
			commentary?: string;
			content?: { article?: { source?: string; thumbnail?: string } };
		}>;
	};
	const items: IngestItem[] = [];
	for (const post of json.elements || []) {
		const sanitized = sanitizeIngestItem({
			externalId: post.id || "",
			title: (post.commentary || "LinkedIn post").slice(0, 120),
			excerpt: post.commentary || "",
			canonicalUrl:
				post.content?.article?.source ||
				(post.id
					? `https://www.linkedin.com/feed/update/${encodeURIComponent(post.id)}`
					: ""),
			imageUrl: post.content?.article?.thumbnail || null,
		});
		if (sanitized) items.push(sanitized);
	}
	return items;
}
