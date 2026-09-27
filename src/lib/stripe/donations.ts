import { getStripe, isStripeConfigured } from "./client";

export const DONATION_CHECKOUT_PURPOSE = "donation";
export const DONATION_MIN_CENTS = 100;

export function isDonationStripeConfigured(): boolean {
	return isStripeConfigured();
}

export async function createDonationCheckoutSession(input: {
	orgId: string;
	orgName: string;
	amountCents: number;
	campaignId?: string;
	designationId?: string;
	successUrl: string;
	cancelUrl: string;
}): Promise<{ url: string | null; sessionId: string }> {
	if (input.amountCents < DONATION_MIN_CENTS) {
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
			designationId: input.designationId ?? "",
		},
	});
	return { url: session.url, sessionId: session.id };
}
