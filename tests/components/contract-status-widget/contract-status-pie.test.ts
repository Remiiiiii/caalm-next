import { describe, expect, it } from "vitest";
import {
	classifyContractStatusPieBucket,
	computeContractStatusPie,
	daysUntilContractExpiry,
} from "@/lib/dashboard/contract-status-pie";
import {
	createActiveContract,
	createCompletedContract,
	createExpiredContract,
	createExpiringContract,
	createMockContract,
} from "./test-helpers";

describe("daysUntilContractExpiry", () => {
	it("uses local date-only math (no timezone drift)", () => {
		const now = new Date(2026, 9, 6); // Oct 6, 2026 local
		expect(daysUntilContractExpiry("2026-10-16T00:00:00.000+00:00", now)).toBe(
			10,
		);
		expect(daysUntilContractExpiry("2026-09-30", now)).toBe(-6);
	});
});

describe("classifyContractStatusPieBucket", () => {
	const now = new Date(2026, 9, 6);

	it("marks past-dated rows expired even when stored daysUntilExpiry is still positive", () => {
		expect(
			classifyContractStatusPieBucket(
				{
					status: "pending-review",
					contractExpiryDate: "2026-09-30",
					daysUntilExpiry: 21, // stale
					isExpired: false,
				},
				now,
			),
		).toBe("expired");
	});

	it("does not trust status=active over a past expiry date", () => {
		expect(
			classifyContractStatusPieBucket(
				{
					status: "active",
					contractExpiryDate: "2026-09-01",
					isExpired: false,
					daysUntilExpiry: 10,
				},
				now,
			),
		).toBe("expired");
	});

	it("buckets within 90 days as expiring", () => {
		expect(
			classifyContractStatusPieBucket(
				{
					status: "pending-review",
					contractExpiryDate: "2026-11-15",
				},
				now,
			),
		).toBe("expiring");
	});

	it("buckets far-out active as active", () => {
		expect(
			classifyContractStatusPieBucket(
				{
					status: "active",
					contractExpiryDate: "2027-09-01",
				},
				now,
			),
		).toBe("active");
	});
});

describe("computeContractStatusPie", () => {
	it("keeps Active / Expiring / Expired mutually exclusive and summing to total", () => {
		const contracts = [
			createActiveContract(200, { contractName: "Active far" }),
			createExpiringContract(30, { contractName: "Expiring soon" }),
			createCompletedContract({ contractName: "Inactive" }),
			createExpiredContract(10, { contractName: "Expired" }),
			createMockContract({
				status: "pending-review",
				contractName: "Stale days past due",
				contractExpiryDate: new Date(
					Date.now() - 10 * 24 * 60 * 60 * 1000,
				).toISOString(),
				daysUntilExpiry: 21,
				isExpired: false,
			}),
		];

		const result = computeContractStatusPie(contracts);
		expect(result.active + result.expiring + result.expired).toBe(
			result.total,
		);
		expect(result.total).toBe(5);
		expect(result.active).toBe(1);
		expect(result.expiring).toBe(1);
		expect(result.expired).toBe(3);
	});

	it("matches live DB shape: past-due pending become Expired, not Expiring", () => {
		const now = new Date(2026, 9, 6);
		const rows = [
			{
				status: "active",
				contractExpiryDate: "2027-09-01",
				daysUntilExpiry: 357,
				isExpired: false,
			},
			{
				status: "expired",
				contractExpiryDate: "2026-08-28",
				daysUntilExpiry: -7,
				isExpired: true,
			},
			{
				status: "expired",
				contractExpiryDate: "2026-08-28",
				daysUntilExpiry: -7,
				isExpired: true,
			},
			{
				status: "pending-review",
				contractExpiryDate: "2028-03-01",
				daysUntilExpiry: 542,
				isExpired: false,
			},
			{
				status: "expired",
				contractExpiryDate: "2026-09-02",
				daysUntilExpiry: -7,
				isExpired: true,
			},
			{
				status: "pending-review",
				contractExpiryDate: "2026-09-30",
				daysUntilExpiry: 21,
				isExpired: false,
			},
			{
				status: "pending-review",
				contractExpiryDate: "2026-12-01",
				daysUntilExpiry: 86,
				isExpired: false,
			},
			{
				status: "pending-review",
				contractExpiryDate: "2027-05-12",
				daysUntilExpiry: 248,
				isExpired: false,
			},
			{
				status: "pending-review",
				contractExpiryDate: "2026-09-13",
				daysUntilExpiry: 6,
				isExpired: false,
			},
			{
				status: "pending-review",
				contractExpiryDate: "2026-12-01",
				daysUntilExpiry: 83,
				isExpired: false,
			},
			{
				status: "active",
				contractExpiryDate: "2027-10-01",
				daysUntilExpiry: 386,
				isExpired: false,
			},
			{
				status: "active",
				contractExpiryDate: "2027-10-01",
				daysUntilExpiry: 385,
				isExpired: false,
			},
			{
				status: "pending-signature",
				contractExpiryDate: "2027-10-01",
				daysUntilExpiry: 384,
				isExpired: false,
			},
			{
				status: "pending-signature",
				contractExpiryDate: "2027-10-01",
				daysUntilExpiry: 359,
				isExpired: false,
			},
			{
				status: "pending-review",
				contractExpiryDate: "2026-12-13",
				daysUntilExpiry: 68,
				isExpired: false,
			},
		];

		const result = computeContractStatusPie(rows, now);
		expect(result.total).toBe(15);
		expect(result.active).toBe(7);
		expect(result.expiring).toBe(3);
		expect(result.expired).toBe(5);
		expect(result.active + result.expiring + result.expired).toBe(15);
	});
});
