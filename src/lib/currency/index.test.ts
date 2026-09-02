import { describe, expect, it } from "vitest";
import {
	convertToUsd,
	currencySelectOptions,
	formatUsdAmount,
	normalizeCurrencyCode,
	parseMoneyAmount,
	TOP_CURRENCY_CODES,
} from "./index";

describe("currency helpers", () => {
	it("lists the top 10 widely used currencies", () => {
		expect(TOP_CURRENCY_CODES).toHaveLength(10);
		expect(TOP_CURRENCY_CODES[0]).toBe("USD");
		expect(TOP_CURRENCY_CODES).toContain("EUR");
		expect(TOP_CURRENCY_CODES).toContain("JPY");
	});

	it("keeps a current code that is not in the top 10", () => {
		const codes = currencySelectOptions("MXN").map((row) => row.code);
		expect(codes).toContain("MXN");
		expect(codes[0]).toBe("USD");
	});

	it("normalizes blank or other to USD", () => {
		expect(normalizeCurrencyCode("")).toBe("USD");
		expect(normalizeCurrencyCode("other")).toBe("USD");
		expect(normalizeCurrencyCode("eur")).toBe("EUR");
	});

	it("parses typed money strings", () => {
		expect(parseMoneyAmount("$10,000.00")).toBe(10000);
		expect(parseMoneyAmount("")).toBeNull();
		expect(parseMoneyAmount(250)).toBe(250);
	});

	it("formats and converts to USD", () => {
		expect(convertToUsd(100, 1.1)).toBe(110);
		expect(formatUsdAmount(110)).toBe("$110.00");
	});
});
