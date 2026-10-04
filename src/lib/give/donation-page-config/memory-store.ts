import type { DonationPageConfigStore } from "./store";
import type {
	DonationPageConfigDraft,
	DonationPageConfigPublished,
	DonationPageConfigVersion,
	DonationStripePriceReplacement,
} from "./types";

export function createMemoryDonationPageConfigStore(): DonationPageConfigStore {
	const drafts = new Map<string, DonationPageConfigDraft>();
	const published = new Map<string, DonationPageConfigPublished>();
	const versions = new Map<string, DonationPageConfigVersion[]>();
	const priceReplacements = new Map<string, DonationStripePriceReplacement[]>();

	return {
		async getDraft(orgId) {
			return drafts.get(orgId) ?? null;
		},
		async saveDraft(draft) {
			drafts.set(draft.orgId, { ...draft, payload: { ...draft.payload } });
		},
		async getPublished(orgId) {
			return published.get(orgId) ?? null;
		},
		async savePublished(row) {
			published.set(row.orgId, {
				...row,
				payload: { ...row.payload },
			});
		},
		async listVersions(orgId) {
			return [...(versions.get(orgId) ?? [])].sort(
				(a, b) => b.versionNumber - a.versionNumber,
			);
		},
		async appendVersion(version) {
			const list = versions.get(version.orgId) ?? [];
			list.push({ ...version, snapshot: { ...version.snapshot } });
			versions.set(version.orgId, list);
		},
		async markLiveVersion(orgId, versionNumber) {
			const list = versions.get(orgId) ?? [];
			for (const row of list) {
				row.isLive = row.versionNumber === versionNumber;
			}
		},
		async appendPriceReplacements(rows) {
			for (const row of rows) {
				const list = priceReplacements.get(row.orgId) ?? [];
				list.push({ ...row });
				priceReplacements.set(row.orgId, list);
			}
		},
		async listPriceReplacements(orgId) {
			return [...(priceReplacements.get(orgId) ?? [])];
		},
	};
}
