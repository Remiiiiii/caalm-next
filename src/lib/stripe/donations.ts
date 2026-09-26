import { getStripe, isStripeConfigured } from "./client";

export const DONATION_CHECKOUT_PURPOSE = "donation";

export function isDonationStripeConfigured(): boolean {
	return isStripeConfigured();
}

export async function createDonationCheckoutSession(input: {
	orgId: string;
	orgName: string;
	amountCents: number;
	campaignId?: string;
	successUrl: string;
	cancelUrl: string;
}): Promise<{ url: string | null; sessionId: string }> {
	if (input.amountCents < 100) {
		throw new Error("Minimum donation is $1.00");
	}
	const stripe = getStripe();
	const session = await stripe.checkout.sessions.create({
		mode: "payment",
		success_url: input.successUrl,
		cancel_url: input.cancelUrl,
		line_items: [
			{
				quantity: 1,
				price_data: {
					currency: "usd",
					unit_amount: input.amountCents,
					product_data: {
						name: `Donation to ${input.orgName}`,
					},
				},
			},
		],
		metadata: {
			purpose: DONATION_CHECKOUT_PURPOSE,
			orgId: input.orgId,
			campaignId: input.campaignId ?? "",
		},
	});
	return { url: session.url, sessionId: session.id };
}
