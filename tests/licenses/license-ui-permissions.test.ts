import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";
import { canLicenseAction } from "@/lib/licenses/licenseUiPermissions";

describe("canLicenseAction", () => {
	it("VIEW_ALL satisfies view", () => {
		expect(canLicenseAction([PERMISSIONS.LICENSES.VIEW_ALL], "view")).toBe(
			true,
		);
	});

	it("VIEW alone does not grant create/edit/delete", () => {
		const held = [PERMISSIONS.LICENSES.VIEW];
		expect(canLicenseAction(held, "view")).toBe(true);
		expect(canLicenseAction(held, "create")).toBe(false);
		expect(canLicenseAction(held, "edit")).toBe(false);
		expect(canLicenseAction(held, "delete")).toBe(false);
		expect(canLicenseAction(held, "allocate")).toBe(false);
		expect(canLicenseAction(held, "renew")).toBe(false);
	});

	it("EDIT does not grant delete", () => {
		expect(canLicenseAction([PERMISSIONS.LICENSES.EDIT], "delete")).toBe(false);
		expect(canLicenseAction([PERMISSIONS.LICENSES.EDIT], "edit")).toBe(true);
	});

	it("CREATE / ALLOCATE / RENEW map 1:1", () => {
		expect(canLicenseAction([PERMISSIONS.LICENSES.CREATE], "create")).toBe(
			true,
		);
		expect(canLicenseAction([PERMISSIONS.LICENSES.ALLOCATE], "allocate")).toBe(
			true,
		);
		expect(canLicenseAction([PERMISSIONS.LICENSES.RENEW], "renew")).toBe(true);
	});
});
