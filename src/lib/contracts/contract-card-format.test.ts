import { describe, expect, it } from "vitest";
import {
	CONTRACT_CARD_EXPIRY_WARN_DAYS,
	daysToExpiry,
	fileTypeGlyphLabel,
	formatValueAbbrev,
	getExpiryTier,
} from "./contract-card-format";

describe("formatValueAbbrev", () => {
	it("abbreviates millions and thousands", () => {
		expect(formatValueAbbrev(2_450_000).display).toBe("$2.45M");
		expect(formatValueAbbrev(175_000).display).toBe("$175K");
		expect(formatValueAbbrev(640).display).toBe("$640");
	});

	it("renders an em dash when missing", () => {
		expect(formatValueAbbrev(null).display).toBe("—");
		expect(formatValueAbbrev(undefined).display).toBe("—");
	});
});

describe("daysToExpiry + getExpiryTier", () => {
	it("warns within the 90-day window", () => {
		const now = new Date(2026, 5, 1); // 1 Jun 2026 local
		const in47 = daysToExpiry("2026-07-18", now);
		expect(in47).toBe(47);
		expect(getExpiryTier(in47)).toBe("warn");
		expect(CONTRACT_CARD_EXPIRY_WARN_DAYS).toBe(90);
	});

	it("marks far-out and overdue tiers", () => {
		const now = new Date(2026, 5, 1);
		expect(getExpiryTier(daysToExpiry("2027-04-25", now))).toBe("normal");
		expect(getExpiryTier(daysToExpiry("2026-05-20", now))).toBe("expired");
	});

	it("returns null when there is no expiry date", () => {
		expect(daysToExpiry(null)).toBeNull();
		expect(getExpiryTier(null)).toBeNull();
	});
});

describe("fileTypeGlyphLabel", () => {
	it("prefers the extension", () => {
		expect(fileTypeGlyphLabel("pdf", "document")).toBe("PDF");
		expect(fileTypeGlyphLabel("docx", "document")).toBe("DOCX");
	});
});
