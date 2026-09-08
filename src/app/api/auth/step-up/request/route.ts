import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser, sendEmailOTP } from "@/lib/actions/user.actions";

export async function POST(_request: NextRequest) {
	try {
		const user = await getCurrentUser();
		if (!user?.email) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		await sendEmailOTP({ email: user.email });

		return NextResponse.json({
			success: true,
			message: "Verification code sent",
		});
	} catch (error) {
		console.error("[SERVER] auth/step-up/request POST:", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to send verification code",
			},
			{ status: 500 },
		);
	}
}
