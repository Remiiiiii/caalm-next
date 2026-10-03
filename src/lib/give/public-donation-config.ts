import type { DonationPageConfigPayload } from "@/lib/give/donation-page-config/types";

export type PublicDonationPageConfig = {
	amountsCents: number[];
	designations: string[];
	impactStatements: Record<string, string>;
	ein: string | null;
	legalText: string;
	frequencyOptions: DonationPageConfigPayload["frequencyOptions"];
};

export function toPublicDonationPageConfig(
	payload: DonationPageConfigPayload,
): PublicDonationPageConfig {
	return {
		amountsCents: payload.amountsCents,
		designations: payload.designations,
		impactStatements: payload.impactStatements,
		ein: payload.ein?.trim() || null,
		legalText: payload.legalText,
		frequencyOptions: payload.frequencyOptions,
	};
}

/** Impact line for the selected amount; falls back to lowest preset. */
export function resolvePublicImpactStatement(
	config: PublicDonationPageConfig,
	amountDollars: number,
): string {
	const cents =
		Number.isFinite(amountDollars) && amountDollars > 0
			? Math.round(amountDollars * 100)
			: config.amountsCents[0];
	const direct = config.impactStatements[String(cents)];
	if (direct?.trim()) return direct.trim();
	const lowest = config.amountsCents[0];
	const fallback = config.impactStatements[String(lowest)];
	if (fallback?.trim()) return fallback.trim();
	return "supports programs that serve families in our community.";
}

export function buildConfigDesignationOptions(
	designations: string[],
): { value: string; label: string }[] {
	return designations.map((label, index) => ({
		value: `donation-config:${index}`,
		label,
	}));
}
