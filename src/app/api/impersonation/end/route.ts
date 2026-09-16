import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { logImpersonationAudit } from "@/lib/impersonation/audit";
import { getEffectiveUser } from "@/lib/impersonation/effective-user";
import {
	clearImpersonationCookie,
	readImpersonationClaim,
} from "@/lib/impersonation/session";

export async function POST(request: NextRequest) {
	const actor = await getCurrentUser();
	if (!actor) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	const claim = readImpersonationClaim(request);
	if (!claim) {
		const response = NextResponse.json({ active: false });
		clearImpersonationCookie(response);
		return response;
	}

	if (claim.actorUserId !== actor.$id) {
		return NextResponse.json(
			{ error: "Only the admin who started this session can end it." },
			{ status: 403 },
		);
	}

	const effective = await getEffectiveUser(request);
	const response = NextResponse.json({
		active: false,
		endedTargetUserId: claim.targetUserId,
	});
	clearImpersonationCookie(response);

	await logImpersonationAudit({
		actor,
		targetUserId: claim.targetUserId,
		targetLabel: effective?.impersonation?.target.fullName,
		orgId: claim.orgId,
		reason: claim.reason,
		kind: "end",
		status: "success",
		request,
	});

	return response;
}

export function GET() {
	return new NextResponse("Method Not Allowed", { status: 405 });
}
