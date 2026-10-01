import { appwriteConfig } from "@/lib/appwrite/config";
import { getAppUrl } from "@/lib/config/environment";

export const GMAIL_SCOPES = [
	// modify includes read + label changes (archive, trash, read/unread)
	"https://www.googleapis.com/auth/gmail.modify",
	"https://www.googleapis.com/auth/gmail.compose",
	"https://www.googleapis.com/auth/gmail.send",
	"openid",
	"email",
	"profile",
].join(" ");

export interface GoogleTokens {
	access_token: string;
	refresh_token?: string;
	expires_in: number;
	token_type: string;
	scope?: string;
}

export interface GoogleUserInfo {
	email: string;
	name?: string;
	picture?: string;
}

export function getGmailRedirectUri(): string {
	return (
		appwriteConfig.googleGmailRedirectUri ||
		`${getAppUrl()}/api/auth/callback/gmail`
	);
}

export function generateAuthUrl(state: string): string {
	const params = new URLSearchParams({
		client_id: appwriteConfig.googleClientId!,
		response_type: "code",
		redirect_uri: getGmailRedirectUri(),
		scope: GMAIL_SCOPES,
		access_type: "offline",
		prompt: "consent",
		state,
		include_granted_scopes: "true",
	});

	return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
	const body = new URLSearchParams({
		client_id: appwriteConfig.googleClientId!,
		client_secret: appwriteConfig.googleClientSecret!,
		code,
		grant_type: "authorization_code",
		redirect_uri: getGmailRedirectUri(),
	});

	const response = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: body.toString(),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Google token exchange failed: ${error}`);
	}

	return response.json();
}

export async function refreshAccessToken(
	refreshToken: string,
): Promise<GoogleTokens> {
	const body = new URLSearchParams({
		client_id: appwriteConfig.googleClientId!,
		client_secret: appwriteConfig.googleClientSecret!,
		refresh_token: refreshToken,
		grant_type: "refresh_token",
	});

	const response = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: body.toString(),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Google token refresh failed: ${error}`);
	}

	return response.json();
}

export async function getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
	const response = await fetch(
		"https://www.googleapis.com/oauth2/v2/userinfo",
		{
			headers: { Authorization: `Bearer ${accessToken}` },
		},
	);

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to get Google user info: ${error}`);
	}

	return response.json();
}

export async function revokeToken(token: string): Promise<void> {
	await fetch(
		`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
		{ method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" } },
	);
}

export function validateGmailConfig(): void {
	if (!appwriteConfig.googleClientId || !appwriteConfig.googleClientSecret) {
		throw new Error(
			"Missing required Gmail OAuth configuration: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET",
		);
	}
	getGmailRedirectUri();
}
