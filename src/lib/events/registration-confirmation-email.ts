import { canContact } from "@/lib/constituents/consent";
import { getConstituentById } from "@/lib/constituents";
import { mailgunService } from "@/lib/services/mailgun";
import { getRegistrationById, patchRegistration } from "./event-registrations.repository";
import { createRegistrationToken, registrationQrPayload } from "./registration-token";

export async function sendRegistrationConfirmationEmailIfEligible(input: {
	orgId: string;
	registrationId: string;
	eventTitle: string;
}): Promise<{ sent: boolean; skippedReason?: string }> {
	const registration = await getRegistrationById(
		input.orgId,
		input.registrationId,
	);
	if (!registration) {
		return { sent: false, skippedReason: "not_found" };
	}
	if (registration.confirmationEmailSentAt) {
		return { sent: false, skippedReason: "already_sent" };
	}
	if (registration.status !== "confirmed" && registration.status !== "posted") {
		return { sent: false, skippedReason: "not_confirmed" };
	}

	let email = registration.guestEmail?.trim();
	if (registration.constituentId) {
		const constituent = await getConstituentById(registration.constituentId);
		if (!constituent || constituent.orgId !== input.orgId) {
			return { sent: false, skippedReason: "constituent_missing" };
		}
		if (!canContact(constituent, "email")) {
			return { sent: false, skippedReason: "do_not_contact" };
		}
		email = constituent.email?.trim() || email;
	}

	if (!email) {
		return { sent: false, skippedReason: "no_email" };
	}

	const token = createRegistrationToken(registration.$id, registration.orgId);
	const qrPayload = registrationQrPayload(token);

	await mailgunService.sendEmail({
		to: email,
		subject: `Registration confirmed: ${input.eventTitle}`,
		text: `You're registered for ${input.eventTitle}.\n\nYour check-in code:\n${qrPayload}\n\nShow this code at the door.`,
		html: `<p>You're registered for <strong>${input.eventTitle}</strong>.</p><p>Your check-in code:</p><pre>${qrPayload}</pre><p>Show this code at the door.</p>`,
	});

	await patchRegistration(input.orgId, registration.$id, {
		confirmationEmailSentAt: new Date().toISOString(),
	});

	return { sent: true };
}
