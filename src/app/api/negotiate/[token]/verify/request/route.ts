import { type NextRequest, NextResponse } from "next/server";
import { sendEmailOTP } from "@/lib/actions/user.actions";
import { findInvitee } from "@/lib/contracts/negotiation/access.logic";
import { resolveAccessByToken } from "@/lib/contracts/negotiation/access.service";

type RouteContext = { params: Promise<{ token: string }> };

/**
 * Request an OTP for an allowlisted invitee email.
 * Does not reveal whether other emails exist — only succeeds for invitees.
 */
export async function POST(request: NextRequest, context: RouteContext) {
	const { token } = await context.params;
	const access = await resolveAccessByToken(token);
	if (!access) {
		return NextResponse.json(
			{ error: "Link expired or invalid" },
			{ status: 401 },
		);
	}

	const body = (await request.json().catch(() => ({}))) as { email?: string };
	const email = String(body.email || "")
		.trim()
		.toLowerCase();
	const matched = findInvitee(access.invitees, email);
	if (!matched) {
		return NextResponse.json(
			{ error: "This email is not invited to this document" },
			{ status: 403 },
		);
	}

	try {
		await sendEmailOTP({ email: matched.email });
		return NextResponse.json({
			ok: true,
			email: matched.email,
			name: matched.name,
		});
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "Could not send verification code";
		return NextResponse.json({ error: message }, { status: 429 });
	}
}
