import { Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { LicenseService } from "@/lib/api/licenses/services/LicenseService";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type {
	ComputeRiskImpactOptions,
	RiskImpactEvent,
	RiskImpactPeriod,
	RiskImpactSnapshot,
	RiskImpactSparkPoint,
	RiskImpactWin,
} from "@/lib/dashboard/risk-impact.types";
import {
	buildRiskImpactEvent,
	classifyImpactLog,
	HEALTHY_VALUES,
	resolveEventSource,
	resolveRecordName,
} from "@/lib/dashboard/risk-impact-events";
import {
	buildRiskTrackingSeries,
	mergeTrackingEventDates,
} from "@/lib/dashboard/risk-impact-sparkline";
import {
	buildTrend,
	earliestDate,
	inRange,
	previousQuarterRange,
	priorYearWindow,
} from "@/lib/dashboard/risk-impact-trends";
import {
	buildContractQueries,
	getContractListScope,
} from "@/lib/rbac/data-scope";
import { getUserPermissions } from "@/lib/rbac/permissions";
import { type AuditLogEntry, getAuditLogs } from "@/lib/services/audit-logger";
import { DIVISION_TO_DEPARTMENT, type UserDivision } from "../../../constants";

/** Grant contracts count at full face value toward event-based risk averted. */
const GRANT_WEIGHT = 1.0;
/** Non-grant contracts count at a slight discount (conservative). */
const OTHER_CONTRACT_WEIGHT = 0.85;
/**
 * Fraction of currently protected portfolio value treated as "at risk if unmanaged".
 * Tuned conservatively vs industry 2–9% leakage framing.
 */
const PORTFOLIO_PROTECTION_FACTOR = 0.15;

interface ContractRow {
	$id: string;
	contractName?: string;
	name?: string;
	amount?: number | string;
	compliance?: string;
	status?: string;
	riskLevel?: string;
	contractType?: string;
	type?: string;
	division?: string;
	department?: string;
	contractExpiryDate?: string;
	isExpired?: boolean;
}

interface LicenseRow {
	$id: string;
	licenseName?: string;
	name?: string;
	title?: string;
	cost?: number | string;
	compliance?: string;
	status?: string;
	division?: string;
	licenseExpiryDate?: string;
}

function formatUsd(amount: number): string {
	if (!Number.isFinite(amount) || amount <= 0) return "$0";
	if (amount >= 1_000_000) {
		return `$${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
	}
	if (amount >= 10_000) {
		return `$${Math.round(amount / 1000)}k`;
	}
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(amount);
}

function parseAmount(value: unknown): number {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const n = Number.parseFloat(value.replace(/[$,]/g, ""));
		return Number.isFinite(n) ? n : 0;
	}
	return 0;
}

function periodStart(period: RiskImpactPeriod): Date {
	const now = new Date();
	if (period === "ytd") {
		return new Date(now.getFullYear(), 0, 1);
	}
	const days = period === "last30" ? 30 : 90;
	const start = new Date(now);
	start.setDate(start.getDate() - days);
	start.setHours(0, 0, 0, 0);
	return start;
}

function periodLabel(period: RiskImpactPeriod): string {
	const year = new Date().getFullYear();
	if (period === "ytd") return `${year} year to date`;
	if (period === "last30") return "Last 30 days";
	return "Last 90 days";
}

function isGrantContract(contract: ContractRow): boolean {
	const type = String(
		contract.contractType || contract.type || "",
	).toLowerCase();
	return type === "grant" || type.includes("grant");
}

function isHighRisk(contract: ContractRow): boolean {
	const risk = String(contract.riskLevel || "").toLowerCase();
	return (
		risk === "high" ||
		risk === "high risk" ||
		risk === "critical" ||
		risk.includes("high")
	);
}

function daysUntil(dateStr?: string): number | null {
	if (!dateStr) return null;
	const expiry = new Date(dateStr);
	if (Number.isNaN(expiry.getTime())) return null;
	const now = new Date();
	const startOfToday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
	);
	const startOfExpiry = new Date(
		expiry.getFullYear(),
		expiry.getMonth(),
		expiry.getDate(),
	);
	return Math.ceil(
		(startOfExpiry.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24),
	);
}

function isExpiringWithin90(dateStr?: string): boolean {
	const days = daysUntil(dateStr);
	return days !== null && days >= 0 && days <= 90;
}

function isExpiredContract(contract: ContractRow): boolean {
	if (contract.isExpired) return true;
	const days = daysUntil(contract.contractExpiryDate);
	return days !== null && days < 0;
}

type ImpactKind = "flag" | "gap" | "renewal";

function matchesDivision(
	row: { division?: string; department?: string },
	division?: string,
): boolean {
	if (!division) return true;
	const dept = DIVISION_TO_DEPARTMENT[division as UserDivision] || undefined;
	const rowDiv = (row.division || "").toLowerCase();
	const rowDept = (row.department || "").toLowerCase();
	const targetDiv = division.toLowerCase();
	const targetDept = (dept || "").toLowerCase();
	return (
		rowDiv === targetDiv ||
		(!!targetDept && (rowDept === targetDept || rowDiv === targetDept))
	);
}

function weightedContractAmount(contract: ContractRow | undefined): number {
	if (!contract) return 0;
	const base = parseAmount(contract.amount);
	if (base <= 0) return 0;
	return (
		base * (isGrantContract(contract) ? GRANT_WEIGHT : OTHER_CONTRACT_WEIGHT)
	);
}

function buildSparkline(
	period: RiskImpactPeriod,
	start: Date,
	eventDates: string[],
): RiskImpactSparkPoint[] {
	return buildRiskTrackingSeries(period, start, eventDates);
}

function monitoredStatusClause(
	contractsMonitored: number,
	grantsMonitored: number,
): string {
	const grantLabel =
		grantsMonitored === 1 ? "1 grant" : `${grantsMonitored} grants`;

	if (contractsMonitored === 0 && grantsMonitored === 0) {
		return "There are no contracts currently being monitored";
	}
	if (contractsMonitored === 0) {
		return `There are no contracts; ${grantLabel} ${
			grantsMonitored === 1 ? "is" : "are"
		} currently being monitored`;
	}
	if (contractsMonitored === 1 && grantsMonitored === 0) {
		return "1 contract is currently being monitored";
	}
	if (contractsMonitored === 1) {
		return `1 contract and ${grantLabel} are currently being monitored`;
	}
	if (grantsMonitored === 0) {
		return `${contractsMonitored} contracts are currently being monitored`;
	}
	return `${contractsMonitored} contracts and ${grantLabel} are currently being monitored`;
}

function buildTrackingNote(input: {
	period: RiskImpactPeriod;
	contractsMonitored: number;
	grantsMonitored: number;
	primaryAmount: number;
	hasContracts: boolean;
}): string {
	const year = new Date().getFullYear();
	const yearPhrase =
		input.period === "ytd"
			? `in ${year}`
			: input.period === "last30"
				? "in the last 30 days"
				: "in the last 90 days";

	if (!input.hasContracts) {
		return "Contract monitoring is unavailable for your account. Ask an admin to grant contracts.view so CAALM can track risk averted.";
	}

	const status = monitoredStatusClause(
		input.contractsMonitored,
		input.grantsMonitored,
	);

	if (input.primaryAmount <= 0) {
		return `This metric activates automatically once CAALM flags a clause, deadline, or funding condition that would have created exposure. ${status}. Nothing at risk has been detected so far ${yearPhrase}.`;
	}

	return `${status}. Risk-averted dollars update as compliance flags, closed gaps, and on-time renewals land ${yearPhrase}.`;
}

function buildNarrative(input: {
	period: RiskImpactPeriod;
	primaryFormatted: string;
	secondaryFormatted: string;
	counts: RiskImpactSnapshot["counts"];
	hasAudit: boolean;
	hasLicenses: boolean;
}): string {
	const yearPhrase =
		input.period === "ytd"
			? "this year"
			: input.period === "last30"
				? "in the last 30 days"
				: "in the last 90 days";

	const parts: string[] = [
		`Contract and grant risk averted ${yearPhrase}: ${input.primaryFormatted}.`,
	];

	const proof: string[] = [];
	if (input.hasAudit) {
		const { complianceFlagsCaught, auditGapsClosed } = input.counts;
		if (complianceFlagsCaught > 0) {
			proof.push(
				`${complianceFlagsCaught} compliance flag${complianceFlagsCaught === 1 ? "" : "s"} caught`,
			);
		}
		if (auditGapsClosed > 0) {
			proof.push(
				`${auditGapsClosed} audit gap${auditGapsClosed === 1 ? "" : "s"} closed`,
			);
		}
	}
	if (input.hasLicenses && input.counts.licensesRenewedOnTime > 0) {
		const n = input.counts.licensesRenewedOnTime;
		proof.push(`${n} license${n === 1 ? "" : "s"} renewed on time`);
	}

	if (proof.length > 0) {
		const joined =
			proof.length === 1
				? proof[0]
				: proof.length === 2
					? `${proof[0]} and ${proof[1]}`
					: `${proof.slice(0, -1).join(", ")}, and ${proof[proof.length - 1]}`;
		parts.push(`CAALM recorded ${joined}.`);
	}

	if (input.secondaryFormatted !== "$0") {
		parts.push(
			`${input.secondaryFormatted} in portfolio value stays protected while obligations stay current.`,
		);
	}

	return parts.join(" ");
}

async function fetchScopedContracts(
	userId: string,
	orgId: string,
	division?: string,
): Promise<ContractRow[]> {
	const scope = await getContractListScope(userId, orgId);
	const scopeQueries = buildContractQueries(scope);
	const { tablesDB } = await createAdminClient();

	const queries = [...scopeQueries, Query.limit(500)];

	if (division) {
		const department =
			DIVISION_TO_DEPARTMENT[division as UserDivision] || undefined;

		const fetchScoped = async (
			field: "division" | "department",
			value: string,
		) => {
			try {
				return await tablesDB.listRows({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.contractsCollectionId!,
					queries: [
						...scopeQueries,
						Query.equal(field, value),
						Query.limit(500),
					],
				});
			} catch {
				return { rows: [] as unknown[] };
			}
		};

		const [byDivision, byDept] = await Promise.all([
			fetchScoped("division", division),
			department
				? fetchScoped("department", department)
				: Promise.resolve({ rows: [] as unknown[] }),
		]);

		const merged = [
			...(byDivision.rows as unknown as ContractRow[]),
			...(byDept.rows as unknown as ContractRow[]),
		];
		if (merged.length > 0) {
			const seen = new Set<string>();
			return merged.filter((row) => {
				const id = row.$id;
				if (!id || seen.has(id)) return false;
				seen.add(id);
				return true;
			});
		}
	}

	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.contractsCollectionId!,
		queries,
	});

	const rows = result.rows as unknown as ContractRow[];
	if (!division) return rows;
	return rows.filter((r) => matchesDivision(r, division));
}

async function fetchScopedLicenses(
	orgId: string,
	division?: string,
): Promise<LicenseRow[]> {
	const { licenses } = await LicenseService.listLicenses(orgId, undefined, {
		limit: 500,
		offset: 0,
	});
	const rows = licenses as unknown as LicenseRow[];
	if (!division) return rows;
	return rows.filter((r) => matchesDivision(r, division));
}

function computePortfolioProtected(contracts: ContractRow[]): number {
	let total = 0;
	for (const contract of contracts) {
		const compliance = String(contract.compliance || "").toLowerCase();
		const status = String(contract.status || "").toLowerCase();
		const healthy =
			HEALTHY_VALUES.has(compliance) || HEALTHY_VALUES.has(status);
		if (!healthy) continue;
		if (contract.isExpired) continue;

		const qualifies =
			isGrantContract(contract) ||
			isHighRisk(contract) ||
			isExpiringWithin90(contract.contractExpiryDate);
		if (!qualifies) continue;

		const amount = parseAmount(contract.amount);
		if (amount > 0) {
			total += amount * PORTFOLIO_PROTECTION_FACTOR;
		}
	}
	return total;
}

export async function computeRiskImpact(
	options: ComputeRiskImpactOptions,
): Promise<RiskImpactSnapshot> {
	const period = options.period || "ytd";
	const { userId, orgId, division } = options;
	const permissions = await getUserPermissions(userId, orgId);

	const canViewContracts = permissions.includes(PERMISSIONS.CONTRACTS.VIEW);
	const canViewLicenses = permissions.includes(PERMISSIONS.LICENSES.VIEW);
	const canViewAudit = permissions.includes(PERMISSIONS.AUDIT.VIEW);

	const start = periodStart(period);
	const now = new Date();
	const yearAgo = priorYearWindow(period, start, now);
	const quarters = previousQuarterRange(now);
	const compareStart = earliestDate(yearAgo.start, quarters.priorStart, start);
	const startIso = compareStart.toISOString();

	let contracts: ContractRow[] = [];
	let licenses: LicenseRow[] = [];
	let auditLogs: AuditLogEntry[] = [];

	const fetches: Promise<void>[] = [];

	if (canViewContracts) {
		fetches.push(
			fetchScopedContracts(userId, orgId, division).then((rows) => {
				contracts = rows;
			}),
		);
	}

	if (canViewLicenses) {
		fetches.push(
			fetchScopedLicenses(orgId, division).then((rows) => {
				licenses = rows;
			}),
		);
	}

	if (canViewAudit) {
		fetches.push(
			getAuditLogs({
				orgId,
				startDate: startIso,
				limit: 500,
				offset: 0,
			})
				.then((logs) => {
					auditLogs = logs;
				})
				.catch(() => {
					auditLogs = [];
				}),
		);
	}

	await Promise.all(fetches);

	const contractById = new Map(contracts.map((c) => [c.$id, c]));
	const licenseById = new Map(licenses.map((l) => [l.$id, l]));
	const allowedTargetIds = new Set([
		...contractById.keys(),
		...licenseById.keys(),
	]);

	const scopedLogs =
		division && allowedTargetIds.size > 0
			? auditLogs.filter(
					(log) => !log.target_id || allowedTargetIds.has(log.target_id),
				)
			: auditLogs;

	let complianceFlagsCaught = 0;
	let auditGapsClosed = 0;
	let licensesRenewedOnTime = 0;
	let primaryAmount = 0;
	let priorYearAmount = 0;
	const quarterNow = { flag: 0, gap: 0, renewal: 0 };
	const quarterPrior = { flag: 0, gap: 0, renewal: 0 };
	const recentWins: RiskImpactWin[] = [];
	const events: RiskImpactEvent[] = [];
	const seenTargets = new Set<string>();
	const priorYearSeen = new Set<string>();
	const impactEventDates: string[] = [];

	const dollarsForKind = (kind: ImpactKind, log: AuditLogEntry): number => {
		if (kind === "renewal") {
			const license = log.target_id ? licenseById.get(log.target_id) : undefined;
			return parseAmount(license?.cost);
		}
		const contract = log.target_id ? contractById.get(log.target_id) : undefined;
		const license = log.target_id ? licenseById.get(log.target_id) : undefined;
		if (kind === "flag") {
			return weightedContractAmount(contract) || parseAmount(license?.cost);
		}
		return weightedContractAmount(contract);
	};

	const winLabel = (kind: ImpactKind, log: AuditLogEntry): string => {
		if (log.summary || log.event_title) {
			return log.summary || log.event_title || "";
		}
		if (kind === "renewal") return "License renewed on time";
		if (kind === "flag") return "Compliance flag caught";
		return "Audit gap closed";
	};

	if (canViewAudit) {
		for (const log of scopedLogs) {
			const at = log.created_at || "";
			const kind = classifyImpactLog(log, canViewLicenses);
			if (!kind) continue;

			const when = at ? new Date(at) : null;
			if (!when || Number.isNaN(when.getTime())) continue;

			const dollars = dollarsForKind(kind, log);
			const targetKey = log.target_id ? `${kind}:${log.target_id}` : "";

			if (inRange(when, yearAgo.start, yearAgo.end)) {
				if (dollars > 0 && targetKey && !priorYearSeen.has(targetKey)) {
					priorYearAmount += dollars;
					priorYearSeen.add(targetKey);
				}
			}

			if (when >= quarters.currentStart) {
				quarterNow[kind] += 1;
			} else if (inRange(when, quarters.priorStart, quarters.priorEnd)) {
				quarterPrior[kind] += 1;
			}

			if (when < start) continue;

			if (kind === "renewal") licensesRenewedOnTime += 1;
			else if (kind === "flag") complianceFlagsCaught += 1;
			else auditGapsClosed += 1;

			impactEventDates.push(at);
			const countedTowardTotal = Boolean(
				dollars > 0 && targetKey && !seenTargets.has(targetKey),
			);
			if (countedTowardTotal) {
				primaryAmount += dollars;
				seenTargets.add(targetKey);
			}
			const contract = log.target_id
				? contractById.get(log.target_id)
				: undefined;
			const license = log.target_id
				? licenseById.get(log.target_id)
				: undefined;
			events.push(
				buildRiskImpactEvent({
					id: `${log.event_id || "evt"}:${log.target_id || "none"}:${at}`,
					date: at,
					kind,
					recordName: resolveRecordName(kind, log, contract, license),
					recordId: log.target_id,
					dollars,
					source: resolveEventSource(kind, log),
					countedTowardTotal,
				}),
			);
			if (recentWins.length < 5) {
				recentWins.push({
					label: winLabel(kind, log),
					amount: dollars > 0 ? dollars : undefined,
					at,
				});
			}
		}
	}

	const secondaryAmount = canViewContracts
		? computePortfolioProtected(contracts)
		: 0;

	const grantsMonitored = canViewContracts
		? contracts.filter((c) => isGrantContract(c)).length
		: 0;
	const contractsMonitored = canViewContracts ? contracts.length : 0;

	const openRisk = canViewContracts
		? {
				highRisk: contracts.filter(
					(c) => isHighRisk(c) && !isExpiredContract(c),
				).length,
				expiring90: contracts.filter((c) => isExpiringWithin90(c.contractExpiryDate))
					.length,
				expired: contracts.filter((c) => isExpiredContract(c)).length,
			}
		: { highRisk: 0, expiring90: 0, expired: 0 };

	const counts = {
		complianceFlagsCaught: canViewAudit ? complianceFlagsCaught : 0,
		auditGapsClosed: canViewAudit ? auditGapsClosed : 0,
		licensesRenewedOnTime: canViewLicenses ? licensesRenewedOnTime : 0,
	};

	const countTrends = {
		complianceFlagsCaught: buildTrend(
			quarterNow.flag,
			quarterPrior.flag,
			quarters.vsLabel,
		),
		auditGapsClosed: buildTrend(
			quarterNow.gap,
			quarterPrior.gap,
			quarters.vsLabel,
		),
		licensesRenewedOnTime: buildTrend(
			quarterNow.renewal,
			quarterPrior.renewal,
			quarters.vsLabel,
		),
	};

	const yoyTrend = canViewAudit
		? buildTrend(primaryAmount, priorYearAmount, yearAgo.vsLabel)
		: null;

	const monitoring = {
		contractsMonitored,
		grantsMonitored,
		clausesFlagged: canViewAudit ? complianceFlagsCaught : 0,
	};

	const sparkline = buildSparkline(
		period,
		start,
		mergeTrackingEventDates(impactEventDates, start),
	);
	const liveSparkline = buildSparkline(period, start, impactEventDates);
	const primaryFormatted = formatUsd(primaryAmount);
	const secondaryFormatted = formatUsd(secondaryAmount);

	return {
		period,
		periodLabel: periodLabel(period),
		currency: "USD",
		primary: {
			label: "Contract & grant risk averted",
			amount: Math.round(primaryAmount),
			amountFormatted: primaryFormatted,
		},
		secondary: {
			label: "Portfolio protected",
			amount: Math.round(secondaryAmount),
			amountFormatted: secondaryFormatted,
		},
		counts,
		countTrends,
		yoyTrend,
		openRisk,
		monitoring,
		sparkline,
		liveSparkline,
		trackingNote: buildTrackingNote({
			period,
			contractsMonitored,
			grantsMonitored,
			primaryAmount,
			hasContracts: canViewContracts,
		}),
		narrative: buildNarrative({
			period,
			primaryFormatted,
			secondaryFormatted,
			counts,
			hasAudit: canViewAudit,
			hasLicenses: canViewLicenses,
		}),
		recentWins: recentWins.slice(0, 5),
		events,
		computedAt: new Date().toISOString(),
		dataSources: {
			contracts: canViewContracts,
			licenses: canViewLicenses,
			auditLogs: canViewAudit,
		},
	};
}
