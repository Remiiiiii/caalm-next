import { describe, expect, it } from "vitest";
import {
	FILTER_VALUES,
	getDaysUntilLicenseExpiry,
	getEmptyStateMessage,
	matchesWidgetLicenseExpiryFilter,
} from "@/components/license-expiry-alerts/types";
import type { License } from "@/types/licenses";

function makeLicense(overrides: Partial<License> = {}): License {
	return {
		$id: "lic-1",
		$createdAt: "",
		$updatedAt: "",
		licenseName: "Sample",
		licenseNumber: "N-1",
		licenseType: "business",
		licenseExpiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
			.toISOString()
			.split("T")[0],
		issuingAuthority: "State",
		issueDate: "2024-01-01",
		status: "active",
		...overrides,
	};
}

describe("license expiry alert filters", () => {
	it("matches 30-day bucket and excludes expired", () => {
		const soon = makeLicense({
			licenseExpiryDate: new Date(Date.now() + 5 * 86400000)
				.toISOString()
				.split("T")[0],
		});
		const expired = makeLicense({
			status: "expired",
			licenseExpiryDate: new Date(Date.now() - 5 * 86400000)
				.toISOString()
				.split("T")[0],
		});

		expect(
			matchesWidgetLicenseExpiryFilter(soon, FILTER_VALUES.THIRTY_DAYS),
		).toBe(true);
		expect(
			matchesWidgetLicenseExpiryFilter(expired, FILTER_VALUES.THIRTY_DAYS),
		).toBe(false);
		expect(
			matchesWidgetLicenseExpiryFilter(expired, FILTER_VALUES.EXPIRED),
		).toBe(true);
	});

	it("computes days until expiry from the date field", () => {
		const license = makeLicense({
			licenseExpiryDate: new Date(Date.now() + 12 * 86400000)
				.toISOString()
				.split("T")[0],
			daysUntilExpiry: 999,
		});
		const days = getDaysUntilLicenseExpiry(license);
		expect(days).toBeGreaterThanOrEqual(11);
		expect(days).toBeLessThanOrEqual(13);
	});

	it("returns empty-state copy for expired filter", () => {
		expect(getEmptyStateMessage(FILTER_VALUES.EXPIRED).title).toMatch(
			/no expired licenses/i,
		);
	});
});
