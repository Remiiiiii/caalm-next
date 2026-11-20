/**
 * Deterministic PII scrubbing for practice transcripts and live captions.
 * Not a full compliance scanner: common email/phone/SSN/card shapes only.
 */

const EMAIL_RE =
	/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE =
	/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
const CARD_RE = /\b(?:\d[ -]*?){13,19}\b/g;

export const PII_REDACTION_TOKEN = "[redacted]";

/** Replace common PII patterns in a single string. */
export function redactPii(text: string): string {
	if (!text) return text;
	return text
		.replace(EMAIL_RE, PII_REDACTION_TOKEN)
		.replace(SSN_RE, PII_REDACTION_TOKEN)
		.replace(CARD_RE, PII_REDACTION_TOKEN)
		.replace(PHONE_RE, PII_REDACTION_TOKEN);
}

type TurnLike = {
	answer?: string;
	citedEvidence?: string;
	question?: string;
	[key: string]: unknown;
};

/** Deep-copy turns and redact answer / citedEvidence / question fields. */
export function redactTranscriptTurns<T extends TurnLike>(turns: T[]): T[] {
	return turns.map((turn) => {
		const next = { ...turn };
		if (typeof next.answer === "string") next.answer = redactPii(next.answer);
		if (typeof next.citedEvidence === "string") {
			next.citedEvidence = redactPii(next.citedEvidence);
		}
		if (typeof next.question === "string") {
			next.question = redactPii(next.question);
		}
		return next;
	});
}
