import { describe, expect, it } from "vitest";
import {
	buildExpiryNoticeMetadata,
	getNoticeThresholds,
	matchesExpiryNoticeMetadata,
	shouldSendExpiryNotice,
} from "@/lib/renewals/expiryNotice";

describe("getNoticeThresholds", () => {
	it("includes notice day plus urgent cascade", () => {
		expect(getNoticeThresholds(60)).toEqual([60, 15, 10, 5, 1]);
	});

	it("defaults notice to 30 when unset", () => {
		expect(getNoticeThresholds(undefined)).toEqual([30, 15, 10, 5, 1]);
		expect(getNoticeThresholds(null)).toEqual([30, 15, 10, 5, 1]);
	});

	it("dedupes when notice day is already in urgent cascade", () => {
		expect(getNoticeThresholds(15)).toEqual([15, 10, 5, 1]);
	});

	it("accepts string notice days", () => {
		expect(getNoticeThresholds("90")).toEqual([90, 15, 10, 5, 1]);
	});
});

describe("shouldSendExpiryNotice", () => {
	it("fires on notice day and urgent days", () => {
		expect(shouldSendExpiryNotice(60, 60)).toBe(true);
		expect(shouldSendExpiryNotice(15, 60)).toBe(true);
		expect(shouldSendExpiryNotice(7, 60)).toBe(false);
		expect(shouldSendExpiryNotice(30, undefined)).toBe(true);
	});

	it("skips negative or non-finite days", () => {
		expect(shouldSendExpiryNotice(-1, 30)).toBe(false);
		expect(shouldSendExpiryNotice(Number.NaN, 30)).toBe(false);
	});
});

describe("expiry notice metadata", () => {
	it("round-trips and matches", () => {
		const meta = {
			entityType: "contract" as const,
			entityId: "abc123",
			daysUntil: 60,
		};
		const raw = buildExpiryNoticeMetadata(meta);
		expect(matchesExpiryNoticeMetadata(raw, meta)).toBe(true);
		expect(matchesExpiryNoticeMetadata(raw, { ...meta, daysUntil: 15 })).toBe(
			false,
		);
	});
});
