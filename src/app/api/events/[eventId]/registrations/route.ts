import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getConstituentById } from "@/lib/constituents";
import {
	createRegistrationWithOptionalDonation,
	EventRegistrationCapacityError,
	getCalendarEventInOrg,
	listRegistrationsForEvent,
	RegistrationDonationPaymentError,
	RegistrationDonationValidationError,
	requireEventStaffContext,
	sendRegistrationConfirmationEmailIfEligible,
} from "@/lib/events";
import { createEventRegistration } from "@/lib/events/event-registrations.repository";
import type { EventRegistrationStatus } from "@/lib/events/types";
import { getTicketTypeById } from "@/lib/events/ticket-types.repository";

type RouteContext = { params: Promise<{ eventId: string }> };

function parseStatus(value: unknown): EventRegistrationStatus | null {
	if (
		value === "draft" ||
		value === "posted" ||
		value === "confirmed" ||
		value === "checked_in"
	) {
		return value;
	}
	return null;
}

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireEventStaffContext(
		request,
		PERMISSIONS.EVENTS.INVITE,
	);
	if (!ctx.ok) return ctx.response;

	const { eventId } = await context.params;
	try {
		const items = await listRegistrationsForEvent(ctx.orgId, eventId);
		return NextResponse.json({ items });
	} catch (error) {
		console.error("[events/registrations GET]", error);
		return NextResponse.json(
			{ error: "Failed to load registrations" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest, context: RouteContext) {
	const ctx = await requireEventStaffContext(
		request,
		PERMISSIONS.EVENTS.INVITE,
	);
	if (!ctx.ok) return ctx.response;

	const { eventId } = await context.params;
	try {
		const body = await request.json();
		const ticketTypeId = String(body.ticketTypeId || "").trim();
		if (!ticketTypeId) {
			return NextResponse.json(
				{ error: "ticketTypeId is required" },
				{ status: 400 },
			);
		}

		const ticketType = await getTicketTypeById(ctx.orgId, ticketTypeId);
		if (!ticketType || ticketType.eventId !== eventId) {
			return NextResponse.json(
				{ error: "Ticket type not found" },
				{ status: 404 },
			);
		}

		const status = parseStatus(body.status) ?? "draft";
		const constituentId = body.constituentId
			? String(body.constituentId).trim()
			: undefined;
		if (constituentId && status !== "draft") {
			const constituent = await getConstituentById(constituentId);
			if (!constituent || constituent.orgId !== ctx.orgId) {
				return NextResponse.json(
					{ error: "Constituent not found" },
					{ status: 404 },
				);
			}
		}

		const donationAmount =
			body.donationAmount != null ? Number(body.donationAmount) : 0;
		const paymentSucceeded = body.paymentSucceeded === true;

		const registrationInput = {
			orgId: ctx.orgId,
			eventId,
			ticketTypeId,
			status,
			constituentId,
			guestEmail: body.guestEmail
				? String(body.guestEmail).trim()
				: undefined,
			guestFirstName: body.guestFirstName
				? String(body.guestFirstName).trim()
				: undefined,
			guestLastName: body.guestLastName
				? String(body.guestLastName).trim()
				: undefined,
			amountCents:
				body.amountCents != null ? Number(body.amountCents) : undefined,
			donationAmount,
			paymentSucceeded,
		};

		const result =
			donationAmount > 0
				? await createRegistrationWithOptionalDonation(registrationInput)
				: {
						registration: await createEventRegistration(registrationInput),
					};

		if (status === "confirmed" || status === "posted") {
			const event = await getCalendarEventInOrg(ctx.orgId, eventId);
			await sendRegistrationConfirmationEmailIfEligible({
				orgId: ctx.orgId,
				registrationId: result.registration.$id,
				eventTitle: event?.title || "Event",
			});
		}

		return NextResponse.json(
			{
				registration: result.registration,
				giftId: result.giftId,
				registrationTransactionId:
					result.registration.registrationTransactionId,
			},
			{ status: 201 },
		);
	} catch (error) {
		if (error instanceof RegistrationDonationPaymentError) {
			return NextResponse.json({ error: "Payment failed" }, { status: 402 });
		}
		if (error instanceof RegistrationDonationValidationError) {
			return NextResponse.json(
				{ error: error.message },
				{ status: error.status },
			);
		}
		if (error instanceof EventRegistrationCapacityError) {
			return NextResponse.json(
				{ error: "Ticket type is at capacity" },
				{ status: 409 },
			);
		}
		if (error instanceof Error && error.message.includes("Draft")) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}
		console.error("[events/registrations POST]", error);
		return NextResponse.json(
			{ error: "Failed to create registration" },
			{ status: 500 },
		);
	}
}
