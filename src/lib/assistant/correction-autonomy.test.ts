import { describe, expect, it } from "vitest";
import {
	autonomyFailSummaryLead,
	autonomyPassSummaryLead,
	classifyCorrectionAutonomy,
} from "@/lib/assistant/correction-autonomy";

describe("classifyCorrectionAutonomy", () => {
	it("fails for equipment physical reconciliation (2026-006-like)", () => {
		const result = classifyCorrectionAutonomy({
			title: "Equipment inventory not reconciled (repeat of 2025-003)",
			conditionText:
				"No physical reconciliation of property records to equipment on hand was performed during fiscal 2026.",
			correctiveText:
				"Perform the outstanding physical reconciliation of the equipment register.",
		});
		expect(result.aiCompletable).toBe(false);
		if (!result.aiCompletable) {
			expect(result.unmetReason).toMatch(/physically counted and reconciled/i);
		}
	});

	it("passes for SEFA / mapping-style data corrections", () => {
		const result = classifyCorrectionAutonomy({
			title: "SEFA misclassification of CDC award expenditures",
			conditionText:
				"The schedule of expenditures of federal awards reports expenditures by assistance listing number incorrectly.",
			correctiveText:
				"Map each federal award in the accounting system to its assistance listing number, and reconcile the SEFA to the general ledger by award before filing.",
		});
		expect(result).toEqual({ aiCompletable: true });
	});

	it("fails for staff training evidence", () => {
		const result = classifyCorrectionAutonomy({
			title: "Background screening renewals",
			conditionText: "Staff training completion records were missing.",
			correctiveText: "Ensure staff training completed and retain attendance.",
		});
		expect(result.aiCompletable).toBe(false);
	});

	it("fails for signature / acknowledgment", () => {
		const result = classifyCorrectionAutonomy({
			title: "Policy acknowledgment",
			conditionText: "Policy was not signed by covered staff.",
			correctiveText: "Collect signed acknowledgments from each employee.",
		});
		expect(result.aiCompletable).toBe(false);
	});
});

describe("autonomy summary leads", () => {
	it("pass lead states review-only close path", () => {
		expect(autonomyPassSummaryLead()).toMatch(/data correction/i);
		expect(autonomyPassSummaryLead()).toMatch(/marked closed/i);
		expect(autonomyPassSummaryLead()).not.toMatch(/upload documentation/i);
	});

	it("fail lead names the gate and blocks close", () => {
		const text = autonomyFailSummaryLead({
			canStartCap: true,
			unmetReason:
				"evidence that the equipment was physically counted and reconciled",
		});
		expect(text).toMatch(/start it for you/i);
		expect(text).toMatch(/physically counted and reconciled/i);
		expect(text).toMatch(/before it can be marked closed/i);
		expect(text).not.toMatch(/\bcompleted\b|\bfixed\b/i);
	});
});
