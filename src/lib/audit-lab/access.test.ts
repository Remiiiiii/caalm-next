import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveLabCapabilities, sessionInScope } from "./access";

describe("resolveLabCapabilities", () => {
	it("viewer is read-only with org scope when only view", () => {
		const caps = resolveLabCapabilities({
			permissions: [PERMISSIONS.AUDIT_LAB.VIEW],
		});
		expect(caps.readOnly).toBe(true);
		expect(caps.canCreateSession).toBe(false);
		expect(caps.scope.kind).toBe("org");
	});

	it("session manager can create and publish", () => {
		const caps = resolveLabCapabilities({
			permissions: [
				PERMISSIONS.AUDIT_LAB.VIEW,
				PERMISSIONS.AUDIT_LAB.MANAGE_SESSIONS,
			],
		});
		expect(caps.canCreateSession).toBe(true);
		expect(caps.canPublishReports).toBe(true);
		expect(caps.readOnly).toBe(false);
	});

	it("coordinator can manage evidence", () => {
		const caps = resolveLabCapabilities({
			permissions: [
				PERMISSIONS.AUDIT_LAB.VIEW,
				PERMISSIONS.AUDIT_LAB.COORDINATE_EVIDENCE,
			],
		});
		expect(caps.canCoordinateEvidence).toBe(true);
		expect(caps.canManageEvidence).toBe(true);
	});

	it("maps practice PII and media permissions", () => {
		const caps = resolveLabCapabilities({
			permissions: [
				PERMISSIONS.AUDIT_LAB.VIEW,
				PERMISSIONS.AUDIT_LAB.VIEW_PRACTICE_PII,
				PERMISSIONS.AUDIT_LAB.MANAGE_PRACTICE_MEDIA,
			],
		});
		expect(caps.canViewPracticePii).toBe(true);
		expect(caps.canManagePracticeMedia).toBe(true);
	});
});

describe("sessionInScope", () => {
	it("filters departments when scoped", () => {
		const scope = {
			kind: "departments" as const,
			names: ["Finance"],
		};
		expect(sessionInScope("Finance", scope)).toBe(true);
		expect(sessionInScope("HR", scope)).toBe(false);
	});
});