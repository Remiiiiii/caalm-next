import type {
	DonationPageConfigDraft,
	DonationPageConfigPublished,
	DonationPageConfigVersion,
	DonationStripePriceReplacement,
} from "./types";

export type DonationPageConfigStore = {
	getDraft(orgId: string): Promise<DonationPageConfigDraft | null>;
	saveDraft(draft: DonationPageConfigDraft): Promise<void>;

	getPublished(orgId: string): Promise<DonationPageConfigPublished | null>;
	savePublished(published: DonationPageConfigPublished): Promise<void>;

	listVersions(orgId: string): Promise<DonationPageConfigVersion[]>;
	appendVersion(version: DonationPageConfigVersion): Promise<void>;
	markLiveVersion(orgId: string, versionNumber: number): Promise<void>;

	appendPriceReplacements(
		rows: DonationStripePriceReplacement[],
	): Promise<void>;
	listPriceReplacements(orgId: string): Promise<DonationStripePriceReplacement[]>;
};
