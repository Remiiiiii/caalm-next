import { describe, expect, it } from "vitest";
import { generateDocumentNumber, needsDocumentNumber } from "./documentNumber";

describe("documentNumber", () => {
	it("builds CTR-YYYYMMDD-XXXX", () => {
		expect(generateDocumentNumber("CTR")).toMatch(/^CTR-\d{8}-[A-Z2-9]{4}$/);
		expect(generateDocumentNumber("LIC")).toMatch(/^LIC-\d{8}-[A-Z2-9]{4}$/);
	});

	it("treats blank and token values as missing", () => {
		expect(needsDocumentNumber("")).toBe(true);
		expect(needsDocumentNumber("{{CONTRACT_NUMBER}}")).toBe(true);
		expect(needsDocumentNumber("CTR-20260910-AB3K")).toBe(false);
	});
});
