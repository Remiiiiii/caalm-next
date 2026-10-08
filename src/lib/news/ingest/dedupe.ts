import type { IngestItem } from "@/lib/news/ingest/types";

export type DedupeKey = {
	orgId: string;
	sourceFeedId: string;
	externalId: string;
};

export function ingestDedupeKey(parts: DedupeKey): string {
	return `${parts.orgId}::${parts.sourceFeedId}::${parts.externalId}`;
}

export function filterNewIngestItems(
	items: IngestItem[],
	existingKeys: Set<string>,
	orgId: string,
	sourceFeedId: string,
): IngestItem[] {
	const seen = new Set(existingKeys);
	const next: IngestItem[] = [];
	for (const item of items) {
		const key = ingestDedupeKey({
			orgId,
			sourceFeedId,
			externalId: item.externalId,
		});
		if (seen.has(key)) continue;
		seen.add(key);
		next.push(item);
	}
	return next;
}
