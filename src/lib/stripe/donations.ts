import type { GiveShareAttribution } from "@/lib/give/attribution";
import { getStripe, isStripeConfigured } from "./client";

export const DONATION_CHECKOUT_PURPOSE = "donation";
export const DONATION_MIN_CENTS = 100;

export function isDonationStripeConfigured(): boolean {
	return isStripeConfigured();
}

export type DonationCheckoutInterval = "one_time" | "monthly";

export type DonationCheckoutMetadataInput = {
	orgId: string;
	campaignId?: string;
	designationId?: string;
	programLabel?: string;
	tributeType?: "honor" | "memory";
	tributeName?: string;
	interval?: DonationCheckoutInterval;
} & GiveShareAttribution;

export function buildDonationCheckoutMetadata(
	input: DonationCheckoutMetadataInput,
): Record<string, string> {
	const interval = input.interval ?? "one_time";
	return {
		purpose: DONATION_CHECKOUT_PURPOSE,
		orgId: input.orgId,
		campaignId: input.campaignId ?? "",
		designationId: input.designationId ?? "",
		programLabel: input.programLabel ?? "",
		donationInterval: interval,
		tributeType: input.tributeType ?? "",
		tributeName: input.tributeName ?? "",
		shareSource: input.shareSource ?? "",
		shareMedium: input.shareMedium ?? "",
		shareCampaign: input.shareCampaign ?? "",
	};
}

export async function createDonationCheckoutSession(input: {
	orgId: string;
	orgName: string;
	amountCents: number;
	campaignId?: string;
	designationId?: string;
	programLabel?: string;
	tributeType?: "honor" | "memory";
	tributeName?: string;
	interval?: DonationCheckoutInterval;
	shareSource?: string;
	shareMedium?: string;
	shareCampaign?: string;
	successUrl: string;
	cancelUrl: string;
}): Promise<{ url: string | null; sessionId: string }> {
	if (input.amountCents < DONATION_MIN_CENTS) {
		throw new Error("Minimum donation is $1.00");
	}
	const stripe = getStripe();
	const interval = input.interval ?? "one_time";
	const isMonthly = interval === "monthly";
	const metadata = buildDonationCheckoutMetadata({
		orgId: input.orgId,
		campaignId: input.campaignId,
		designationId: input.designationId,
		programLabel: input.programLabel,
		tributeType: input.tributeType,
		tributeName: input.tributeName,
		interval,
		shareSource: input.shareSource,
		shareMedium: input.shareMedium,
		shareCampaign: input.shareCampaign,
	});

	const session = await stripe.checkout.sessions.create({
		mode: isMonthly ? "subscription" : "payment",
		success_url: input.successUrl,
		cancel_url: input.cancelUrl,
		line_items: [
			{
				quantity: 1,
				price_data: {
					currency: "usd",
					unit_amount: input.amountCents,
					...(isMonthly
						? { recurring: { interval: "month" as const } }
						: {}),
					product_data: {
						name: isMonthly
							? `Monthly donation to ${input.orgName}`
							: `Donation to ${input.orgName}`,
					},
				},
			},
		],
		metadata,
		...(isMonthly ? { subscription_data: { metadata } } : {}),
	});
	return { url: session.url, sessionId: session.id };
}
