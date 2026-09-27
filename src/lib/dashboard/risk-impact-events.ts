import type {
	RiskImpactEvent,
	RiskImpactEventKind,
	RiskImpactSnapshot,
	RiskImpactTrend,
} from "@/lib/dashboard/risk-impact.types";
import { formatYoyBadge } from "@/lib/dashboard/risk-impact-trends";

export interface ImpactLogLike {
	event_id?: string;
	event_title?: string;
	action?: string;
	status?: string;
	module?: string;
	target_id?: string;
	target_label?: string;
	summary?: string;
	created_at?: string;
	changes?: Array<{ field: string; before?: unknown; after?: unknown }>;
}

export interface NamedRecord {
	$id: string;
	contractName?: string;
	licenseName?: string;
	name?: string;
	title?: string;
}

const AT_RISK_VALUES = new Set([
	"action-required",
	"at-risk",
	"at_risk",
	"non-compliant",
	"non_compliant",
]);

export const HEALTHY_VALUES = new Set([
	"compliant",
	"up-to-date",
	"active",
	"renewed",
]);

const AUDIT_MODULES = new Set(["contracts", "licenses", "regulatory"]);

export const KIND_LABELS: Record<RiskImpactEventKind, string> = {
	flag: "Flag",
	gap: "Gap",
	renewal: "Renewal",
};

export function formatRiskUsdExact(amount: number): string {
	if (!Number.isFinite(amount) || amount <= 0) return "$0";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(amount);
}

export function hrefForEventKind(kind: RiskImpactEventKind): string {
	return kind === "renewal" ? "/licenses" : "/contracts";
}

function changeField(
	log: ImpactLogLike,
	field: string,
): { before?: string; after?: string } | null {
	const changes = log.changes || [];
	const hit = changes.find(
		(change) => change.field.toLowerCase() === field.toLowerCase(),
	);
	if (!hit) return null;
	return {
		before: hit.before != null ? String(hit.before).toLowerCase() : undefined,
		after: hit.after != null ? String(hit.after).toLowerCase() : undefined,
	};
}

export function isFlagCaught(log: ImpactLogLike): boolean {
	if (!log.module || !AUDIT_MODULES.has(log.module)) return false;
	for (const field of ["compliance", "status"]) {
		const change = changeField(log, field);
		if (change?.after && AT_RISK_VALUES.has(change.after)) return true;
	}
	const title = (log.event_title || "").toLowerCase();
	return (
		title.includes("action-required") ||
		title.includes("at-risk") ||
		title.includes("non-compliant") ||
		title.includes("compliance flag")
	);
}

export function isGapClosed(log: ImpactLogLike): boolean {
	if (!log.module || !AUDIT_MODULES.has(log.module)) return false;
	for (const field of ["compliance", "status"]) {
		const change = changeField(log, field);
		if (
			change?.before &&
			AT_RISK_VALUES.has(change.before) &&
			change.after &&
			HEALTHY_VALUES.has(change.after)
		) {
			return true;
		}
	}
	if (
		log.module === "regulatory" &&
		log.status === "success" &&
		log.action === "update"
	) {
		return true;
	}
	const title = (log.event_title || "").toLowerCase();
	return (
		title.includes("gap closed") ||
		title.includes("compliance restored") ||
		(title.includes("compliant") && title.includes("updated"))
	);
}

export function isLicenseRenewal(log: ImpactLogLike): boolean {
	if (log.module !== "licenses") return false;
	const title = (log.event_title || "").toLowerCase();
	const id = (log.event_id || "").toLowerCase();
	return (
		id.startsWith("license_renew_") ||
		title.includes("license renewed") ||
		title.includes("renewed license")
	);
}

/** Classify an audit row into a dollar-building event, or skip it. */
export function classifyImpactLog(
	log: ImpactLogLike,
	canViewLicenses: boolean,
): RiskImpactEventKind | null {
	if (canViewLicenses && isLicenseRenewal(log)) return "renewal";
	if (isFlagCaught(log)) return "flag";
	if (isGapClosed(log)) return "gap";
	return null;
}

export function resolveRecordName(
	kind: RiskImpactEventKind,
	log: ImpactLogLike,
	contract?: NamedRecord,
	license?: NamedRecord,
): string {
	if (log.target_label?.trim()) return log.target_label.trim();
	const contractName = contract?.contractName || contract?.name;
	if (contractName?.trim()) return contractName.trim();
	const licenseName = license?.licenseName || license?.name || license?.title;
	if (licenseName?.trim()) return licenseName.trim();
	if (log.summary?.trim()) return log.summary.trim();
	if (log.event_title?.trim()) return log.event_title.trim();
	if (kind === "renewal") return "License renewed on time";
	if (kind === "flag") return "Compliance flag caught";
	return "Audit gap closed";
}

export function resolveEventSource(
	kind: RiskImpactEventKind,
	log: ImpactLogLike,
): string {
	if (kind === "renewal") return "License renewal";
	if (log.module === "regulatory") return "Regulatory audit";
	if (log.module === "licenses") return "License audit";
	if (log.module === "contracts") return "Contract audit";
	return "Audit log";
}

export function buildRiskImpactEvent(input: {
	id: string;
	date: string;
	kind: RiskImpactEventKind;
	recordName: string;
	recordId?: string;
	dollars: number;
	source: string;
	countedTowardTotal: boolean;
}): RiskImpactEvent {
	const countedDollars = input.countedTowardTotal ? input.dollars : 0;
	return {
		id: input.id,
		date: input.date,
		kind: input.kind,
		recordName: input.recordName,
		recordId: input.recordId,
		href: hrefForEventKind(input.kind),
		dollars: countedDollars,
		dollarsFormatted: formatRiskUsdExact(countedDollars),
		source: input.source,
		countedTowardTotal: input.countedTowardTotal,
	};
}

export function sumCountedEventDollars(events: RiskImpactEvent[]): number {
	return events.reduce(
		(sum, event) =>
			event.countedTowardTotal ? sum + (event.dollars || 0) : sum,
		0,
	);
}

/**
 * Honest YoY copy. Never invents a percent when there is no prior-year window.
 * `new` / missing / zero-prior windows stay unlabeled as a percent.
 */
export function honestYoyLabel(trend: RiskImpactTrend | null): string {
	if (!trend) return "Prior-year comparison unavailable";
	if (trend.direction === "new" || trend.prior === 0) {
		return `No prior-year dollars versus ${trend.vsLabel}`;
	}
	if (trend.direction === "flat" && trend.current === 0 && trend.prior === 0) {
		return "No year-over-year change to report";
	}
	return formatYoyBadge(trend);
}

export interface RiskAvertedPdfPayload {
	orgName: string;
	generatedAt: string;
	periodLabel: string;
	period: string;
	primaryFormatted: string;
	primaryAmount: number;
	yoyLabel: string;
	narrative: string;
	counts: RiskImpactSnapshot["counts"];
	countTrends: RiskImpactSnapshot["countTrends"];
	openRisk: RiskImpactSnapshot["openRisk"];
	monitoring: RiskImpactSnapshot["monitoring"];
	events: RiskImpactEvent[];
	eventCount: number;
	countedEventCount: number;
	countedDollarsFormatted: string;
	dataSources: RiskImpactSnapshot["dataSources"];
}

export function buildRiskAvertedPdfPayload(input: {
	orgName: string;
	generatedAt: string;
	snapshot: RiskImpactSnapshot;
}): RiskAvertedPdfPayload {
	const { snapshot } = input;
	const events = snapshot.events ?? [];
	const counted = events.filter((event) => event.countedTowardTotal);
	return {
		orgName: input.orgName,
		generatedAt: input.generatedAt,
		periodLabel: snapshot.periodLabel,
		period: snapshot.period,
		primaryFormatted: snapshot.primary.amountFormatted,
		primaryAmount: snapshot.primary.amount,
		yoyLabel: honestYoyLabel(snapshot.yoyTrend),
		narrative: snapshot.narrative,
		counts: snapshot.counts,
		countTrends: snapshot.countTrends,
		openRisk: snapshot.openRisk,
		monitoring: snapshot.monitoring,
		events,
		eventCount: events.length,
		countedEventCount: counted.length,
		countedDollarsFormatted: formatRiskUsdExact(
			sumCountedEventDollars(events),
		),
		dataSources: snapshot.dataSources,
	};
}
