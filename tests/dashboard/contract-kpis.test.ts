import { describe, expect, it } from "vitest";
import { computeContractKpis } from "@/lib/dashboard/contract-kpis";

describe("computeContractKpis", () => {
	it("buckets status into active / draft / expired for the glance bar", () => {
		const kpis = computeContractKpis(
			[
				{ status: "active", compliance: "compliant" },
				{ status: "active", compliance: "compliant" },
				{ status: "pending-review" },
				{ status: "inactive" },
				{ status: "expired" },
				{ status: "active", isExpired: true },
			],
			6,
		);

		expect(kpis.statusBreakdown).toEqual({
			active: 2,
			draft: 2,
			expired: 2,
		});
		expect(kpis.totalContracts).toBe(6);
		expect(kpis.complianceRate).toBe(33);
	});

	it("counts expiring-soon only for non-expired rows inside 30 days", () => {
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		const inTen = new Date(now);
		inTen.setDate(now.getDate() + 10);
		const inForty = new Date(now);
		inForty.setDate(now.getDate() + 40);

		const kpis = computeContractKpis(
			[
				{
					status: "active",
					contractExpiryDate: inTen.toISOString().slice(0, 10),
				},
				{
					status: "active",
					contractExpiryDate: inForty.toISOString().slice(0, 10),
				},
				{
					status: "expired",
					contractExpiryDate: inTen.toISOString().slice(0, 10),
				},
			],
			3,
		);

		expect(kpis.expiringContracts).toBe(1);
		expect(kpis.statusBreakdown.expired).toBe(1);
	});
});
