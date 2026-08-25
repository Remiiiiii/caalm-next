/**
 * Legacy display label only — not calendar authz (#38 leftover cleanup).
 */

import { describe, expect, it } from "vitest";
import { calendarRoleFromRbacName } from "@/lib/calendar/legacyCalendarRole";

describe("calendarRoleFromRbacName", () => {
	it("maps org admins to admin label", () => {
		expect(calendarRoleFromRbacName("Super Admin")).toBe("admin");
		expect(calendarRoleFromRbacName("Organization Admin")).toBe("admin");
	});

	it("maps Department Manager to approver", () => {
		expect(calendarRoleFromRbacName("Department Manager")).toBe("approver");
	});

	it("maps Viewer and IT to viewer (IT pack is VIEW_OWN, not admin)", () => {
		expect(calendarRoleFromRbacName("Viewer")).toBe("viewer");
		expect(calendarRoleFromRbacName("IT")).toBe("viewer");
	});

	it("defaults unknown / custom roles to viewer", () => {
		expect(calendarRoleFromRbacName("Custom Role")).toBe("viewer");
		expect(calendarRoleFromRbacName("")).toBe("viewer");
	});
});
