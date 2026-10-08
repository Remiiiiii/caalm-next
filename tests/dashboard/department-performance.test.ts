import { describe, expect, it } from "vitest";
import {
	computeDepartmentPerformance,
	computePerformanceTrend,
} from "@/lib/dashboard/department-performance";

describe("computeDepartmentPerformance", () => {
	it("computes compliance-based productivity, meeting target, and active staff", () => {
		const metrics = computeDepartmentPerformance({
			contracts: [
				{ department: "Operations", compliance: "compliant" },
				{ department: "Executive", compliance: "non-compliant" },
				{ department: "Executive", compliance: "up-to-date" },
				{ department: "Sales", compliance: "at-risk" },
				{ department: "", compliance: "compliant" },
			],
			users: [
				{ status: "active" },
				{ status: "active" },
				{ status: "inactive" },
				{ status: "active" },
			],
			activityThisWeek: 10,
			activityLastWeek: 8,
		});

		// 2 compliant of 4 dept-tagged contracts → 50%
		expect(metrics.averageProductivity).toBe(50);
		// Operations 100%, Executive 50%, Sales 0% → only Operations meets 80%
		expect(metrics.meetingTargetCount).toBe(1);
		expect(metrics.totalStaffCount).toBe(3);
		expect(metrics.departmentsWithContracts).toBe(3);
		expect(metrics.trend).toBe("up");
	});

	it("returns zeros when there are no contracts", () => {
		const metrics = computeDepartmentPerformance({
			contracts: [],
			users: [{ status: "active" }],
		});
		expect(metrics.averageProductivity).toBe(0);
		expect(metrics.meetingTargetCount).toBe(0);
		expect(metrics.totalStaffCount).toBe(1);
		expect(metrics.trend).toBe("stable");
	});
});

describe("computePerformanceTrend", () => {
	it("classifies week-over-week activity", () => {
		expect(computePerformanceTrend(12, 10)).toBe("up");
		expect(computePerformanceTrend(8, 10)).toBe("down");
		expect(computePerformanceTrend(10, 10)).toBe("stable");
		expect(computePerformanceTrend(0, 0)).toBe("stable");
	});
});
