import { describe, expect, it } from "vitest";
import {
	buildSecurityEvidencePack,
	evidencePackCrossReferencesCompletedTasks,
	EXISTING_SECURITY_CONTROLS,
} from "@/lib/portability/security-evidence-pack";

describe("13.3 security questionnaire evidence pack", () => {
	it("only documents controls that list code refs and roadmap tasks", () => {
		for (const control of EXISTING_SECURITY_CONTROLS) {
			expect(control.codeRefs.length).toBeGreaterThan(0);
			expect(control.roadmapTaskCodes.length).toBeGreaterThan(0);
		}
	});

	it("cross-references every control task code to the roadmap catalog", () => {
		const pack = buildSecurityEvidencePack({
			orgId: "org-1",
			now: new Date("2026-09-14T12:00:00.000Z"),
		});
		expect(pack.schemaVersion).toBe(1);
		expect(pack.controls.length).toBeGreaterThan(0);
		expect(pack.roadmapCrossReference.length).toBeGreaterThan(0);
		expect(evidencePackCrossReferencesCompletedTasks(pack)).toBe(true);
		expect(pack.disclaimer.toLowerCase()).toContain("not invent");
	});
});
