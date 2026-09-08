import { describe, expect, it } from "vitest";
import {
	isCompanionPath,
	isDesktopRequiredPath,
} from "@/lib/ui/desktop-first";

describe("desktop-first path policy", () => {
	it("treats role dashboards as companion", () => {
		expect(isCompanionPath("/dashboard")).toBe(true);
		expect(isCompanionPath("/dashboard/departmentmanager")).toBe(true);
		expect(isDesktopRequiredPath("/dashboard")).toBe(false);
	});

	it("keeps approval, ticket, and news queues on phone", () => {
		expect(isCompanionPath("/contracts/approvals")).toBe(true);
		expect(isCompanionPath("/licenses/approvals/abc")).toBe(true);
		expect(isCompanionPath("/tickets/99")).toBe(true);
		expect(isCompanionPath("/team/tasks")).toBe(true);
		expect(isCompanionPath("/company-news")).toBe(true);
	});

	it("requires a laptop for dense product surfaces", () => {
		expect(isDesktopRequiredPath("/analytics")).toBe(true);
		expect(isDesktopRequiredPath("/settings")).toBe(true);
		expect(isDesktopRequiredPath("/contracts")).toBe(true);
		expect(isDesktopRequiredPath("/contracts/library")).toBe(true);
		expect(isDesktopRequiredPath("/licenses")).toBe(true);
		expect(isDesktopRequiredPath("/audits")).toBe(true);
	});

	it("does not treat /contracts as an approvals companion", () => {
		expect(isCompanionPath("/contracts")).toBe(false);
		expect(isCompanionPath("/contracts/approvals")).toBe(true);
	});

	it("normalizes trailing slashes and query strings", () => {
		expect(isCompanionPath("/dashboard/")).toBe(true);
		expect(isCompanionPath("/dashboard?tab=1")).toBe(true);
		expect(isCompanionPath("/contracts/approvals/")).toBe(true);
		expect(isDesktopRequiredPath("/analytics/?x=1")).toBe(true);
		expect(isDesktopRequiredPath("/dashboard/it/?q=1")).toBe(true);
	});

	it("overrides dense dashboard trees back to desktop-required", () => {
		expect(isCompanionPath("/dashboard/it")).toBe(false);
		expect(isDesktopRequiredPath("/dashboard/it/security/dashboard")).toBe(
			true,
		);
		expect(isDesktopRequiredPath("/dashboard/admin/roles")).toBe(true);
		expect(isDesktopRequiredPath("/dashboard/user-management")).toBe(true);
		expect(isCompanionPath("/dashboard/admin")).toBe(true);
	});
});
