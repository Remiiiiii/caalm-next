import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { issueStepUpGrant } from "@/lib/auth/step-up";
import { verifyStepUpOtp } from "@/lib/auth/step-up-otp";
import { logAuditEvent } from "@/lib/services/audit-logger";

const bodySchema = z.object({
	otp: z.string().trim().min(6).max(6),
});

export async function POST(request: NextRequest) {
	try {
		const user = await getCurrentUser();
		if (!user?.email) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const parsed = bodySchema.safeParse(await request.json());
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Enter a 6-digit verification code" },
				{ status: 400 },
			);
		}

		const result = await verifyStepUpOtp(user.email, parsed.data.otp);
		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}

		const response = NextResponse.json({
			success: true,
			message: "Verification successful",
		});
		const expiresAt = issueStepUpGrant(user.$id, response);

		await logAuditEvent({
			event_id: `step_up_verified_${user.$id}_${Date.now()}`,
			event_title: "Step-up verification completed",
			action: "update",
			source: "caalm",
			user_id: user.$id,
			user_name:
				(user as { fullName?: string }).fullName || user.email || "unknown",
			user_email: user.email || "",
			status: "success",
			module: "auth",
			target_type: "session",
			target_id: user.$id,
			target_label: user.email,
			summary: `${user.email} completed step-up verification`,
		}).catch(() => undefined);

		return NextResponse.json(
			{
				success: true,
				message: "Verification successful",
				expiresAt,
			},
			{
				headers: response.headers,
			},
		);
	} catch (error) {
		console.error("[SERVER] auth/step-up/verify POST:", error);
		return NextResponse.json(
			{ error: "Failed to verify code" },
			{ status: 500 },
		);
	}
}
