import type Stripe from "stripe";
import {
	clearOrgSubscription,
	markOrgPastDue,
	syncSubscriptionToOrg,
} from "./billing";
import { getStripe } from "./client";
import { claimStripeEvent } from "./webhook-idempotency";

export function constructWebhookEvent(
	payload: string | Buffer,
	signature: string,
): Stripe.Event {
	const stripe = getStripe();
	const secret = process.env.STRIPE_WEBHOOK_SECRET;
	if (!secret) {
		throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
	}
	return stripe.webhooks.constructEvent(payload, signature, secret);
}

async function orgIdFromInvoice(
	invoice: Stripe.Invoice,
): Promise<string | undefined> {
	const customerId =
		typeof invoice.customer === "string"
			? invoice.customer
			: invoice.customer?.id;
	const metaOrg =
		invoice.metadata?.orgId ||
		(invoice as { subscription_details?: { metadata?: { orgId?: string } } })
			.subscription_details?.metadata?.orgId;
	if (metaOrg) return metaOrg;

	if (!customerId) return undefined;
	const { listOrganizations } = await import("@/lib/rbac/organizations");
	const orgs = await listOrganizations();
	return orgs.find((o) => o.stripeCustomerId === customerId)?.$id;
}

export async function handleStripeWebhookEvent(
	event: Stripe.Event,
): Promise<{ processed: boolean; duplicate?: boolean }> {
	const claimed = await claimStripeEvent(event.id);
	if (!claimed) {
		return { processed: false, duplicate: true };
	}

	switch (event.type) {
		case "checkout.session.completed": {
			const session = event.data.object as Stripe.Checkout.Session;
			if (session.mode !== "subscription" || !session.subscription) break;

			const stripe = getStripe();
			const subscriptionId =
				typeof session.subscription === "string"
					? session.subscription
					: session.subscription.id;
			const subscription = await stripe.subscriptions.retrieve(subscriptionId);
			const orgId =
				session.metadata?.orgId || session.client_reference_id || undefined;
			await syncSubscriptionToOrg(subscription, orgId || undefined);
			break;
		}
		case "customer.subscription.updated": {
			const subscription = event.data.object as Stripe.Subscription;
			await syncSubscriptionToOrg(subscription);
			break;
		}
		case "customer.subscription.deleted": {
			const subscription = event.data.object as Stripe.Subscription;
			const orgId = subscription.metadata?.orgId;
			if (orgId) {
				await clearOrgSubscription(orgId);
			} else {
				await syncSubscriptionToOrg(subscription);
			}
			break;
		}
		case "invoice.paid":
		case "invoice.finalized": {
			const invoice = event.data.object as Stripe.Invoice;
			const subscriptionId =
				typeof (invoice as { subscription?: string | { id: string } })
					.subscription === "string"
					? ((invoice as { subscription?: string }).subscription as string)
					: (invoice as { subscription?: { id: string } }).subscription?.id;
			if (!subscriptionId) break;
			const stripe = getStripe();
			const subscription = await stripe.subscriptions.retrieve(subscriptionId);
			await syncSubscriptionToOrg(subscription);
			break;
		}
		case "invoice.payment_failed": {
			const invoice = event.data.object as Stripe.Invoice;
			const orgId = await orgIdFromInvoice(invoice);
			if (orgId) {
				await markOrgPastDue(orgId);
			}
			const subscriptionId =
				typeof (invoice as { subscription?: string | { id: string } })
					.subscription === "string"
					? ((invoice as { subscription?: string }).subscription as string)
					: (invoice as { subscription?: { id: string } }).subscription?.id;
			if (subscriptionId) {
				const stripe = getStripe();
				const subscription =
					await stripe.subscriptions.retrieve(subscriptionId);
				await syncSubscriptionToOrg(subscription);
			}
			break;
		}
		default:
			break;
	}

	return { processed: true };
}
