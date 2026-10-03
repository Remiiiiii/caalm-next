import { getStripe, isStripeConfigured } from "./client";
import type { DonationStripePricePort } from "@/lib/give/donation-page-config/stripe-prices";

/** Live Stripe adapter for monthly donation suggested amounts (creates Prices only). */
export function createLiveDonationStripePricePort(): DonationStripePricePort {
	return {
		async createRecurringDonationPrice(input) {
			if (!isStripeConfigured()) {
				throw new Error("Stripe is not configured");
			}
			const stripe = getStripe();
			const product = await stripe.products.create({
				name: `Monthly donation (${input.orgId})`,
				metadata: { orgId: input.orgId, purpose: "donation_recurring_amount" },
			});
			const price = await stripe.prices.create({
				currency: "usd",
				unit_amount: input.amountCents,
				recurring: { interval: "month" },
				product: product.id,
				metadata: {
					orgId: input.orgId,
					amountCents: String(input.amountCents),
				},
			});
			return { priceId: price.id };
		},
	};
}
