import { describe, expect, it } from "vitest";
import { monthDateRange, validateCalendarPin } from "@/lib/notes/calendar-pin";

describe("validateCalendarPin", () => {
	it("allows a dashboard-only note with no pin", () => {
		expect(validateCalendarPin({})).toEqual({
			pinned: false,
			calendarDate: null,
			calendarTime: null,
		});
	});

	it("requires both date and time", () => {
		expect(() => validateCalendarPin({ calendarDate: "2026-10-12" })).toThrow(
			/both a date and a time/,
		);
		expect(() => validateCalendarPin({ calendarTime: "14:30" })).toThrow(
			/both a date and a time/,
		);
	});

	it("accepts a valid pin", () => {
		expect(
			validateCalendarPin({
				calendarDate: "2026-10-12",
				calendarTime: "14:30",
			}),
		).toEqual({
			pinned: true,
			calendarDate: "2026-10-12",
			calendarTime: "14:30",
		});
	});

	it("rejects an invalid date or time", () => {
		expect(() =>
			validateCalendarPin({
				calendarDate: "2026-13-40",
				calendarTime: "14:30",
			}),
		).toThrow(/YYYY-MM-DD/);
		expect(() =>
			validateCalendarPin({
				calendarDate: "2026-10-12",
				calendarTime: "25:99",
			}),
		).toThrow(/HH:mm/);
	});
});

describe("monthDateRange", () => {
	it("returns first and last day of October 2026", () => {
		expect(monthDateRange(2026, 10)).toEqual({
			start: "2026-10-01",
			end: "2026-10-31",
		});
	});
});
