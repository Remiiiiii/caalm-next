import { describe, expect, it } from "vitest";
import { scoreAuditRisk } from "@/lib/audit-upload/risk-score";

describe("scoreAuditRisk", () => {
	it("multiplies likelihood and impact", () => {
		expect(scoreAuditRisk(4, 5)).toEqual({
			riskScore: 20,
			computedSeverity: "critical",
		});
	});

	it("maps mid scores to medium", () => {
		expect(scoreAuditRisk(3, 3).computedSeverity).toBe("medium");
	});

	it("clamps values into the 1-5 band", () => {
		expect(scoreAuditRisk(99, 0)).toEqual({
			riskScore: 5,
			computedSeverity: "informational",
		});
	});
});
