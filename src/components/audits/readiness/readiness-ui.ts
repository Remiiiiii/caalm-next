import type { Rag } from "./types";

/** Used only when the API does not send thresholds (older deployments). */
export const FALLBACK_RAG_THRESHOLDS = { green: 85, amber: 70 } as const;

export const RAG_LABEL: Record<Rag, string> = {
	green: "Green",
	amber: "Amber",
	red: "Red",
};

export const PILL = "inline-block px-2 py-0.5 text-xs rounded-full border";
export const RECT_BADGE =
	"inline-flex min-w-7 justify-center rounded-md border px-2 py-0.5 text-xs font-bold";

export const RAG_PILL: Record<Rag, string> = {
	green: "bg-green/10 text-green border-green/20",
	amber: "bg-orange/10 text-orange border-orange/20",
	red: "bg-red/10 text-red border-red/20",
};

export const RAG_BG: Record<Rag, string> = {
	green: "bg-green",
	amber: "bg-orange",
	red: "bg-red",
};

export const NEUTRAL_PILL = "bg-slate-100 text-slate-600 border-slate-200";

export const SEVERITY_PILL: Record<string, string> = {
	critical: RAG_PILL.red,
	moderate: RAG_PILL.amber,
	low: NEUTRAL_PILL,
};

export const SEVERITY_LABEL: Record<string, string> = {
	critical: "Critical",
	moderate: "Moderate",
	low: "Low",
};

export const REQUIREMENT_LABELS: Record<string, string> = {
	hrsa_osv: "HRSA OSV",
	cw_monitoring: "CW monitoring",
	financial_pbc: "Financial PBC",
};

export const MODULE_LABELS: Record<string, string> = {
	contracts: "Contracts",
	licenses: "Licenses",
	documents: "Documents",
	governance: "Governance",
	site: "Public site",
	other: "Other",
};

export const GLOSSARY: Record<string, string> = {
	RAG: "Red / Amber / Green: a traffic-light status for a readiness score.",
	"HRSA OSV":
		"HRSA Operational Site Visit: federal review of health center operations.",
	CFCE: "The CAALM segment covering FQHC and child-welfare evidence.",
	PBC: "Prepared by client: the evidence list an auditor asks your team to prepare.",
	"CW monitoring":
		"Child-welfare monitoring: state or lead-agency review of provider contracts and licenses.",
};

export const RAG_STATUS_COPY: Record<string, string> = {
	ok: "Looks healthy",
	needs_attention: "Needs attention",
	unavailable: "Unavailable",
};

export { isReadinessDomainScored } from "@/lib/audits/readiness/score";

/** Live readiness scores are percents (0–100). Leave blanks as N/A. */
export function formatReadinessPercent(
	value: number | null | undefined,
): string {
	if (value === null || value === undefined || Number.isNaN(value)) {
		return "N/A";
	}
	return `${value}%`;
}

export function ragFor(
	score: number | null | undefined,
	thresholds: { green: number; amber: number },
): Rag | null {
	if (score === null || score === undefined || Number.isNaN(score)) return null;
	if (score >= thresholds.green) return "green";
	if (score >= thresholds.amber) return "amber";
	return "red";
}

export function formatDay(iso?: string | null): string {
	if (!iso) return "—";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC",
	});
}

export const plural = (n: number, word: string) =>
	`${n} ${word}${n === 1 ? "" : "s"}`;
