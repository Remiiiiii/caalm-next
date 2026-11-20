import { describe, expect, it } from "vitest";
import {
	PII_REDACTION_TOKEN,
	redactPii,
	redactTranscriptTurns,
} from "./pii";

describe("redactPii", () => {
	it("redacts email addresses", () => {
		expect(redactPii("Reach me at ada@example.com please")).toBe(
			`Reach me at ${PII_REDACTION_TOKEN} please`,
		);
	});

	it("redacts US-style phones", () => {
		expect(redactPii("Call 415-555-0199 tomorrow")).toContain(
			PII_REDACTION_TOKEN,
		);
	});

	it("redacts SSN-shaped numbers", () => {
		expect(redactPii("SSN 123-45-6789")).toBe(`SSN ${PII_REDACTION_TOKEN}`);
	});

	it("leaves ordinary sentences alone", () => {
		expect(redactPii("We renew licenses every quarter.")).toBe(
			"We renew licenses every quarter.",
		);
	});
});

describe("redactTranscriptTurns", () => {
	it("redacts answer and citedEvidence only", () => {
		const out = redactTranscriptTurns([
			{
				questionId: "q1",
				question: "Who owns renewals?",
				answer: "Email bob@caalm.test",
				citedEvidence: "Ticket 555-123-4567",
				at: "2026-01-01T00:00:00.000Z",
			},
		]);
		expect(out[0].answer).toContain(PII_REDACTION_TOKEN);
		expect(out[0].citedEvidence).toContain(PII_REDACTION_TOKEN);
		expect(out[0].questionId).toBe("q1");
	});
});
