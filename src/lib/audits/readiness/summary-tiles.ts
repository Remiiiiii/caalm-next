import type {
	AuditReadinessDomain,
	AuditReadinessInsight,
} from "@/lib/analytics/audit-readiness.types";
import type { ComplianceRagStatus } from "@/lib/audits/types";

const RAG_LABEL: Record<ComplianceRagStatus, string> = {
	green: "Green",
	amber: "Amber",
	red: "Red",
};

export type ReadinessTileBadge = {
	label: string;
	rag: ComplianceRagStatus | null;
};

function plural(count: number, noun: string): string {
	return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function formatSourceList(sources: string[]): string {
	if (!sources.length) return "Contracts and Licenses";
	if (sources.length === 1) return sources[0];
	if (sources.length === 2) return `${sources[0]} and ${sources[1]}`;
	return `${sources.slice(0, -1).join(", ")}, and ${sources[sources.length - 1]}`;
}

/** Copy under the three score tiles in the readiness assistant. */
export function formatReadinessScopeLine(options: {
	sourcesUsed: string[];
	expiringSoon: number;
	upcomingDeadlines: number;
}): string {
	return [
		`Scope: ${formatSourceList(options.sourcesUsed)} only`,
		plural(options.expiringSoon, "expiring item"),
		plural(options.upcomingDeadlines, "upcoming deadline"),
	].join(" · ");
}

export function overallTileBadge(rag: ComplianceRagStatus): ReadinessTileBadge {
	return { label: RAG_LABEL[rag], rag };
}

/** Domain tile: "No risk" when healthy, otherwise "Gap · {severity}". */
export function domainTileBadge(
	domain: AuditReadinessDomain | undefined,
	insights: AuditReadinessInsight[],
): ReadinessTileBadge {
	if (!domain) return { label: "Not scored", rag: null };
	if (domain.atRiskCount === 0 && domain.ragStatus === "green") {
		return { label: "No risk", rag: "green" };
	}

	const related = insights.filter((insight) => {
		const link = insight.moduleLink ?? "";
		const path = domain.modulePath;
		if (path && (link === path || link.startsWith(`${path}/`))) return true;
		if (link.includes(`/${domain.domain}`) || link.includes(`tab=${domain.domain}`)) {
			return true;
		}
		if (domain.domain === "contracts") return insight.itemKind === "contract";
		if (domain.domain === "licenses") return insight.itemKind === "license";
		return false;
	});

	const fromInsights = related.some((insight) => insight.severity === "critical")
		? "critical"
		: related.some((insight) => insight.severity === "moderate")
			? "moderate"
			: related.length
				? "low"
				: null;

	const fallback =
		domain.ragStatus === "red"
			? "critical"
			: domain.ragStatus === "amber"
				? "moderate"
				: "low";

	return {
		label: `Gap · ${fromInsights ?? fallback}`,
		rag: domain.ragStatus,
	};
}

const CONTRACT_AFFECTS: Record<string, string> = {
	hrsa_osv: "HRSA written service agreements",
	cw_monitoring: "Child-welfare provider contracts",
	financial_pbc: "PBC grant / vendor contracts",
};

const LICENSE_AFFECTS: Record<string, string> = {
	hrsa_osv: "HRSA credentialing documentation",
	cw_monitoring: "Child-welfare facility licensing",
	financial_pbc: "PBC insurance evidence",
};

function parseDueDate(raw: string): Date | null {
	const dayOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (dayOnly) {
		return new Date(
			Number(dayOnly[1]),
			Number(dayOnly[2]) - 1,
			Number(dayOnly[3]),
		);
	}
	const date = new Date(raw);
	return Number.isNaN(date.getTime()) ? null : date;
}

function prettyDueDate(date: Date): string {
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

/** Pill on the priority-action card: "Due Sep 30, 2027". */
export function formatPriorityDueLabel(
	dueDate: string | null | undefined,
	description?: string,
): string | null {
	if (dueDate) {
		const date = parseDueDate(dueDate);
		if (date) return `Due ${prettyDueDate(date)}`;
	}
	if (!description) return null;
	const iso = description.match(/\d{4}-\d{2}-\d{2}/);
	if (iso) {
		const date = parseDueDate(iso[0]);
		if (date) return `Due ${prettyDueDate(date)}`;
	}
	const pretty = description.match(
		/due\s+([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/i,
	);
	return pretty ? `Due ${pretty[1]}` : null;
}

function humanizeStatus(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) return "Action required";
	if (/\s/.test(trimmed) && !/[-_]/.test(trimmed)) {
		return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
	}
	return trimmed
		.split(/[-_]/)
		.filter(Boolean)
		.map((word, index) =>
			index === 0
				? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
				: word.toLowerCase(),
		)
		.join(" ");
}

/** Body line under the title, e.g. "Action required. Update the contract documentation and milestones." */
export function formatPriorityInstruction(options: {
	category?: string;
	itemKind?: string;
	description?: string;
}): string {
	const raw =
		options.category?.trim() ||
		options.description?.split("·")[0]?.trim() ||
		"Action required";
	const status = humanizeStatus(raw);
	const kind = options.itemKind === "license" ? "license" : "contract";
	return `${status}. Update the ${kind} documentation and milestones.`;
}

/** Stacked "Affects" chips. Falls back to the module's in-V1 audit slices. */
export function formatPriorityAffects(
	tags: string[] | undefined,
	itemKind?: string,
): string[] {
	const map = itemKind === "license" ? LICENSE_AFFECTS : CONTRACT_AFFECTS;
	const keys = tags?.length ? tags : Object.keys(map);
	const labels: string[] = [];
	const seen = new Set<string>();
	for (const key of keys) {
		const label = map[key] ?? key.replace(/[_-]+/g, " ");
		if (seen.has(label)) continue;
		seen.add(label);
		labels.push(label);
	}
	return labels;
}

/** Short name in By Module: "Contracts & grants" → "Contracts". */
export function formatModuleHeadingName(label: string): string {
	if (label.toLowerCase().startsWith("contract")) return "Contracts";
	if (label.toLowerCase().startsWith("license")) return "Licenses";
	return label;
}

/** Body copy under each By Module row. */
export function formatModuleBlurb(options: {
	domain: string;
	atRiskCount: number;
	upcomingDeadlines?: number;
}): string {
	if (options.atRiskCount <= 0) {
		if (options.domain === "licenses") {
			return "No licenses at risk. Supports HRSA credentialing, child-welfare facility licensing, staff credentials and PBC insurance documentation.";
		}
		return "No contracts at risk.";
	}
	const items = plural(options.atRiskCount, "action-required item");
	const upcoming =
		options.upcomingDeadlines && options.upcomingDeadlines > 0
			? ` and ${plural(options.upcomingDeadlines, "upcoming deadline")}`
			: "";
	return `${items} (see above)${upcoming}.`;
}

export function formatSourceLine(sources: string[]): string {
	return `Source: ${formatSourceList(sources)} records`;
}

export function formatSiteHost(websiteUrl: string): string {
	try {
		const href = websiteUrl.startsWith("http")
			? websiteUrl
			: `https://${websiteUrl}`;
		return new URL(href).hostname.replace(/^www\./, "");
	} catch {
		return websiteUrl;
	}
}
