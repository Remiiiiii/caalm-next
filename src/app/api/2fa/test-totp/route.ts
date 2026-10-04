import { NextResponse } from "next/server";
import {
	isSessionUserError,
	requireSessionUser,
} from "@/lib/auth/require-session-user";
import {
	generateTOTPCode,
	generateTOTPQRUrl,
	generateTOTPSecret,
	verifyTOTPCode,
} from "@/lib/totp";

/**
 * Dev-only TOTP self-test. Blocked outside development.
 */
export async function GET() {
	if (process.env.NODE_ENV !== "development") {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const session = await requireSessionUser();
	if (isSessionUserError(session)) return session;

	try {
		const secret = generateTOTPSecret();
		const code = generateTOTPCode(secret);
		const isValid = verifyTOTPCode({ secret, code });
		const qrUrl = generateTOTPQRUrl({
			secret,
			accountName: "test@example.com",
			issuer: "CAALM",
		});

		return NextResponse.json({
			success: true,
			test: {
				secret,
				generatedCode: code,
				isValid,
				qrUrl,
				timestamp: new Date().toISOString(),
			},
			message: "TOTP functionality test completed",
		});
	} catch (error) {
		console.error("Error testing TOTP:", error);
		return NextResponse.json(
			{ error: "Failed to test TOTP functionality" },
			{ status: 500 },
		);
	}
}
