import type { ContactChannel } from "./types";

/**
 * Modules that send email/SMS to a constituent must import canContact.
 * Section 7 and 9 senders are listed now so a later PR cannot skip the check.
 */
export const CAN_CONTACT_REQUIRED_SENDER_PATHS = [
	"src/lib/constituents/consent.ts",
	"src/lib/stewardship/gift-receipts.ts",
] as const;

export const CAN_CONTACT_FUTURE_SENDER_PATHS = [
	"src/lib/appeals/send.ts",
	"src/lib/events/registration-confirmation-email.ts",
] as const;

export function canContact(
	constituent: { doNotContact?: boolean },
	_channel: ContactChannel,
): boolean {
	// DNC (do not contact) blocks every channel — email, SMS, phone, and mail.
	return constituent.doNotContact !== true;
}
