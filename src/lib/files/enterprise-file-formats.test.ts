import { describe, expect, it } from "vitest";
import {
	assertEnterpriseFileAllowed,
	EnterpriseFileFormatError,
	getEnterpriseFormatHint,
	validateEnterpriseFile,
} from "./enterprise-file-formats";

describe("enterprise file formats", () => {
	it("allows core contract formats and rejects pptx on contract upload", () => {
		expect(validateEnterpriseFile({ name: "deal.pdf", type: "application/pdf" }, "contractPrimary").ok).toBe(true);
		expect(validateEnterpriseFile({ name: "deal.docx", type: "" }, "contractPrimary").ok).toBe(true);
		expect(validateEnterpriseFile({ name: "slides.pptx", type: "" }, "contractPrimary").ok).toBe(false);
	});

	it("allows images on license upload but not on contract upload", () => {
		expect(validateEnterpriseFile({ name: "card.png", type: "image/png" }, "licensePrimary").ok).toBe(true);
		expect(validateEnterpriseFile({ name: "card.png", type: "image/png" }, "contractPrimary").ok).toBe(false);
	});

	it("allows exhibit formats on attachments", () => {
		expect(validateEnterpriseFile({ name: "pricing.xlsx", type: "" }, "attachment").ok).toBe(true);
		expect(validateEnterpriseFile({ name: "deck.pptx", type: "" }, "attachment").ok).toBe(true);
		expect(validateEnterpriseFile({ name: "notes.md", type: "text/markdown" }, "attachment").ok).toBe(false);
	});

	it("throws on server assert helper", () => {
		expect(() =>
			assertEnterpriseFileAllowed({ name: "virus.exe", type: "" }, "contractPrimary"),
		).toThrow(EnterpriseFileFormatError);
	});

	it("builds human-readable hints", () => {
		expect(getEnterpriseFormatHint("contractPrimary")).toContain("PDF");
		expect(getEnterpriseFormatHint("contractPrimary")).not.toContain("PPTX");
		expect(getEnterpriseFormatHint("attachment")).toContain("PPTX");
	});
});
