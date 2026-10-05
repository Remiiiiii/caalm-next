import { describe, expect, it } from "vitest";
import {
	interpretITHubAccess,
	interpretITHubFleetAccess,
} from "@/lib/it/it-hub-access";

describe("IT hub access matrix", () => {
	it("rejects anonymous callers", () => {
		expect(
			interpretITHubAccess({
				authenticated: false,
				targetOrgId: "org_b",
				isMember: false,
				memberAllowed: false,
				platformAllowed: true,
			}),
		).toEqual({
			ok: false,
			status: 401,
			error: "Authentication required",
		});
	});

	it("rejects a member of org A requesting org B without platform permission", () => {
		expect(
			interpretITHubAccess({
				authenticated: true,
				targetOrgId: "org_b",
				isMember: false,
				memberAllowed: false,
				platformAllowed: false,
			}),
		).toEqual({
			ok: false,
			status: 403,
			error: "Access denied to this organization",
		});
	});

	it("allows a platform operator with view_all_orgs to inspect another tenant", () => {
		expect(
			interpretITHubAccess({
				authenticated: true,
				targetOrgId: "org_b",
				isMember: false,
				memberAllowed: false,
				platformAllowed: true,
			}),
		).toEqual({ ok: true, isPlatformCrossOrg: true });
	});

	it("allows a member with IT permission in their own org", () => {
		expect(
			interpretITHubAccess({
				authenticated: true,
				targetOrgId: "org_a",
				isMember: true,
				memberAllowed: true,
				platformAllowed: false,
			}),
		).toEqual({ ok: true, isPlatformCrossOrg: false });
	});

	it("denies a member who lacks the IT permission", () => {
		expect(
			interpretITHubAccess({
				authenticated: true,
				targetOrgId: "org_a",
				isMember: true,
				memberAllowed: false,
				platformAllowed: false,
			}),
		).toEqual({
			ok: false,
			status: 403,
			error: "Insufficient permissions",
		});
	});

	it("fleet listing requires platform permission", () => {
		expect(
			interpretITHubFleetAccess({
				authenticated: true,
				platformAllowed: false,
			}).ok,
		).toBe(false);
		expect(
			interpretITHubFleetAccess({
				authenticated: true,
				platformAllowed: true,
			}),
		).toEqual({ ok: true, isPlatformCrossOrg: true });
	});
});
