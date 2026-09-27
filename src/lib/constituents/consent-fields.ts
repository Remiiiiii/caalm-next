import type { Constituent, LawfulBasis } from "./types";

export const LAWFUL_BASES = [
	"consent",
	"legitimate_interest",
	"contract",
	"legal_obligation",
	"vital_interest",
	"public_task",
] as const;

export function isLawfulBasis(value: unknown): value is LawfulBasis {
	return (
		typeof value === "string" &&
		(LAWFUL_BASES as readonly string[]).includes(value)
	);
}

/** Undefined/null means opted-in (legacy rows before channel consent). */
export function channelConsentAllowed(
	value: boolean | undefined,
): boolean {
	return value !== false;
}

export type ChannelConsentSnapshot = {
	consentEmail: boolean;
	consentSms: boolean;
	consentMail: boolean;
	consentPhone: boolean;
	lawfulBasis?: LawfulBasis;
};

export function readChannelConsent(
	constituent: Pick<
		Constituent,
		| "consentEmail"
		| "consentSms"
		| "consentMail"
		| "consentPhone"
		| "lawfulBasis"
	>,
): ChannelConsentSnapshot {
	return {
		consentEmail: channelConsentAllowed(constituent.consentEmail),
		consentSms: channelConsentAllowed(constituent.consentSms),
		consentMail: channelConsentAllowed(constituent.consentMail),
		consentPhone: channelConsentAllowed(constituent.consentPhone),
		lawfulBasis: constituent.lawfulBasis,
	};
}
