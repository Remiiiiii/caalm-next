import type {
	AuditReadinessSummary,
	AuditReadinessSeverity,
} from "@/lib/analytics/audit-readiness.types";
import type { ComplianceRagStatus } from "@/lib/audits/types";

export type AuditCadence = "weekly" | "monthly" | "quarterly";

export type AuditEvidenceAuditType = "hrsa_osv" | "cw_monitoring" | "financial_pbc";

export type AuditEvidenceSegment = "cfce_fqhc_cw";

export interface AuditEvidenceMapRow {
	$id?: string;
	segment: AuditEvidenceSegment;
	auditType: AuditEvidenceAuditType;
	requirementId: string;
	label: string;
	evidenceType: string;
	caalmModule: "contracts" | "licenses" | "documents" | "governance" | "site" | "other";
	inV1: boolean;
	notes?: string;
}

export interface SiteCrawlPageResult {
	url: string;
	status: number | null;
	title: string | null;
	metaDescription: string | null;
	h1: string | null;
	error?: string;
}

export interface SiteCrawlResult {
	websiteUrl: string;
	crawledAt: string;
	pages: SiteCrawlPageResult[];
	robotsTxtFound: boolean;
	sitemapFound: boolean;
	issues: string[];
	/** Informational only — not included in readiness score */
	healthHint: "ok" | "needs_attention" | "unavailable";
}

export interface AuditReadinessSnapshotRecord {
	$id: string;
	orgId: string;
	cadence: AuditCadence;
	score: number | null;
	ragStatus: ComplianceRagStatus | null;
	timezone: string;
	payload: string;
	aiSummary?: string;
	createdAt: string;
}

export interface AuditReadinessSnapshotPayload {
	summary: AuditReadinessSummary;
	siteCrawl: SiteCrawlResult | null;
	evidenceMapHits: Array<{
		requirementId: string;
		label: string;
		auditType: AuditEvidenceAuditType;
		caalmModule: string;
	}>;
	sourcesUsed: string[];
	previousScore: number | null;
	scoreDelta: number | null;
	disclaimer: string;
}

export interface OrgAuditSettings {
	timezone: string;
	websiteUrl: string | null;
}

export const READINESS_DISCLAIMER =
	"CAALM readiness is based on records in your CAALM organization. This is not a state, federal, funder, HRSA, DCF, or accreditation audit determination.";

export { DEFAULT_ORG_TIMEZONE } from "@/lib/timezone";

export type { AuditReadinessSeverity };
