import { describe, expect, it } from "vitest";
import {
	deriveSeverityFromMatrix,
	getSeverityBadgeTitle,
} from "./ticket-intake.constants";

describe("deriveSeverityFromMatrix", () => {
	// [impact, urgency, severity, hours, label]
	const rows = [
		["low", "low", "low", 120, "5 business days"],
		["low", "medium", "low", 120, "5 business days"],
		["low", "high", "medium", 24, "1 business day"],
		["low", "critical", "medium", 24, "1 business day"],
		["medium", "low", "medium", 24, "1 business day"],
		["medium", "medium", "medium", 24, "1 business day"],
		["medium", "high", "high", 4, "4 hours"],
		["medium", "critical", "high", 4, "4 hours"],
		["high", "low", "high", 4, "4 hours"],
		["high", "medium", "high", 4, "4 hours"],
		["high", "high", "critical", 1, "1 hour"],
		["high", "critical", "critical", 1, "1 hour"],
		["critical", "low", "critical", 1, "1 hour"],
		["critical", "critical", "critical", 1, "1 hour"],
	] as const;

	it.each(rows)("%s x %s", (impact, urgency, severity, hours, label) => {
		expect(deriveSeverityFromMatrix(impact, urgency)).toEqual({
			severity,
			responseSlaHours: hours,
			responseSlaLabel: label,
		});
	});

	it("rejects unknown levels", () => {
		expect(() => deriveSeverityFromMatrix("nope" as "low", "low")).toThrow();
	});

	it("builds the badge title", () => {
		expect(getSeverityBadgeTitle("high")).toBe("High — SEV-2");
	});
});
