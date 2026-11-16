import { describe, expect, it } from "vitest";
import {
	extractExpiryDateFromFile,
	extractExpiryDateFromText,
} from "@/lib/files/extract-expiry";

describe("extractExpiryDateFromText", () => {
	it("reads an ISO date after an expiry, expiration or end date label", () => {
		expect(extractExpiryDateFromText("Expiry Date: 2027-03-31")).toBe(
			"2027-03-31",
		);
		expect(extractExpiryDateFromText("expiration date 2026-12-01")).toBe(
			"2026-12-01",
		);
		expect(extractExpiryDateFromText("The End Date:\n2028-01-15.")).toBe(
			"2028-01-15",
		);
	});

	it("returns null when no labelled date is present", () => {
		expect(extractExpiryDateFromText("Signed on 2025-01-01")).toBeNull();
		expect(extractExpiryDateFromText("")).toBeNull();
	});
});

describe("extractExpiryDateFromFile", () => {
	it("treats non-PDF files as plain text", async () => {
		const bytes = new TextEncoder().encode("Contract\nEnd date: 2027-06-30\n");
		await expect(extractExpiryDateFromFile(bytes, "text/plain")).resolves.toBe(
			"2027-06-30",
		);
	});
});
