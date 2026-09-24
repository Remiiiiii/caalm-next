import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { checkInWithRegistrationToken, requireEventStaffContext } from "@/lib/events";

export async function POST(request: NextRequest) {
	const ctx = await requireEventStaffContext(
		request,
		PERMISSIONS.EVENTS.INVITE,
	);
	if (!ctx.ok) return ctx.response;

	try {
		const body = await request.json();
		const token = String(body.token || "").trim();
		if (!token) {
			return NextResponse.json({ error: "token is required" }, { status: 400 });
		}

		const result = await checkInWithRegistrationToken({
			token,
			actor: {
				userId: ctx.user.$id,
				userName: ctx.user.name || ctx.user.email || "Staff",
				userEmail: ctx.user.email || "",
			},
		});

		if (!result.ok) {
			return NextResponse.json(
				{ error: result.error, reason: result.reason },
				{ status: result.status },
			);
		}

		return NextResponse.json({
			registration: result.registration,
			ticketTypeName: result.ticketTypeName,
			displayName: result.displayName,
		});
	} catch (error) {
		console.error("[events/check-in POST]", error);
		return NextResponse.json({ error: "Check-in failed" }, { status: 500 });
	}
}
