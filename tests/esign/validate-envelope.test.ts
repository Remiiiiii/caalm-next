import { describe, expect, it } from "vitest";
import {
	dedupeSignerEmails,
	getSignersMissingSignatureFields,
	getUnfilledRequiredFields,
} from "@/lib/esign/validate-envelope";
import type { EsignEnvelope } from "@/lib/esign/types";

function envelope(
	overrides: Partial<EsignEnvelope> = {},
): Pick<EsignEnvelope, "recipients" | "fields"> {
	return {
		recipients: [
			{
				id: "a",
				email: "a@example.com",
				name: "A",
				role: "signer",
				order: 1,
				status: "pending",
			},
			{
				id: "b",
				email: "b@example.com",
				name: "B",
				role: "signer",
				order: 2,
				status: "pending",
			},
		],
		fields: [],
		...overrides,
	};
}

describe("getSignersMissingSignatureFields", () => {
	it("lists signers without a signature widget", () => {
		const missing = getSignersMissingSignatureFields(
			envelope({
				fields: [
					{
						id: "f1",
						recipientId: "a",
						type: "signature",
						page: 1,
						x: 10,
						y: 10,
						width: 20,
						height: 8,
					},
				],
			}),
		);
		expect(missing.map((s) => s.email)).toEqual(["b@example.com"]);
	});

	it("returns empty when every signer has a signature field", () => {
		expect(
			getSignersMissingSignatureFields(
				envelope({
					fields: [
						{
							id: "f1",
							recipientId: "a",
							type: "signature",
							page: 1,
							x: 10,
							y: 10,
							width: 20,
							height: 8,
						},
						{
							id: "f2",
							recipientId: "b",
							type: "signature",
							page: 1,
							x: 40,
							y: 10,
							width: 20,
							height: 8,
						},
					],
				}),
			),
		).toEqual([]);
	});
});

describe("dedupeSignerEmails", () => {
	it("drops blank and duplicate emails", () => {
		expect(
			dedupeSignerEmails([
				{ email: "A@Example.com", name: "A" },
				{ email: "a@example.com", name: "A2" },
				{ email: "  ", name: "blank" },
			]),
		).toEqual([{ email: "a@example.com", name: "A" }]);
	});
});

describe("getUnfilledRequiredFields", () => {
	it("requires a signature image or field value", () => {
		const fields = [
			{
				id: "sig",
				recipientId: "a",
				type: "signature" as const,
				page: 1,
				x: 0,
				y: 0,
				width: 20,
				height: 8,
			},
		];
		const recipient = {
			name: "A",
			email: "a@example.com",
			signatureDataUrl: undefined,
		};
		expect(getUnfilledRequiredFields(fields, recipient)).toHaveLength(1);
		expect(
			getUnfilledRequiredFields(fields, {
				...recipient,
				signatureDataUrl: "data:image/png;base64,xx",
			}),
		).toHaveLength(0);
	});
});
