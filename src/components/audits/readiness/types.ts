import type { ReadinessAssistantStructured } from "@/lib/audits/readiness/summary-tiles";

export type Rag = "green" | "amber" | "red";

export interface RagThresholds {
	green: number;
	amber: number;
}

export interface ReadinessInsight {
	id: string;
	title: string;
	description: string;
	severity: "critical" | "moderate" | "low";
	moduleLink: string;
	moduleLabel: string;
	itemTitle?: string;
	itemKind?: string;
	category?: string;
	owner?: string;
	assignedManagers?: string[];
	assignedBy?: string;
	dueDate?: string;
	requirementTags?: string[];
	isEvidenceGap?: boolean;
}

export interface ReadinessDomain {
	label: string;
	readinessPercent: number;
	ragStatus: string;
	atRiskCount: number;
	evidenceCount?: number;
	modulePath?: string;
}

export interface ReadinessHistoryRow {
	id: string;
	cadence: string;
	score: number | null;
	ragStatus: Rag | null;
	createdAt: string;
	scoreDelta: number | null;
	source: "manual" | "scheduled" | null;
}

export interface ReadinessEvidenceHit {
	requirementId: string;
	label: string;
	auditType: string;
	caalmModule: string;
	status?: "covered" | "gap";
	matchedRecords?: Array<{
		id: string;
		title: string;
		href: string;
		status: string;
	}>;
}

export interface ReadinessResponse {
	success: boolean;
	data: {
		summary: {
			lastUpdated: string;
			readinessScore: number | null;
			ragStatus: Rag;
			kpis: {
				totalContracts: number;
				licensesAtRisk: number;
				expiringSoon: number;
				evidenceGaps: number;
			};
			severity: { critical: number; moderate: number; low: number };
			domains: ReadinessDomain[];
			insights: ReadinessInsight[];
			complianceSnapshot?: {
				contracts: { total: number; expiringSoon: number } | null;
				licenses: {
					total: number;
					expiringSoon: number;
					atRisk: number;
					expired?: number;
					complianceBuckets: Record<string, number>;
				} | null;
			};
		};
		sourcesUsed: string[];
		disclaimer: string;
		ragThresholds?: RagThresholds;
		/** Set when the page is showing a saved snapshot instead of live data. */
		viewing?: {
			snapshotId: string;
			createdAt: string;
			aiSummary: string;
			cadence: string;
		} | null;
		nextRun?: { at: string; cadences: string[] } | null;
		/** Whether the viewer may reassign a contract / license (same gate as /contracts). */
		canAssignOwners?: { contract: boolean; license: boolean };
		evidenceMapHits: ReadinessEvidenceHit[];
		siteCrawl: {
			websiteUrl: string;
			crawledAt: string;
			healthHint: string;
			issues: string[];
			pages: Array<{
				url: string;
				status: number | null;
				title: string | null;
			}>;
			robotsTxtFound: boolean;
			sitemapFound: boolean;
			/** Absent until screenshot capture is wired up server-side. */
			screenshot?: { src: string; capturedAt: string } | null;
		} | null;
		org: {
			id: string;
			name: string;
			timezone: string;
			websiteUrl: string | null;
		};
		latestSnapshot: {
			id: string;
			cadence: string;
			score: number | null;
			ragStatus?: Rag | null;
			aiSummary?: string;
			createdAt: string;
		} | null;
		/** Last saved snapshot, already laid out for the assistant sheet. */
		assistant?: {
			snapshotId: string;
			createdAt: string;
			summary: string;
			structured: ReadinessAssistantStructured;
		} | null;
		history: ReadinessHistoryRow[];
	};
}
