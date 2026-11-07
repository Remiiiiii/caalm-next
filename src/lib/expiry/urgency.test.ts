import { describe, expect, it } from "vitest";
import {
	EXPIRY_SOON_DAYS,
	EXPIRY_URGENT_DAYS,
	formatUrgencyBandCopy,
	getDaysFact,
	getUrgencyTier,
	getUrgencyTone,
	pluralDays,
} from "./urgency";

describe("getUrgencyTier", () => {
	it("maps day counts to tiers around the 7 / 60 thresholds", () => {
		expect(getUrgencyTier(-1)).toBe("overdue");
		expect(getUrgencyTier(0)).toBe("critical");
		expect(getUrgencyTier(EXPIRY_URGENT_DAYS)).toBe("critical");
		expect(getUrgencyTier(EXPIRY_URGENT_DAYS + 1)).toBe("soon");
		expect(getUrgencyTier(EXPIRY_SOON_DAYS)).toBe("soon");
		expect(getUrgencyTier(EXPIRY_SOON_DAYS + 1)).toBe("scheduled");
	});
});

describe("getUrgencyTone", () => {
	it("colors overdue/critical danger, soon warning, scheduled info", () => {
		expect(getUrgencyTone("overdue")).toBe("danger");
		expect(getUrgencyTone("critical")).toBe("danger");
		expect(getUrgencyTone("soon")).toBe("warning");
		expect(getUrgencyTone("scheduled")).toBe("info");
	});
});

describe("pluralDays", () => {
	it("has no (s) artifacts", () => {
		expect(pluralDays(1)).toBe("1 day");
		expect(pluralDays(2)).toBe("2 days");
		expect(pluralDays(0)).toBe("0 days");
	});
});

describe("formatUrgencyBandCopy", () => {
	it("reads past, today and future correctly", () => {
		expect(
			formatUrgencyBandCopy({ daysRemaining: -3, dateLabel: "May 1, 2026" }),
		).toBe("Expired 3 days ago — May 1, 2026");
		expect(
			formatUrgencyBandCopy({ daysRemaining: -1, dateLabel: "May 1, 2026" }),
		).toBe("Expired 1 day ago — May 1, 2026");
		expect(
			formatUrgencyBandCopy({ daysRemaining: 0, dateLabel: "May 1, 2026" }),
		).toBe("Expires today — May 1, 2026");
		expect(
			formatUrgencyBandCopy({ daysRemaining: 48, dateLabel: "Dec 13, 2026" }),
		).toBe("Expires in 48 days — Dec 13, 2026");
	});

	it("uses Renews for renewing licenses", () => {
		expect(
			formatUrgencyBandCopy({
				daysRemaining: 10,
				dateLabel: "Jun 1, 2026",
				renewing: true,
			}),
		).toBe("Renews in 10 days — Jun 1, 2026");
	});
});

describe("getDaysFact", () => {
	it("switches label and uses the absolute value when overdue", () => {
		expect(getDaysFact(12)).toEqual({ label: "Days remaining", value: 12 });
		expect(getDaysFact(-4)).toEqual({ label: "Days overdue", value: 4 });
	});
});
