import { describe, expect, it } from "vitest";
import {
	inferRootCause,
	requiresCloseEvidence,
	slaDueAt,
} from "@/lib/audit-upload/caps";

describe("CAP helpers", () => {
	it("gives critical findings a 30-day due date", () => {
		const from = new Date("2026-01-01T00:00:00.000Z");
		expect(slaDueAt("critical", from)).toBe("2026-01-31T00:00:00.000Z");
	});

	it("uses 60/90/180 day SLAs for high, medium, and low", () => {
		const from = new Date("2026-01-01T00:00:00.000Z");
		expect(slaDueAt("high", from)).toBe("2026-03-02T00:00:00.000Z");
		expect(slaDueAt("medium", from)).toBe("2026-04-01T00:00:00.000Z");
		expect(slaDueAt("low", from)).toBe("2026-06-30T00:00:00.000Z");
	});

	it("requires close evidence for high and critical only", () => {
		expect(requiresCloseEvidence("critical")).toBe(true);
		expect(requiresCloseEvidence("high")).toBe(true);
		expect(requiresCloseEvidence("low")).toBe(false);
	});

	it("infers a training root cause from wording", () => {
		expect(inferRootCause("Staff were not trained on the new policy")).toBe(
			"training",
		);
	});
});
