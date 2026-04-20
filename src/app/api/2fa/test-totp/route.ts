import { NextResponse } from "next/server";
import {
	generateTOTPCode,
	generateTOTPQRUrl,
	generateTOTPSecret,
	verifyTOTPCode,
} from "@/lib/totp";

export async function GET() {
	try {
		// Test TOTP functionality
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
				secret: secret,
				generatedCode: code,
				isValid: isValid,
				qrUrl: qrUrl,
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
