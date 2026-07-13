import { type NextRequest, NextResponse } from "next/server";
import { verifyOTP } from "@/lib/actions/user.actions";
import { logAuditEvent } from "@/lib/services/audit-logger";

export async function POST(request: NextRequest) {
	try {
		const { email, otp, accountId } = await request.json();

		if (!email || !otp) {
			return NextResponse.json(
				{ error: "Email and OTP are required" },
				{ status: 400 },
			);
		}

		const result = await verifyOTP({ email, otp, accountId });

		if (result?.success) {
			await logAuditEvent({
				event_id: `auth_login_${Date.now()}`,
				event_title: "User login",
				action: "login",
				source: "caalm",
				user_id: accountId || email,
				user_name: email,
				user_email: email,
				status: "success",
				module: "auth",
				target_type: "session",
				target_label: email,
				summary: `${email} logged in`,
				ip_address:
					request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
					undefined,
				user_agent: request.headers.get("user-agent") || undefined,
			});

			return NextResponse.json({
				success: true,
				message: "OTP verified successfully",
				accountId: result.accountId,
			});
		}

		await logAuditEvent({
			event_id: `auth_login_failed_${Date.now()}`,
			event_title: "Failed login attempt",
			action: "login",
			source: "caalm",
			user_id: accountId || email,
			user_name: email,
			user_email: email,
			status: "failed",
			module: "auth",
			target_type: "session",
			target_label: email,
			summary: `Failed login attempt for ${email}`,
			error_message: "Invalid OTP",
			ip_address:
				request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
				undefined,
			user_agent: request.headers.get("user-agent") || undefined,
		});

		return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			console.error("OTP verification error:", error);
		}
		return NextResponse.json(
			{
				error: "Failed to verify OTP",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

export async function GET() {
	return NextResponse.json({
		message: "OTP Verification API",
		usage: "POST with { email, otp }",
		example: {
			email: "support@caalmsolutions.com",
			otp: "123456",
		},
	});
}
