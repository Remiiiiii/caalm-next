import { describe, expect, it } from "vitest";
import {
	computeDepartmentPerformance,
	computePerformanceTrend,
	resolvePerformanceStatus,
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
		expect(metrics.complianceTarget).toBe(80);
		expect(metrics.status).toBe("below_target");
		expect(metrics.trendDeltaPts).toBe(2);
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
		expect(metrics.status).toBe("below_target");
	});

	it("marks near_target inside the amber band", () => {
		const metrics = computeDepartmentPerformance({
			contracts: [
				{ department: "A", compliance: "compliant" },
				{ department: "A", compliance: "compliant" },
				{ department: "A", compliance: "compliant" },
				{ department: "B", compliance: "non-compliant" },
			],
			users: [{ status: "active" }],
			complianceTarget: 80,
		});
		// 3/4 = 75% → within 15 pts of 80
		expect(metrics.averageProductivity).toBe(75);
		expect(metrics.status).toBe("near_target");
	});
});

describe("resolvePerformanceStatus", () => {
	it("classifies on / near / below target", () => {
		expect(resolvePerformanceStatus(86, 80)).toBe("on_target");
		expect(resolvePerformanceStatus(70, 80)).toBe("near_target");
		expect(resolvePerformanceStatus(50, 80)).toBe("below_target");
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
