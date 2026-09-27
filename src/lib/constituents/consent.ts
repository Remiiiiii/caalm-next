import { channelConsentAllowed } from "./consent-fields";
import type { ContactChannel, Constituent } from "./types";

/**
 * Modules that send email/SMS to a constituent must import canContact.
 * Section 7 and 9 senders are listed now so a later PR cannot skip the check.
 */
export const CAN_CONTACT_REQUIRED_SENDER_PATHS = [
	"src/lib/constituents/consent.ts",
	"src/lib/stewardship/gift-receipts.ts",
	"src/lib/appeals/send.ts",
] as const;

export const CAN_CONTACT_FUTURE_SENDER_PATHS = [
	"src/lib/events/registration-confirmation-email.ts",
] as const;

type ConstituentContactFlags = Pick<
	Constituent,
	| "doNotContact"
	| "consentEmail"
	| "consentSms"
	| "consentMail"
	| "consentPhone"
>;

export function canContact(
	constituent: ConstituentContactFlags,
	channel: ContactChannel,
): boolean {
	if (constituent.doNotContact === true) return false;
	switch (channel) {
		case "email":
			return channelConsentAllowed(constituent.consentEmail);
		case "sms":
			return channelConsentAllowed(constituent.consentSms);
		case "phone":
			return channelConsentAllowed(constituent.consentPhone);
		case "mail":
			return channelConsentAllowed(constituent.consentMail);
		default:
			return false;
	}
}
