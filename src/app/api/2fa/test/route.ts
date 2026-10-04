import { NextResponse } from "next/server";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	isSessionUserError,
	requireSessionUser,
} from "@/lib/auth/require-session-user";

/**
 * Dev-only configuration probe. Blocked outside development.
 */
export async function GET() {
	if (process.env.NODE_ENV !== "development") {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const session = await requireSessionUser();
	if (isSessionUserError(session)) return session;

	try {
		const config = {
			endpointUrl: appwriteConfig.endpointUrl,
			projectId: appwriteConfig.projectId,
			hasSecretKey: !!appwriteConfig.secretKey,
			secretKeyLength: appwriteConfig.secretKey
				? appwriteConfig.secretKey.length
				: 0,
		};

		return NextResponse.json({
			success: true,
			config,
			message: "Configuration check completed",
		});
	} catch (error) {
		console.error("Error checking configuration:", error);
		return NextResponse.json(
			{ error: "Failed to check configuration" },
			{ status: 500 },
		);
	}
}
