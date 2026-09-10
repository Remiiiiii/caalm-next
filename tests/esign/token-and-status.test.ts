import { describe, expect, it } from "vitest";
import {
	applyRecipientTransition,
	deriveEnvelopeStatus,
} from "@/lib/esign/status";
import { createSigningToken, parseSigningToken } from "@/lib/esign/token";
import type { EsignRecipient } from "@/lib/esign/types";
import { verifyEsignWebhookSignature } from "@/lib/esign/webhook";

function signer(
	status: EsignRecipient["status"],
	id = "r1",
): EsignRecipient {
	return {
		id,
		email: `${id}@example.com`,
		name: id,
		role: "signer",
		order: 1,
		status,
	};
}

describe("esign tokens", () => {
	it("round-trips a signing token", () => {
		const token = createSigningToken("env1", "rec1", "test-secret");
		expect(parseSigningToken(token, "test-secret")).toEqual({
			envelopeId: "env1",
			recipientId: "rec1",
		});
	});

	it("rejects a tampered token", () => {
		const token = createSigningToken("env1", "rec1", "test-secret");
		expect(parseSigningToken(`${token}x`, "test-secret")).toBeNull();
		expect(parseSigningToken(token, "other-secret")).toBeNull();
	});
});

describe("esign status machine", () => {
	it("derives sent / viewed / partial / completed / declined", () => {
		expect(deriveEnvelopeStatus([signer("sent")], "sent")).toBe("sent");
		expect(deriveEnvelopeStatus([signer("viewed")], "sent")).toBe("viewed");
		expect(
			deriveEnvelopeStatus(
				[signer("signed", "a"), signer("sent", "b")],
				"sent",
			),
		).toBe("partially_signed");
		expect(
			deriveEnvelopeStatus(
				[signer("signed", "a"), signer("signed", "b")],
				"partially_signed",
			),
		).toBe("completed");
		expect(deriveEnvelopeStatus([signer("declined")], "sent")).toBe("declined");
	});

	it("does not downgrade a signed recipient", () => {
		expect(applyRecipientTransition("signed", "viewed")).toBe("signed");
	});
});

describe("esign webhook hmac", () => {
	it("accepts a matching signature and rejects a mismatch", () => {
		const payload = JSON.stringify({ eventId: "evt-1" });
		const { createHmac } = require("node:crypto") as typeof import("node:crypto");
		const good = `sha256=${createHmac("sha256", "whsec").update(payload).digest("hex")}`;
		expect(verifyEsignWebhookSignature(payload, good, "whsec")).toBe(true);
		expect(verifyEsignWebhookSignature(payload, good, "other")).toBe(false);
		expect(verifyEsignWebhookSignature(payload, null, "whsec")).toBe(false);
	});
});
