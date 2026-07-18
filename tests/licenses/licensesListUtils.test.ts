import { describe, expect, it } from "vitest";
import {
	computeLicenseMetrics,
	isLicenseExpiringWithinDays,
	matchesStatusTab,
} from "@/lib/licenses/licensesListUtils";
import type { License } from "@/types/licenses";

function createLicense(overrides: Partial<License> = {}): License {
	return {
		$id: overrides.$id ?? "lic-1",
		$createdAt: "2024-01-01T00:00:00.000Z",
		$updatedAt: "2024-01-01T00:00:00.000Z",
		licenseName: "Test",
		licenseNumber: "LN-1",
		licenseType: "subscription",
		licenseExpiryDate: "2099-12-31",
		issuingAuthority: "Authority",
		issueDate: "2024-01-01",
		status: "active",
		orgId: "org-1",
		...overrides,
	};
}

describe("licensesListUtils", () => {
	it("matches pending tab for pending-review and suspended", () => {
		expect(
			matchesStatusTab(createLicense({ status: "pending-review" }), "pending"),
		).toBe(true);
		expect(
			matchesStatusTab(createLicense({ status: "suspended" }), "pending"),
		).toBe(true);
		expect(
			matchesStatusTab(createLicense({ status: "active" }), "pending"),
		).toBe(false);
	});

	it("counts pending-review in metrics.pendingCount", () => {
		const metrics = computeLicenseMetrics([
			createLicense({ $id: "1", status: "pending-review" }),
			createLicense({ $id: "2", status: "suspended" }),
			createLicense({ $id: "3", status: "active" }),
		]);
		expect(metrics.pendingCount).toBe(2);
		expect(metrics.activeCount).toBe(1);
	});

	it("detects expiring within days", () => {
		const soon = new Date();
		soon.setDate(soon.getDate() + 15);
		const expiry = soon.toISOString().split("T")[0];
		const license = createLicense({ licenseExpiryDate: expiry });
		expect(isLicenseExpiringWithinDays(license, 30)).toBe(true);
		expect(isLicenseExpiringWithinDays(license, 7)).toBe(false);
	});
});
