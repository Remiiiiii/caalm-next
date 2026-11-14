import { describe, expect, it } from "vitest";
import { LICENSE_METRICS_COLUMNS } from "@/lib/licenses/fetchLicenseMetricsRows";

describe("LICENSE_METRICS_COLUMNS", () => {
	it("selects only columns that exist on the licenses table", () => {
		// None of these are columns; selecting one makes Appwrite fail the whole query (HTTP 500 on /api/licenses/metrics).
		for (const phantom of [
			"expirationDate",
			"complianceStatus",
			"department",
		]) {
			expect(LICENSE_METRICS_COLUMNS).not.toContain(phantom);
		}
	});

	it("includes the fields metrics, filters and export read", () => {
		for (const key of [
			"status",
			"compliance",
			"cost",
			"licenseExpiryDate",
			"division",
			"assignedManagers",
			"licenseName",
		]) {
			expect(LICENSE_METRICS_COLUMNS).toContain(key);
		}
	});
});
