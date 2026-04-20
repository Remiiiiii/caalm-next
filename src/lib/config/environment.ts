/**
 * Environment configuration with automatic detection
 */

interface EnvironmentConfig {
	appUrl: string;
	redirectUri: string;
	microsoftClientId: string;
	microsoftClientSecret: string;
	microsoftTenantId: string;
	isDevelopment: boolean;
	isProduction: boolean;
}

function getEnvironmentConfig(): EnvironmentConfig {
	const isDevelopment = process.env.NODE_ENV === "development";
	const isProduction = process.env.NODE_ENV === "production";

	// Auto-detect environment and set appropriate URLs
	const appUrl =
		process.env.NEXT_PUBLIC_APP_URL ||
		(isDevelopment
			? "http://localhost:3000"
			: "https://www.caalmsolutions.com");

	const redirectUri =
		process.env.NEXT_PUBLIC_REDIRECT_URI ||
		`${appUrl}/api/auth/callback/microsoft`;

	return {
		appUrl,
		redirectUri,
		microsoftClientId: process.env.MICROSOFT_CLIENT_ID || "",
		microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
		microsoftTenantId: process.env.MICROSOFT_TENANT_ID || "",
		isDevelopment,
		isProduction,
	};
}

export const env = getEnvironmentConfig();

// Helper functions
export const isDevelopment = () => env.isDevelopment;
export const isProduction = () => env.isProduction;
export const getAppUrl = () => env.appUrl;
export const getRedirectUri = () => env.redirectUri;
