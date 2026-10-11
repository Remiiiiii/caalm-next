/** Org-level department performance metrics from live contract + user rows. */

export const DEPARTMENT_COMPLIANCE_TARGET = 80;

/** Points below target that still count as “near” (amber) instead of below (red). */
export const DEPARTMENT_NEAR_TARGET_BAND = 15;

export type PerformanceTrend = "up" | "down" | "stable";

export type PerformanceStatus = "on_target" | "near_target" | "below_target";

export interface DepartmentPerformanceContractRow {
	department?: unknown;
	compliance?: unknown;
}

export interface DepartmentPerformanceUserRow {
	status?: unknown;
}

export interface DepartmentPerformanceMetrics {
	/** Org-wide contract compliance rate (0–100). Surfaced as average score. */
	averageProductivity: number;
	/** Departments with ≥1 contract and compliance ≥ target. */
	meetingTargetCount: number;
	/** Active staff count. */
	totalStaffCount: number;
	trend: PerformanceTrend;
	totalContracts: number;
	departmentsWithContracts: number;
	/** Target % used for this computation (org setting or default). */
	complianceTarget: number;
	/** Green / amber / red band vs target. */
	status: PerformanceStatus;
	/** Activity change this week vs last (shown as trend “pts”). */
	trendDeltaPts: number;
}

export function clampComplianceTarget(value: unknown): number {
	const n = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(n)) return DEPARTMENT_COMPLIANCE_TARGET;
	return Math.min(100, Math.max(1, Math.round(n)));
}

export function resolvePerformanceStatus(
	score: number,
	target: number,
): PerformanceStatus {
	if (score >= target) return "on_target";
	if (score >= target - DEPARTMENT_NEAR_TARGET_BAND) return "near_target";
	return "below_target";
}

function asRecord(
	raw: DepartmentPerformanceContractRow | DepartmentPerformanceUserRow | Record<string, unknown>,
): Record<string, unknown> {
	const rec = raw as Record<string, unknown>;
	if (rec.data && typeof rec.data === "object") {
		return { ...rec, ...(rec.data as Record<string, unknown>) };
	}
	return rec;
}

function isCompliant(compliance: unknown): boolean {
	return compliance === "compliant" || compliance === "up-to-date";
}

function isActiveUser(status: unknown): boolean {
	return status === "active";
}

export function computePerformanceTrend(
	activityThisWeek: number,
	activityLastWeek: number,
): PerformanceTrend {
	if (activityLastWeek <= 0 && activityThisWeek <= 0) return "stable";
	if (activityLastWeek <= 0) return activityThisWeek > 0 ? "up" : "stable";
	const ratio = activityThisWeek / activityLastWeek;
	if (ratio >= 1.05) return "up";
	if (ratio <= 0.95) return "down";
	return "stable";
}

/**
 * Pure metrics from Appwrite contract/user rows (same fields analytics uses).
 */
export function computeDepartmentPerformance(input: {
	contracts: Array<
		DepartmentPerformanceContractRow | Record<string, unknown>
	>;
	users: Array<DepartmentPerformanceUserRow | Record<string, unknown>>;
	activityThisWeek?: number;
	activityLastWeek?: number;
	complianceTarget?: number;
}): DepartmentPerformanceMetrics {
	const target = input.complianceTarget ?? DEPARTMENT_COMPLIANCE_TARGET;
	const contracts = input.contracts.map(asRecord);

	const byDepartment = new Map<string, { total: number; compliant: number }>();
	let compliantTotal = 0;

	for (const contract of contracts) {
		const dept =
			typeof contract.department === "string" && contract.department.trim()
				? contract.department.trim()
				: null;
		if (!dept) continue;

		const bucket = byDepartment.get(dept) ?? { total: 0, compliant: 0 };
		bucket.total += 1;
		if (isCompliant(contract.compliance)) {
			bucket.compliant += 1;
			compliantTotal += 1;
		}
		byDepartment.set(dept, bucket);
	}

	const totalContracts = contracts.filter((c) => {
		const dept = c.department;
		return typeof dept === "string" && dept.trim().length > 0;
	}).length;

	const averageProductivity = totalContracts
		? Math.round((compliantTotal / totalContracts) * 100)
		: 0;

	let meetingTargetCount = 0;
	for (const bucket of byDepartment.values()) {
		if (bucket.total <= 0) continue;
		const rate = Math.round((bucket.compliant / bucket.total) * 100);
		if (rate >= target) meetingTargetCount += 1;
	}

	const totalStaffCount = input.users
		.map(asRecord)
		.filter((user) => isActiveUser(user.status)).length;

	const thisWeek = input.activityThisWeek ?? 0;
	const lastWeek = input.activityLastWeek ?? 0;
	const trend = computePerformanceTrend(thisWeek, lastWeek);
	const trendDeltaPts = thisWeek - lastWeek;

	return {
		averageProductivity,
		meetingTargetCount,
		totalStaffCount,
		trend,
		totalContracts,
		departmentsWithContracts: byDepartment.size,
		complianceTarget: target,
		status: resolvePerformanceStatus(averageProductivity, target),
		trendDeltaPts,
	};
}
