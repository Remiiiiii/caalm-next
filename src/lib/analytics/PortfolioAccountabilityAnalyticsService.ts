import { Query } from "node-appwrite";
import { computeSlaMetrics } from "@/lib/approvals/ApprovalSlaService";
import { parseWorkflowState } from "@/lib/approvals/ContractApprovalWorkflowService";
import {
	REASON_CATEGORY_LABELS,
	type ExpirationAttestation,
	type ExpirationReasonCategory,
} from "@/lib/approvals/expirationAttestation.types";
import { listAttestationsForOrg } from "@/lib/approvals/ExpirationAttestationService";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { excludeSoftDeletedQuery } from "@/lib/soft-delete";
import type {
	PortfolioAccountabilityMetrics,
	PortfolioPeriod,
	StatusCounts,
} from "@/lib/analytics/portfolioAccountability.types";

export type {
	PortfolioAccountabilityMetrics,
	PortfolioPeriod,
	StatusCounts,
} from "@/lib/analytics/portfolioAccountability.types";

function periodDays(period: PortfolioPeriod): number {
	if (period === "90d") return 90;
	if (period === "1y") return 365;
	return 30;
}

function emptyCounts(): StatusCounts {
	return {
		active: 0,
		expired: 0,
		pendingReview: 0,
		inactive: 0,
		other: 0,
		total: 0,
	};
}

function bumpStatus(counts: StatusCounts, status: string): void {
	const normalized = status.toLowerCase();
	counts.total += 1;
	if (normalized === "active") counts.active += 1;
	else if (normalized === "expired") counts.expired += 1;
	else if (normalized === "pending-review" || normalized === "action-required") {
		counts.pendingReview += 1;
	} else if (normalized === "inactive") counts.inactive += 1;
	else counts.other += 1;
}

function parseAmount(value: unknown): number {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const n = Number(value.replace(/[^0-9.-]/g, ""));
		return Number.isFinite(n) ? n : 0;
	}
	return 0;
}

function parseDate(value: unknown): Date | null {
	if (!value) return null;
	const d = new Date(String(value));
	return Number.isNaN(d.getTime()) ? null : d;
}

function median(values: number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	const raw =
		sorted.length % 2 === 0
			? (sorted[mid - 1] + sorted[mid]) / 2
			: sorted[mid];
	return Math.round(raw * 10) / 10;
}

function average(values: number[]): number | null {
	if (values.length === 0) return null;
	return Math.round((values.reduce((s, n) => s + n, 0) / values.length) * 10) / 10;
}

function departmentOf(row: Record<string, unknown>): string {
	return (
		String(row.department || row.division || "").trim() || "Unassigned"
	);
}

function expiryDateOf(row: Record<string, unknown>, kind: "contract" | "license"): Date | null {
	return parseDate(
		kind === "contract"
			? row.contractExpiryDate
			: row.licenseExpiryDate || row.expirationDate,
	);
}

function cycleDays(row: Record<string, unknown>): number | null {
	const state = parseWorkflowState(row.approvalWorkflowState as string);
	if (!state) return null;
	const submitted = state.steps.find((s) => s.kind === "submitted");
	const activated = state.steps.find((s) => s.kind === "activated");
	const start = parseDate(submitted?.completedAt || submitted?.startedAt || row.$createdAt);
	const end = parseDate(activated?.completedAt);
	if (!start || !end) return null;
	const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
	return days >= 0 ? days : null;
}

function stepDurations(row: Record<string, unknown>): Array<{ kind: string; hours: number }> {
	const state = parseWorkflowState(row.approvalWorkflowState as string);
	if (!state) return [];
	const out: Array<{ kind: string; hours: number }> = [];
	for (const step of state.steps) {
		const start = parseDate(step.startedAt);
		const end = parseDate(step.completedAt);
		if (!start || !end) continue;
		const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
		if (hours >= 0) out.push({ kind: step.kind, hours });
	}
	return out;
}

function parseRenewalHistory(raw: unknown): Array<{ renewalDate?: string }> {
	if (Array.isArray(raw)) return raw as Array<{ renewalDate?: string }>;
	if (typeof raw === "string" && raw.trim()) {
		try {
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}
	return [];
}

function trendLabel(date: Date, period: PortfolioPeriod): string {
	if (period === "1y") {
		return date.toLocaleString("en-US", { month: "short" });
	}
	const month = date.toLocaleString("en-US", { month: "short" });
	const day = String(date.getDate()).padStart(2, "0");
	return `${month} ${day}`;
}

function bucketStart(date: Date, period: PortfolioPeriod): string {
	if (period === "1y") {
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
	}
	const start = new Date(date);
	start.setDate(start.getDate() - start.getDay());
	return start.toISOString().slice(0, 10);
}

async function listOrgRows(
	tableId: string,
	table: "contracts" | "licenses",
	orgId?: string,
): Promise<Array<Record<string, unknown>>> {
	if (!appwriteConfig.databaseId || !tableId) return [];
	const { tablesDB } = await createAdminClient();
	const queries = [Query.limit(500), excludeSoftDeletedQuery(table)];
	if (orgId) queries.unshift(Query.equal("orgId", orgId));
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId,
		tableId,
		queries,
	});
	return result.rows as Array<Record<string, unknown>>;
}

export async function computePortfolioAccountability(
	orgId?: string,
	period: PortfolioPeriod = "30d",
): Promise<PortfolioAccountabilityMetrics> {
	const now = new Date();
	const start = new Date(now);
	start.setDate(start.getDate() - periodDays(period));
	const startMs = start.getTime();

	const [contracts, licenses, attestations, sla] = await Promise.all([
		listOrgRows(appwriteConfig.contractsCollectionId, "contracts", orgId),
		listOrgRows(appwriteConfig.licensesCollectionId, "licenses", orgId),
		orgId ? listAttestationsForOrg(orgId) : Promise.resolve([]),
		computeSlaMetrics(orgId),
	]);

	const contractCounts = emptyCounts();
	const licenseCounts = emptyCounts();
	let totalValue = 0;
	const cycleDaysList: number[] = [];
	const stepHours = new Map<string, { total: number; count: number }>();
	const deptMap = new Map<
		string,
		{ documents: number; expired: number; pendingAttestations: number; value: number }
	>();

	const ensureDept = (name: string) => {
		const existing = deptMap.get(name);
		if (existing) return existing;
		const created = {
			documents: 0,
			expired: 0,
			pendingAttestations: 0,
			value: 0,
		};
		deptMap.set(name, created);
		return created;
	};

	const expiredInPeriodRows: Array<{
		id: string;
		kind: "contract" | "license";
		dept: string;
		when: Date;
	}> = [];
	let eligible = 0;

	const walk = (
		rows: Array<Record<string, unknown>>,
		kind: "contract" | "license",
		counts: StatusCounts,
	) => {
		for (const row of rows) {
			const status = String(row.status || "");
			bumpStatus(counts, status);
			const value = parseAmount(kind === "contract" ? row.amount : row.cost);
			totalValue += value;
			const dept = ensureDept(departmentOf(row));
			dept.documents += 1;
			dept.value += value;
			if (status.toLowerCase() === "expired") dept.expired += 1;

			const days = cycleDays(row);
			if (days != null) cycleDaysList.push(days);
			for (const step of stepDurations(row)) {
				const bucket = stepHours.get(step.kind) || { total: 0, count: 0 };
				bucket.total += step.hours;
				bucket.count += 1;
				stepHours.set(step.kind, bucket);
			}

			const expiry = expiryDateOf(row, kind);
			const expiredAt = parseDate(row.$updatedAt);
			if (expiry && expiry.getTime() >= startMs && expiry.getTime() <= now.getTime()) {
				eligible += 1;
			}
			if (status.toLowerCase() === "expired") {
				const when = expiry || expiredAt || now;
				if (when.getTime() >= startMs) {
					expiredInPeriodRows.push({
						id: String(row.$id),
						kind,
						dept: departmentOf(row),
						when,
					});
					if (!expiry || expiry.getTime() < startMs) eligible += 1;
				}
			}
		}
	};

	walk(contracts, "contract", contractCounts);
	walk(licenses, "license", licenseCounts);

	const attestationByEntity = new Map<string, ExpirationAttestation>();
	for (const item of attestations) {
		attestationByEntity.set(`${item.entityType}:${item.entityId}`, item);
	}

	let intentional = 0;
	let unintentional = 0;
	const overdueDays: number[] = [];
	const hoursToAttest: number[] = [];
	let pending = 0;
	let submitted = 0;
	let reviewed = 0;
	let overduePending = 0;
	let unattestedExpirations = 0;
	const rootCause = new Map<string, number>();
	const trendMap = new Map<
		string,
		{ label: string; expired: number; attested: number; days: number[]; sort: string }
	>();

	const ensureTrend = (date: Date) => {
		const key = bucketStart(date, period);
		const existing = trendMap.get(key);
		if (existing) return existing;
		const created = {
			label: trendLabel(date, period),
			expired: 0,
			attested: 0,
			days: [] as number[],
			sort: key,
		};
		trendMap.set(key, created);
		return created;
	};

	for (const row of expiredInPeriodRows) {
		const att = attestationByEntity.get(`${row.kind}:${row.id}`);
		ensureTrend(row.when).expired += 1;
		if (!att || att.status === "pending") {
			unattestedExpirations += 1;
		}
		if (att?.intent === "intentional" && att.phase === "pre_expiry") {
			intentional += 1;
		} else if (att) {
			unintentional += 1;
		} else {
			unintentional += 1;
		}
	}

	for (const att of attestations) {
		if (att.status === "pending") pending += 1;
		if (att.status === "submitted") submitted += 1;
		if (att.status === "reviewed" || att.status === "waived") reviewed += 1;
		const expiredAt = parseDate(att.expiredAt || att.priorExpiryDate);
		if (att.status === "pending" && expiredAt) {
			const ageDays = (now.getTime() - expiredAt.getTime()) / (1000 * 60 * 60 * 24);
			if (ageDays > 7) overduePending += 1;
		}
		const submittedAt = parseDate(att.submittedAt);
		if (expiredAt && submittedAt) {
			const hours =
				(submittedAt.getTime() - expiredAt.getTime()) / (1000 * 60 * 60);
			if (hours >= 0) hoursToAttest.push(hours);
			const days = hours / 24;
			if (days >= 0) overdueDays.push(days);
			ensureTrend(submittedAt).attested += 1;
		}
		if (att.reasonCategory) {
			rootCause.set(
				att.reasonCategory,
				(rootCause.get(att.reasonCategory) || 0) + 1,
			);
		}
		if (att.status === "pending") {
			const match =
				contracts.find((r) => String(r.$id) === att.entityId) ||
				licenses.find((r) => String(r.$id) === att.entityId);
			if (match) ensureDept(departmentOf(match)).pendingAttestations += 1;
		}
	}

	for (const row of [...contracts, ...licenses]) {
		const days = cycleDays(row);
		const activated = parseWorkflowState(row.approvalWorkflowState as string)
			?.steps.find((s) => s.kind === "activated");
		const end = parseDate(activated?.completedAt);
		if (days != null && end && end.getTime() >= startMs) {
			ensureTrend(end).days.push(days);
		}
	}

	const expiredInPeriod = expiredInPeriodRows.length;
	const unintentionalExpired = expiredInPeriod - intentional;
	const expirationRate =
		eligible > 0 ? Math.round((unintentionalExpired / eligible) * 100) : 0;
	const unintentionalRate =
		expiredInPeriod > 0
			? Math.round((unintentional / expiredInPeriod) * 100)
			: 0;

	let renewedTotal = 0;
	let within30 = 0;
	let within60 = 0;
	let within90 = 0;
	for (const row of licenses) {
		const history = parseRenewalHistory(row.renewalHistory);
		const expiry = expiryDateOf(row, "license");
		for (const record of history) {
			const renewedAt = parseDate(record.renewalDate);
			if (!renewedAt || renewedAt.getTime() < startMs) continue;
			renewedTotal += 1;
			if (!expiry) continue;
			const lagDays =
				(renewedAt.getTime() - expiry.getTime()) / (1000 * 60 * 60 * 24);
			if (lagDays <= 30) within30 += 1;
			if (lagDays <= 60) within60 += 1;
			if (lagDays <= 90) within90 += 1;
		}
	}

	return {
		period,
		periodStart: start.toISOString(),
		periodEnd: now.toISOString(),
		portfolio: {
			contracts: contractCounts,
			licenses: licenseCounts,
			totalDocuments: contractCounts.total + licenseCounts.total,
			totalValue: Math.round(totalValue),
		},
		velocity: {
			avgDaysSubmitToActive: average(cycleDaysList),
			medianDaysSubmitToActive: median(cycleDaysList),
			avgStepHoursByKind: Array.from(stepHours.entries()).map(
				([stepKind, bucket]) => ({
					stepKind,
					avgHours: Math.round((bucket.total / bucket.count) * 10) / 10,
					count: bucket.count,
				}),
			),
			sla: {
				openItems: sla.openItems,
				atRisk: sla.atRisk,
				breached: sla.breached,
				avgStepHours: sla.avgStepHours,
				breachRate: sla.breachRate,
			},
		},
		expiration: {
			expiredInPeriod,
			eligible,
			expirationRate,
			intentional,
			unintentional,
			unintentionalRate,
			avgDaysOverdueBeforeAttest: average(overdueDays),
		},
		accountability: {
			pending,
			submitted,
			reviewed,
			overduePending,
			avgHoursToAttest: average(hoursToAttest),
			unattestedExpirations,
		},
		renewal: {
			renewedTotal,
			within30,
			within60,
			within90,
			recoveryRate30:
				expiredInPeriod > 0
					? Math.round((within30 / expiredInPeriod) * 100)
					: 0,
		},
		rootCause: Array.from(rootCause.entries())
			.map(([category, count]) => ({
				category,
				label:
					REASON_CATEGORY_LABELS[category as ExpirationReasonCategory] ||
					category,
				count,
			}))
			.sort((a, b) => b.count - a.count),
		departments: Array.from(deptMap.entries())
			.map(([department, stats]) => ({ department, ...stats }))
			.sort((a, b) => b.documents - a.documents),
		trends: Array.from(trendMap.values())
			.sort((a, b) => a.sort.localeCompare(b.sort))
			.map((item) => ({
				label: item.label,
				expired: item.expired,
				attested: item.attested,
				avgDaysToActive: average(item.days),
			})),
	};
}
