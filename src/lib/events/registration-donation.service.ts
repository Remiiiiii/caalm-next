import { ID } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { createDraftGift, postGift } from "@/lib/gifts/repository";
import { GiftDomainError } from "@/lib/gifts/repository";
import { getCalendarEventInOrg } from "./calendar-event-access";
import {
	createEventRegistration,
	deleteRegistration,
	EventRegistrationCapacityError,
	patchRegistration,
} from "./event-registrations.repository";
import type { EventRegistration, EventRegistrationStatus } from "./types";

export class RegistrationDonationPaymentError extends Error {
	constructor() {
		super("Payment failed");
		this.name = "RegistrationDonationPaymentError";
	}
}

export class RegistrationDonationValidationError extends Error {
	status: number;
	constructor(message: string, status = 400) {
		super(message);
		this.name = "RegistrationDonationValidationError";
		this.status = status;
	}
}

async function setGiftRegistrationTransactionId(
	giftId: string,
	registrationTransactionId: string,
): Promise<void> {
	const { tablesDB } = await createAdminClient();
	await tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId || "",
		tableId: appwriteConfig.giftsCollectionId || "69d91201001f4e8c2b01",
		rowId: giftId,
		data: { registrationTransactionId },
	});
}

export async function createRegistrationWithOptionalDonation(input: {
	orgId: string;
	eventId: string;
	ticketTypeId: string;
	status: EventRegistrationStatus;
	constituentId?: string;
	guestEmail?: string;
	guestFirstName?: string;
	guestLastName?: string;
	amountCents?: number;
	donationAmount?: number;
	paymentSucceeded?: boolean;
}): Promise<{ registration: EventRegistration; giftId?: string }> {
	const donationAmount = Number(input.donationAmount ?? 0);
	if (donationAmount > 0 && input.paymentSucceeded !== true) {
		throw new RegistrationDonationPaymentError();
	}
	if (donationAmount > 0 && !input.constituentId) {
		throw new RegistrationDonationValidationError(
			"constituentId is required when adding a donation",
		);
	}

	const event = await getCalendarEventInOrg(input.orgId, input.eventId);
	if (!event) {
		throw new RegistrationDonationValidationError("Event not found", 404);
	}

	const registrationTransactionId = ID.unique();
	let registration: EventRegistration | null = null;

	try {
		registration = await createEventRegistration({
			...input,
			registrationTransactionId,
		});

		if (donationAmount <= 0) {
			return { registration };
		}

		const draft = await createDraftGift({
			orgId: input.orgId,
			amount: donationAmount,
			currency: "USD",
			giftDate: new Date().toISOString(),
			method: "card",
			constituentId: input.constituentId!,
			campaignId: event.campaignId,
		});
		await setGiftRegistrationTransactionId(
			draft.$id,
			registrationTransactionId,
		);
		const posted = await postGift(draft.$id, input.orgId);
		registration = await patchRegistration(input.orgId, registration.$id, {
			giftId: posted.$id,
		});

		return { registration, giftId: posted.$id };
	} catch (error) {
		if (registration) {
			await deleteRegistration(input.orgId, registration.$id);
		}
		if (error instanceof EventRegistrationCapacityError) throw error;
		if (error instanceof GiftDomainError) {
			throw new RegistrationDonationValidationError(error.message, error.status);
		}
		throw error;
	}
}
