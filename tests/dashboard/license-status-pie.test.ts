import { describe, expect, it } from "vitest";
import {
	classifyLicenseStatusPieBucket,
	computeLicenseStatusPie,
} from "@/lib/dashboard/license-status-pie";

describe("classifyLicenseStatusPieBucket", () => {
	const now = new Date(2026, 9, 7); // Oct 7, 2026 local

	it("marks past expiry and status=expired as expired", () => {
		expect(
			classifyLicenseStatusPieBucket(
				{ licenseExpiryDate: "2026-08-12", status: "active" },
				now,
			),
		).toBe("expired");
		expect(
			classifyLicenseStatusPieBucket(
				{ licenseExpiryDate: "2027-01-01", status: "expired" },
				now,
			),
		).toBe("expired");
	});

	it("marks licenses within 90 days as expiring", () => {
		expect(
			classifyLicenseStatusPieBucket(
				{ licenseExpiryDate: "2026-11-01", status: "active" },
				now,
			),
		).toBe("expiring");
	});

	it("marks far-future active licenses as active", () => {
		expect(
			classifyLicenseStatusPieBucket(
				{ licenseExpiryDate: "2027-06-01", status: "active" },
				now,
			),
		).toBe("active");
	});
});

describe("computeLicenseStatusPie", () => {
	it("buckets into active / expiring / expired", () => {
		const now = new Date(2026, 9, 7);
		const result = computeLicenseStatusPie(
			[
				{ licenseExpiryDate: "2027-06-01", status: "active" },
				{ licenseExpiryDate: "2026-11-01", status: "active" },
				{ licenseExpiryDate: "2026-08-12", status: "expired" },
			],
			now,
		);

		expect(result.active).toBe(1);
		expect(result.expiring).toBe(1);
		expect(result.expired).toBe(1);
		expect(result.total).toBe(3);
	});
});
