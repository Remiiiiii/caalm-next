import type Stripe from "stripe";
import {
	createConstituent,
	findDuplicateConstituents,
} from "@/lib/constituents/repository";
import { parseGiveShareAttribution } from "@/lib/give/attribution";
import { resolveCampaignIdFromShareTag } from "@/lib/give/resolve-campaign";
import {
	createDraftGift,
	findGiftByStripeInvoiceId,
	postGift,
} from "@/lib/gifts/repository";
import { getStripe } from "./client";
import { DONATION_CHECKOUT_PURPOSE } from "./donations";
import { subscriptionIdFromInvoice } from "./invoice-utils";
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

export function donationShareFromMetadata(
	meta?: Record<string, string> | null,
) {
	return parseGiveShareAttribution(meta ?? {});
}

/** First invoice is already posted from checkout.session.completed. */
export function shouldSkipDonationCreateInvoice(billingReason?: string | null) {
	return billingReason === "subscription_create";
}

function optionalMeta(value?: string | null): string | undefined {
	const trimmed = value?.trim();
	return trimmed || undefined;
}

async function resolveDonationConstituent(input: {
	orgId: string;
	email?: string;
	name: string;
}): Promise<string> {
	const [firstName, ...rest] = input.name.split(/\s+/);
	const lastName = rest.join(" ") || "Donor";
	const matches = input.email
		? await findDuplicateConstituents({
				orgId: input.orgId,
				firstName: firstName || "Online",
				lastName,
				email: input.email,
			})
		: [];
	if (input.email && matches.length === 1) {
		return matches[0]!.$id;
	}
	if (input.email && matches.length > 1) {
		throw new Error("Ambiguous donor match for donation webhook");
	}
	const created = await createConstituent({
		orgId: input.orgId,
		type: "donor",
		firstName: firstName || "Online",
		lastName,
		email: input.email,
	});
	return created.$id;
}

export async function createPostedDonationGiftFromStripe(input: {
	orgId: string;
	amountCents: number;
	email?: string;
	name: string;
	designationId?: string;
	campaignId?: string;
	shareSource?: string;
	shareMedium?: string;
	shareCampaign?: string;
	stripeInvoiceId?: string;
}): Promise<{ created: boolean; skipped?: boolean }> {
	if (input.amountCents <= 0) return { created: false, skipped: true };
	if (input.stripeInvoiceId) {
		const existing = await findGiftByStripeInvoiceId(
			input.orgId,
			input.stripeInvoiceId,
		);
		if (existing) return { created: false, skipped: true };
	}

	const shareCampaign = optionalMeta(input.shareCampaign);
	const campaignId =
		optionalMeta(input.campaignId) ||
		(await resolveCampaignIdFromShareTag(input.orgId, shareCampaign));

	const constituentId = await resolveDonationConstituent({
		orgId: input.orgId,
		email: input.email,
		name: input.name,
	});

	const draft = await createDraftGift({
		orgId: input.orgId,
		amount: input.amountCents / 100,
		currency: "USD",
		giftDate: new Date().toISOString().slice(0, 10),
		method: "card",
		constituentId,
		campaignId,
		designationId: optionalMeta(input.designationId),
		anonymous: !input.email,
		shareSource: optionalMeta(input.shareSource),
		shareMedium: optionalMeta(input.shareMedium),
		shareCampaign,
		stripeInvoiceId: optionalMeta(input.stripeInvoiceId),
	});
	await postGift(draft.$id, input.orgId);
	return { created: true };
}

async function handleCheckoutSessionCompleted(
	session: Stripe.Checkout.Session,
): Promise<void> {
	if (session.mode !== "payment" && session.mode !== "subscription") return;
	if (session.metadata?.purpose !== DONATION_CHECKOUT_PURPOSE) return;

	const orgId = session.metadata?.orgId;
	if (!orgId) return;

	const amountCents = session.amount_total ?? 0;
	const email =
		session.customer_details?.email?.trim() ||
		session.customer_email?.trim() ||
		undefined;
	const name = session.customer_details?.name?.trim() || "Online Donor";
	const share = donationShareFromMetadata(session.metadata);
	const invoiceId =
		typeof session.invoice === "string"
			? session.invoice
			: session.invoice && typeof session.invoice === "object"
				? session.invoice.id
				: undefined;

	await createPostedDonationGiftFromStripe({
		orgId,
		amountCents,
		email,
		name,
		designationId: session.metadata?.designationId,
		campaignId: session.metadata?.campaignId,
		shareSource: share.shareSource,
		shareMedium: share.shareMedium,
		shareCampaign: share.shareCampaign,
		stripeInvoiceId: invoiceId,
	});
}

async function handleDonationInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
	if (shouldSkipDonationCreateInvoice(invoice.billing_reason)) return;

	const stripe = getStripe();
	const subscriptionId = subscriptionIdFromInvoice(invoice);
	if (!subscriptionId) return;

	const subscription = await stripe.subscriptions.retrieve(subscriptionId);
	const meta = subscription.metadata || {};
	if (meta.purpose !== DONATION_CHECKOUT_PURPOSE) return;

	const orgId = optionalMeta(meta.orgId);
	if (!orgId) return;

	const amountCents = invoice.amount_paid ?? 0;
	const invoiceContact = invoice as Stripe.Invoice & {
		customer_name?: string | null;
		customer_details?: { email?: string | null } | null;
	};
	const email =
		invoice.customer_email?.trim() ||
		invoiceContact.customer_details?.email?.trim() ||
		undefined;
	const name = invoiceContact.customer_name?.trim() || "Online Donor";
	const share = donationShareFromMetadata(meta);

	await createPostedDonationGiftFromStripe({
		orgId,
		amountCents,
		email,
		name,
		designationId: meta.designationId,
		campaignId: meta.campaignId,
		shareSource: share.shareSource,
		shareMedium: share.shareMedium,
		shareCampaign: share.shareCampaign,
		stripeInvoiceId: invoice.id,
	});
}

export async function handleDonationStripeWebhookEvent(
	event: Stripe.Event,
): Promise<{ processed: boolean; duplicate?: boolean }> {
	const claimed = await claimStripeEvent(event.id, "stripe-donation");
	if (!claimed) {
		return { processed: false, duplicate: true };
	}

	if (event.type === "checkout.session.completed") {
		await handleCheckoutSessionCompleted(
			event.data.object as Stripe.Checkout.Session,
		);
		return { processed: true };
	}

	if (event.type === "invoice.paid") {
		await handleDonationInvoicePaid(event.data.object as Stripe.Invoice);
		return { processed: true };
	}

	return { processed: true };
}
