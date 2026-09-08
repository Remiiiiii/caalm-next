import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { readStepUpGrant } from "@/lib/auth/step-up";

export async function GET(_request: NextRequest) {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const grant = readStepUpGrant(_request, user.$id);
		return NextResponse.json({
			success: true,
			verified: grant.verified,
			expiresAt: grant.expiresAt,
		});
	} catch (error) {
		console.error("[SERVER] auth/step-up/status GET:", error);
		return NextResponse.json(
			{ error: "Failed to read step-up status" },
			{ status: 500 },
		);
	}
}
