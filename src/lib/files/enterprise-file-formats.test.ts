import { describe, expect, it } from "vitest";
import {
	assertEnterpriseFileAllowed,
	EnterpriseFileFormatError,
	getEnterpriseFormatHint,
	isTicketScreenRecordingFile,
	validateEnterpriseFile,
} from "./enterprise-file-formats";

describe("enterprise file formats", () => {
	it("allows core contract formats and rejects pptx on contract upload", () => {
		expect(
			validateEnterpriseFile(
				{ name: "deal.pdf", type: "application/pdf" },
				"contractPrimary",
			).ok,
		).toBe(true);
		expect(
			validateEnterpriseFile({ name: "deal.docx", type: "" }, "contractPrimary")
				.ok,
		).toBe(true);
		expect(
			validateEnterpriseFile(
				{ name: "slides.pptx", type: "" },
				"contractPrimary",
			).ok,
		).toBe(false);
	});

	it("allows images on license upload but not on contract upload", () => {
		expect(
			validateEnterpriseFile(
				{ name: "card.png", type: "image/png" },
				"licensePrimary",
			).ok,
		).toBe(true);
		expect(
			validateEnterpriseFile(
				{ name: "card.png", type: "image/png" },
				"contractPrimary",
			).ok,
		).toBe(false);
	});

	it("allows exhibit formats on attachments", () => {
		expect(
			validateEnterpriseFile({ name: "pricing.xlsx", type: "" }, "attachment")
				.ok,
		).toBe(true);
		expect(
			validateEnterpriseFile({ name: "deck.pptx", type: "" }, "attachment").ok,
		).toBe(true);
		expect(
			validateEnterpriseFile(
				{ name: "notes.md", type: "text/markdown" },
				"attachment",
			).ok,
		).toBe(false);
	});

	it("keeps video off the ticket drop zone (Record handles clips)", () => {
		expect(
			validateEnterpriseFile(
				{ name: "clip.mp4", type: "video/mp4" },
				"ticketAttachment",
			).ok,
		).toBe(false);
		expect(
			validateEnterpriseFile(
				{ name: "deck.pptx", type: "" },
				"ticketAttachment",
			).ok,
		).toBe(false);
		expect(
			validateEnterpriseFile(
				{ name: "agreement.pdf", type: "application/pdf" },
				"ticketAttachment",
			).ok,
		).toBe(true);
		expect(
			validateEnterpriseFile(
				{ name: "screenshot.png", type: "image/png" },
				"ticketAttachment",
			).ok,
		).toBe(true);
	});

	it("treats webm/mp4/mov as screen recordings for ticket submit", () => {
		expect(
			isTicketScreenRecordingFile({ name: "screen-recording.webm" }),
		).toBe(true);
		expect(isTicketScreenRecordingFile({ name: "notes.pdf" })).toBe(false);
	});

	it("still allows screen recording video on generic attachments", () => {
		expect(
			validateEnterpriseFile(
				{ name: "screen-recording.webm", type: "video/webm" },
				"attachment",
			).ok,
		).toBe(true);
	});

	it("throws on server assert helper", () => {
		expect(() =>
			assertEnterpriseFileAllowed(
				{ name: "virus.exe", type: "" },
				"contractPrimary",
			),
		).toThrow(EnterpriseFileFormatError);
	});

	it("builds human-readable hints", () => {
		expect(getEnterpriseFormatHint("contractPrimary")).toContain("PDF");
		expect(getEnterpriseFormatHint("contractPrimary")).not.toContain("PPTX");
		expect(getEnterpriseFormatHint("attachment")).toContain("PPTX");
	});
});
