import { appwriteConfig } from "@/lib/appwrite/config";
import { getRedirectUri } from "@/lib/config/environment";

export interface MicrosoftTokens {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	token_type: string;
	scope: string;
}

export interface MicrosoftUser {
	id: string;
	displayName: string;
	mail: string;
	userPrincipalName: string;
}

/**
 * Generate Microsoft OAuth authorization URL
 */
export function generateAuthUrl(state?: string): string {
	// Use smart detection for redirect URI
	const redirectUri = getRedirectUri();

	const params = new URLSearchParams({
		client_id: appwriteConfig.microsoftClientId!,
		response_type: "code",
		redirect_uri: redirectUri,
		scope: "Calendars.Read Calendars.ReadWrite offline_access User.Read",
		response_mode: "query",
		state: state || "default",
	});

	const tenantId = appwriteConfig.microsoftTenantId || "common";
	return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access tokens
 */
export async function exchangeCodeForTokens(
	code: string,
	_state?: string,
): Promise<MicrosoftTokens> {
	const tokenEndpoint = `https://login.microsoftonline.com/${
		appwriteConfig.microsoftTenantId || "common"
	}/oauth2/v2.0/token`;

	// Use smart detection for redirect URI
	const redirectUri = getRedirectUri();

	const body = new URLSearchParams({
		client_id: appwriteConfig.microsoftClientId!,
		client_secret: appwriteConfig.microsoftClientSecret!,
		code,
		redirect_uri: redirectUri,
		grant_type: "authorization_code",
	});

	const response = await fetch(tokenEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: body.toString(),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Token exchange failed: ${error}`);
	}

	return response.json();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
	refreshToken: string,
): Promise<MicrosoftTokens> {
	const tokenEndpoint = `https://login.microsoftonline.com/${
		appwriteConfig.microsoftTenantId || "common"
	}/oauth2/v2.0/token`;

	// Use smart detection for redirect URI
	const _redirectUri = getRedirectUri();

	const body = new URLSearchParams({
		client_id: appwriteConfig.microsoftClientId!,
		client_secret: appwriteConfig.microsoftClientSecret!,
		refresh_token: refreshToken,
		grant_type: "refresh_token",
	});

	const response = await fetch(tokenEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: body.toString(),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Token refresh failed: ${error}`);
	}

	return response.json();
}

/**
 * Get user information from Microsoft Graph
 */
export async function getUserInfo(accessToken: string): Promise<MicrosoftUser> {
	const response = await fetch("https://graph.microsoft.com/v1.0/me", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to get user info: ${error}`);
	}

	return response.json();
}

/**
 * Check if token is expired or will expire soon
 */
export function isTokenExpired(
	expiryDate: Date,
	bufferMinutes: number = 5,
): boolean {
	const now = new Date();
	const bufferTime = new Date(now.getTime() + bufferMinutes * 60 * 1000);
	return expiryDate <= bufferTime;
}

/**
 * Calculate token expiry date from expires_in seconds
 */
export function calculateTokenExpiry(expiresIn: number): Date {
	const now = new Date();
	return new Date(now.getTime() + expiresIn * 1000);
}

/**
 * Validate Microsoft OAuth configuration
 */
export function validateConfig(): void {
	const required = ["microsoftClientId", "microsoftClientSecret"];

	for (const key of required) {
		if (!appwriteConfig[key as keyof typeof appwriteConfig]) {
			throw new Error(`Missing required Microsoft OAuth configuration: ${key}`);
		}
	}

	// Validate that redirect URI can be generated
	try {
		getRedirectUri();
	} catch (error) {
		throw new Error(`Invalid redirect URI configuration: ${error}`);
	}
}
