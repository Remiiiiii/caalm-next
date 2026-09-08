import { type NextRequest, NextResponse } from "next/server";
import { resolveAccessByToken } from "@/lib/contracts/negotiation/access.service";
import { resolveNegotiateSession } from "@/lib/contracts/negotiation/session.service";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const { token } = await context.params;
	const access = await resolveAccessByToken(token);
	if (!access) {
		return NextResponse.json(
			{ error: "Link expired or invalid" },
			{ status: 401 },
		);
	}
	const session = resolveNegotiateSession(request, access);
	if (!session) {
		return NextResponse.json({ authenticated: false });
	}
	return NextResponse.json({
		authenticated: true,
		invitee: session.invitee,
	});
}
