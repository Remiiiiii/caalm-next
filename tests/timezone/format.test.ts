import { describe, expect, it } from "vitest";
import {
	cadencesDueNow,
	formatInTimezone,
	isValidIanaTimezone,
	listIanaTimezones,
	localDayKey,
	resolveOrgTimezone,
} from "@/lib/timezone";

describe("org timezone helpers", () => {
	it("lists IANA timezones including America/New_York", () => {
		const values = listIanaTimezones().map((opt) => opt.value);
		expect(values).toContain("America/New_York");
	});

	it("validates IANA timezones and falls back for junk", () => {
		expect(isValidIanaTimezone("America/New_York")).toBe(true);
		expect(isValidIanaTimezone("Not/A_Zone")).toBe(false);
		expect(resolveOrgTimezone("Not/A_Zone")).toBe("America/New_York");
	});

	it("formats a UTC instant in New York and London", () => {
		const instant = new Date("2026-08-17T13:30:00.000Z");
		expect(formatInTimezone(instant, "HH:mm", "America/New_York")).toBe("09:30");
		expect(formatInTimezone(instant, "HH:mm", "Europe/London")).toBe("14:30");
	});

	it("keeps readiness cadence math for America/New_York", () => {
		const date = new Date("2026-08-17T13:30:00.000Z");
		expect(cadencesDueNow(date, "America/New_York")).toContain("weekly");
		expect(localDayKey(date, "America/New_York")).toBe("2026-08-17");
	});
});
