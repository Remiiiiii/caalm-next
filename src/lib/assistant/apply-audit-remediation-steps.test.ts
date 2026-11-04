import { describe, expect, it } from "vitest";
import { buildApplyAuditRemediationSteps } from "@/lib/assistant/apply-audit-remediation-steps";

describe("buildApplyAuditRemediationSteps", () => {
	it("returns three progress steps with cap title in the load label", () => {
		const steps = buildApplyAuditRemediationSteps("Fix policy gap");
		expect(steps).toHaveLength(3);
		expect(steps[0]?.label).toContain("Fix policy gap");
		expect(steps[1]?.label).toContain("Open → In progress");
	});
});
