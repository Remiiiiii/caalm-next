import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getEffectiveUser } from "@/lib/impersonation/effective-user";
import {
	clearImpersonationCookie,
	isImpersonationClaimActive,
	readImpersonationClaim,
} from "@/lib/impersonation/session";

export async function GET(request: NextRequest) {
	const actor = await getCurrentUser();
	if (!actor) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	const context = await getEffectiveUser(request);
	if (!context) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	const claim = readImpersonationClaim(request);
	if (claim && !isImpersonationClaimActive(claim)) {
		const response = NextResponse.json({
			active: false,
			expired: true,
		});
		clearImpersonationCookie(response);
		return response;
	}

	if (!context.impersonation) {
		return NextResponse.json({ active: false });
	}

	return NextResponse.json({
		active: true,
		readOnly: true,
		actorUserId: context.impersonation.actorUserId,
		orgId: context.impersonation.orgId,
		reason: context.impersonation.reason,
		startedAt: context.impersonation.startedAt,
		expiresAt: context.impersonation.expiresAt,
		target: context.impersonation.target,
	});
}

export function POST() {
	return new NextResponse("Method Not Allowed", { status: 405 });
}
