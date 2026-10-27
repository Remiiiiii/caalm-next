import { describe, expect, it } from "vitest";
import { computeSla, formatHours } from "./ticket-sla";

const HOUR = 3_600_000;
const now = Date.UTC(2026, 9, 27, 12);
const filed = (hoursAgo: number) =>
	new Date(now - hoursAgo * HOUR).toISOString();

describe("computeSla", () => {
	it("is good while well inside the target", () => {
		const sla = computeSla({ severity: "high", submittedAt: filed(1) }, now);
		expect(sla.slaHours).toBe(4);
		expect(sla.tone).toBe("good");
		expect(sla.breached).toBe(false);
		expect(sla.remainingHours).toBeCloseTo(3);
	});

	it("warns at 80% and breaches at 100%, capping the bar", () => {
		expect(
			computeSla({ severity: "high", submittedAt: filed(3.3) }, now).tone,
		).toBe("warn");
		const breached = computeSla(
			{ severity: "high", submittedAt: filed(100) },
			now,
		);
		expect(breached.tone).toBe("bad");
		expect(breached.percent).toBe(100);
		expect(breached.overHours).toBeCloseTo(96);
		expect(breached.remainingHours).toBe(0);
	});
});

describe("formatHours", () => {
	it("formats days, hours and minutes", () => {
		expect(formatHours(67.6)).toBe("2d 19h");
		expect(formatHours(5.5)).toBe("5h 30m");
		expect(formatHours(0.66)).toBe("40m");
	});
});
