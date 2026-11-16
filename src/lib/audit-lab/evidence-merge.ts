import type { EvidenceRequest, EvidenceStatus } from "./types";
import { normalizeEvidenceStatus } from "./types";

/** Regenerate merges new rows only; never overwrites an existing item's status. */
export function mergeEvidenceSeeds(
	existing: EvidenceRequest[],
	seeds: Array<{ title: string; controlRef?: string; department?: string }>,
): Array<Omit<EvidenceRequest, "$id">> {
	const titles = new Set(existing.map((row) => row.title.toLowerCase()));
	return seeds
		.filter((seed) => !titles.has(seed.title.toLowerCase()))
		.map((seed) => ({
			orgId: existing[0]?.orgId ?? "",
			sessionId: existing[0]?.sessionId ?? "",
			title: seed.title,
			controlRef: seed.controlRef,
			department: seed.department,
			status: "not_started" as EvidenceStatus,
		}));
}

export function canAcceptEvidence(item: EvidenceRequest): {
	ok: boolean;
	reason?: string;
} {
	if (
		item.ownerUserId &&
		item.assigneeUserId &&
		item.ownerUserId === item.assigneeUserId &&
		!item.managerUserId
	) {
		return {
			ok: false,
			reason:
				"Name a backup owner or have the department manager acknowledge the single-person risk before accepting.",
		};
	}
	return { ok: true };
}

export function parseStoredEvidenceStatus(raw: string): EvidenceStatus {
	return normalizeEvidenceStatus(raw);
}