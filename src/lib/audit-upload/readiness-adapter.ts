import { buildOrgReadinessSummary } from "@/lib/audits/readiness/build-summary";
import { listEvidenceMap } from "@/lib/audits/readiness/evidence-map.service";
import { matchSampleReadinessSnapshot } from "./fixtures/readiness-snapshots";
import type { ReadinessItem } from "./types";

function mapLiveStatus(status: string | undefined): ReadinessItem["status"] {
	if (status === "covered" || status === "ready") return "ready";
	if (status === "gap" || status === "in_progress") return status;
	return "unknown";
}

export async function loadReadinessItems(
	orgId: string,
	hints?: {
		fileName?: string | null;
		auditType?: string | null;
		frameworks?: string[];
		auditorName?: string | null;
		reportNumber?: string | null;
	},
): Promise<ReadinessItem[]> {
	const sample = matchSampleReadinessSnapshot(hints ?? {});
	try {
		const [map, built] = await Promise.all([
			listEvidenceMap("cfce_fqhc_cw", true),
			buildOrgReadinessSummary({ orgId }),
		]);
		const hitById = new Map(
			built.payloadBase.evidenceMapHits.map((hit) => [hit.requirementId, hit]),
		);
		const live: ReadinessItem[] =
			map.length > 0
				? map.map((row) => ({
						requirementId: row.requirementId,
						label: row.label,
						status: mapLiveStatus(hitById.get(row.requirementId)?.status),
						evidenceType: row.evidenceType,
						notes: row.notes,
					}))
				: built.payloadBase.evidenceMapHits.map((hit) => ({
						requirementId: hit.requirementId,
						label: hit.label,
						status: mapLiveStatus(hit.status),
					}));
		if (sample.length === 0) return live;
		const liveIds = new Set(live.map((item) => item.requirementId));
		return [...live, ...sample.filter((item) => !liveIds.has(item.requirementId))];
	} catch (error) {
		console.warn("[SERVER] loadReadinessItems:", error);
		return sample;
	}
}
