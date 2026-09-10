import { describe, expect, it } from "vitest";
import {
	EsignLinkError,
	esignErrorFromMessage,
	explanationForEsignCode,
	isEsignErrorCode,
} from "@/lib/esign/errors";

describe("esign error codes", () => {
	it("maps tampered or missing links to ESIGN-404", () => {
		expect(esignErrorFromMessage("Invalid signing link")).toEqual({
			code: "ESIGN-404",
			error: "Invalid signing link",
		});
	});

	it("maps expired links to ESIGN-410", () => {
		expect(esignErrorFromMessage("This signing link has expired").code).toBe(
			"ESIGN-410",
		);
	});

	it("maps voided envelopes to ESIGN-409", () => {
		expect(esignErrorFromMessage("This signing link is no longer valid").code).toBe(
			"ESIGN-409",
		);
	});

	it("maps already signed to ESIGN-403", () => {
		expect(esignErrorFromMessage("This document was already signed").code).toBe(
			"ESIGN-403",
		);
	});

	it("exposes status on EsignLinkError", () => {
		expect(new EsignLinkError("ESIGN-410", "expired").status).toBe(410);
		expect(isEsignErrorCode("ESIGN-404")).toBe(true);
		expect(isEsignErrorCode("nope")).toBe(false);
		expect(explanationForEsignCode("ESIGN-410")).toMatch(/expired/i);
	});
});
