import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	createRegistrationToken,
	getRegistrationById,
	registrationQrPayload,
	requireEventStaffContext,
} from "@/lib/events";

type RouteContext = { params: Promise<{ registrationId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireEventStaffContext(
		request,
		PERMISSIONS.EVENTS.INVITE,
	);
	if (!ctx.ok) return ctx.response;

	const { registrationId } = await context.params;
	const registration = await getRegistrationById(ctx.orgId, registrationId);
	if (!registration) {
		return NextResponse.json(
			{ error: "Registration not found" },
			{ status: 404 },
		);
	}

	const token = createRegistrationToken(registration.$id, registration.orgId);
	return NextResponse.json({
		token,
		qrPayload: registrationQrPayload(token),
	});
}
