/** Structured payload for the public donation page (amounts stored in cents). */

export type DonationFrequencyOption = "one_time" | "monthly";

export type DonationPageConfigPayload = {
	amountsCents: number[];
	designations: string[];
	/** Keys are amount cents as decimal strings, e.g. "2500". */
	impactStatements: Record<string, string>;
	ein: string;
	legalText: string;
	frequencyOptions: DonationFrequencyOption[];
	/**
	 * Current Stripe Price id per suggested amount (monthly recurring checkout).
	 * Keys are amount cents as strings.
	 */
	stripePriceByAmountCents: Record<string, string>;
};

export type DonationPageConfigDraft = {
	orgId: string;
	payload: DonationPageConfigPayload;
	/** Optimistic concurrency token; incremented on each successful draft write. */
	version: number;
	updatedAt: string;
};

export type DonationPageConfigPublished = {
	orgId: string;
	payload: DonationPageConfigPayload;
	/** Matches the version history row marked live. */
	liveVersionNumber: number;
	publishedAt: string;
	publishedByUserId: string;
};

export type DonationPageConfigVersion = {
	orgId: string;
	versionNumber: number;
	snapshot: DonationPageConfigPayload;
	publishedByUserId: string;
	publishedByName: string;
	publishedAt: string;
	changeSummary?: string;
	isLive: boolean;
};

/** Historical Stripe Price ids superseded when amounts change (reporting / subscriptions). */
export type DonationStripePriceReplacement = {
	orgId: string;
	amountCents: number;
	stripePriceId: string;
	replacedByPriceId: string;
	replacedAt: string;
};

export type DonationPageConfigActor = {
	userId: string;
	userName: string;
	userEmail: string;
};

export const DEFAULT_DONATION_PAGE_CONFIG = (): DonationPageConfigPayload => ({
	amountsCents: [2500, 5000, 10000, 25000],
	designations: [
		"Where it's needed most",
		"Literacy & tutoring program",
		"Behavioral health services",
	],
	impactStatements: {
		"2500":
			"provides a full week of after-school tutoring materials for one student.",
	},
	ein: "",
	legalText:
		"Your gift may be tax-deductible to the extent allowed by law. No goods or services were provided in exchange for this contribution.",
	frequencyOptions: ["one_time", "monthly"],
	stripePriceByAmountCents: {},
});
