import type Stripe from "stripe";
import {
	clearOrgSubscription,
	completePaymentMethodReplace,
	markOrgPastDue,
	syncCreditNoteToOrg,
	syncPaidInvoiceToOrg,
	syncQuoteAcceptedToOrg,
	syncSubscriptionToOrg,
} from "./billing";
import { getStripe } from "./client";
import { resolveOrgIdFromInvoice } from "./invoice-utils";
import { claimStripeEvent } from "./webhook-idempotency";
import { getOrganization } from "@/lib/rbac/organizations";

/**
 * Subscribe the endpoint to:
 * checkout.session.completed, customer.subscription.created|updated|deleted,
 * invoice.paid|finalized|payment_failed, credit_note.created, quote.accepted
 */

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
			const stripe = getStripe();

			if (session.mode === "setup" && session.setup_intent) {
				const replaceId = session.metadata?.replacePaymentMethodId;
				const orgId =
					session.metadata?.orgId || session.client_reference_id || undefined;
				if (replaceId && orgId) {
					const setupIntentId =
						typeof session.setup_intent === "string"
							? session.setup_intent
							: session.setup_intent.id;
					const setupIntent =
						await stripe.setupIntents.retrieve(setupIntentId);
					const newPaymentMethodId =
						typeof setupIntent.payment_method === "string"
							? setupIntent.payment_method
							: setupIntent.payment_method?.id;
					if (newPaymentMethodId) {
						const org = await getOrganization(orgId);
						if (org) {
							await completePaymentMethodReplace(
								org,
								replaceId,
								newPaymentMethodId,
							);
						}
					}
				}
				break;
			}

			if (session.mode !== "subscription" || !session.subscription) break;

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
		case "customer.subscription.created":
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
		case "invoice.paid": {
			const invoice = event.data.object as Stripe.Invoice;
			await syncPaidInvoiceToOrg(invoice);
			break;
		}
		case "invoice.finalized": {
			const invoice = event.data.object as Stripe.Invoice;
			// Unpaid Dashboard invoices must not grant access. Subscription
			// invoices still sync so we pick up `incomplete` / `trialing`.
			await syncPaidInvoiceToOrg(invoice);
			break;
		}
		case "invoice.payment_failed": {
			const invoice = event.data.object as Stripe.Invoice;
			const orgId = await resolveOrgIdFromInvoice(invoice);
			if (orgId) {
				await markOrgPastDue(orgId);
			}
			await syncPaidInvoiceToOrg(invoice);
			break;
		}
		case "credit_note.created": {
			const creditNote = event.data.object as Stripe.CreditNote;
			await syncCreditNoteToOrg(creditNote);
			break;
		}
		case "quote.accepted": {
			const quote = event.data.object as Stripe.Quote;
			await syncQuoteAcceptedToOrg(quote);
			break;
		}
		default:
			break;
	}

	return { processed: true };
}
