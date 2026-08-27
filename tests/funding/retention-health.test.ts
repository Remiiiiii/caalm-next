import { describe, expect, it } from "vitest";
import {
	computeRetentionHealth,
	daysUntil,
	formatUsd,
	isPursuitStage,
} from "@/lib/funding/constants";

describe("funding retention health", () => {
	it("marks overdue obligation pressure as at_risk", () => {
		expect(
			computeRetentionHealth({
				daysUntilExpiry: 120,
				openObligationCount: 1,
				overdueObligationCount: 1,
			}),
		).toBe("at_risk");
	});

	it("marks near-term expiry without open work as at_risk", () => {
		expect(
			computeRetentionHealth({
				daysUntilExpiry: 10,
				openObligationCount: 0,
				overdueObligationCount: 0,
			}),
		).toBe("at_risk");
	});

	it("marks near-term expiry with open work as protecting", () => {
		expect(
			computeRetentionHealth({
				daysUntilExpiry: 20,
				openObligationCount: 2,
				overdueObligationCount: 0,
			}),
		).toBe("protecting");
	});

	it("marks far-dated healthy streams as protected", () => {
		expect(
			computeRetentionHealth({
				daysUntilExpiry: 200,
				openObligationCount: 0,
				overdueObligationCount: 0,
			}),
		).toBe("protected");
	});

	it("marks terminated lifecycle as expired", () => {
		expect(
			computeRetentionHealth({
				daysUntilExpiry: 50,
				openObligationCount: 0,
				overdueObligationCount: 0,
				lifecycleStatus: "terminated",
			}),
		).toBe("expired");
	});
});

describe("funding helpers", () => {
	it("formats usd without cents for dashboard cards", () => {
		expect(formatUsd(125000)).toBe("$125,000");
	});

	it("computes days until a fixed date", () => {
		const days = daysUntil("2099-01-01");
		expect(days).not.toBeNull();
		expect(days!).toBeGreaterThan(0);
	});

	it("validates pursuit stages", () => {
		expect(isPursuitStage("watching")).toBe(true);
		expect(isPursuitStage("nope")).toBe(false);
	});
});
