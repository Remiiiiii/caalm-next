import type Stripe from "stripe";
import {
	createConstituent,
	findDuplicateConstituents,
} from "@/lib/constituents/repository";
import { createDraftGift, postGift } from "@/lib/gifts/repository";
import { getStripe } from "./client";
import { DONATION_CHECKOUT_PURPOSE } from "./donations";
import { claimStripeEvent } from "./webhook-idempotency";

export function constructDonationWebhookEvent(
	payload: string | Buffer,
	signature: string,
): Stripe.Event {
	const stripe = getStripe();
	const secret = process.env.STRIPE_DONATION_WEBHOOK_SECRET;
	if (!secret) {
		throw new Error("STRIPE_DONATION_WEBHOOK_SECRET is not configured");
	}
	return stripe.webhooks.constructEvent(payload, signature, secret);
}

export async function handleDonationStripeWebhookEvent(
	event: Stripe.Event,
): Promise<{ processed: boolean; duplicate?: boolean }> {
	const claimed = await claimStripeEvent(event.id, "stripe-donation");
	if (!claimed) {
		return { processed: false, duplicate: true };
	}

	if (event.type !== "checkout.session.completed") {
		return { processed: true };
	}

	const session = event.data.object as Stripe.Checkout.Session;
	if (session.mode !== "payment") return { processed: true };
	if (session.metadata?.purpose !== DONATION_CHECKOUT_PURPOSE) {
		return { processed: true };
	}

	const orgId = session.metadata?.orgId;
	if (!orgId) return { processed: true };

	const amountCents = session.amount_total ?? 0;
	if (amountCents <= 0) return { processed: true };

	const email =
		session.customer_details?.email?.trim() ||
		session.customer_email?.trim() ||
		undefined;
	const name = session.customer_details?.name?.trim() || "Online Donor";
	const [firstName, ...rest] = name.split(/\s+/);
	const lastName = rest.join(" ") || "Donor";

	let constituentId: string;
	const matches = email
		? await findDuplicateConstituents({
				orgId,
				firstName,
				lastName,
				email,
			})
		: [];
	if (email && matches.length === 1) {
		constituentId = matches[0]!.$id;
	} else if (email && matches.length > 1) {
		throw new Error("Ambiguous donor match for donation webhook");
	} else {
		const created = await createConstituent({
			orgId,
			type: "donor",
			firstName: firstName || "Online",
			lastName,
			email,
		});
		constituentId = created.$id;
	}

	const giftDate = new Date().toISOString().slice(0, 10);
	const draft = await createDraftGift({
		orgId,
		amount: amountCents / 100,
		currency: "USD",
		giftDate,
		method: "card",
		constituentId,
		campaignId: session.metadata?.campaignId || undefined,
		anonymous: !email,
	});
	await postGift(draft.$id, orgId);

	return { processed: true };
}
