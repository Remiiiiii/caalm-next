import { type NextRequest, NextResponse } from "next/server";
import { verifyOTP } from "@/lib/actions/user.actions";
import { findInvitee } from "@/lib/contracts/negotiation/access.logic";
import { resolveAccessByToken } from "@/lib/contracts/negotiation/access.service";
import {
	encodeNegotiateSession,
	NEGOTIATE_SESSION_COOKIE,
	NEGOTIATE_SESSION_TTL_MS,
	negotiateSessionCookieOptions,
} from "@/lib/contracts/negotiation/session.logic";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
	const { token } = await context.params;
	const access = await resolveAccessByToken(token);
	if (!access) {
		return NextResponse.json(
			{ error: "Link expired or invalid" },
			{ status: 401 },
		);
	}

	const body = (await request.json().catch(() => ({}))) as {
		email?: string;
		otp?: string;
	};
	const email = String(body.email || "")
		.trim()
		.toLowerCase();
	const otp = String(body.otp || "").trim();
	const matched = findInvitee(access.invitees, email);
	if (!matched) {
		return NextResponse.json(
			{ error: "This email is not invited to this document" },
			{ status: 403 },
		);
	}
	if (!otp || otp.length < 4) {
		return NextResponse.json(
			{ error: "Enter the verification code from your email" },
			{ status: 400 },
		);
	}

	try {
		await verifyOTP({ email: matched.email, otp });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Invalid verification code";
		return NextResponse.json({ error: message }, { status: 400 });
	}

	const value = encodeNegotiateSession({
		accessId: access.$id,
		email: matched.email,
	});
	const response = NextResponse.json({
		ok: true,
		invitee: matched,
	});
	response.cookies.set(
		NEGOTIATE_SESSION_COOKIE,
		value,
		negotiateSessionCookieOptions(Math.floor(NEGOTIATE_SESSION_TTL_MS / 1000)),
	);
	return response;
}
