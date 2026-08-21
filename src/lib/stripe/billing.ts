import type Stripe from "stripe";
import {
	type BillingInterval,
	type BillingStatus,
	getOrganization,
	type Organization,
	updateOrganizationBilling,
} from "@/lib/rbac/organizations";
import { getStripe } from "./client";
import {
	getPriceId,
	getTierFromPriceId,
	PILOT_TRIAL_DAYS,
	type PricingTier,
} from "./prices";

export async function getOrCreateStripeCustomer(
	org: Organization,
	email: string,
	name?: string,
): Promise<string> {
	const stripe = getStripe();

	if (org.stripeCustomerId) {
		return org.stripeCustomerId;
	}

	const customer = await stripe.customers.create({
		email,
		name: name || org.name,
		metadata: {
			orgId: org.$id,
		},
	});

	await updateOrganizationBilling(org.$id, {
		stripeCustomerId: customer.id,
	});

	return customer.id;
}

export async function createCheckoutSession({
	org,
	tier,
	interval,
	email,
	userName,
	successUrl,
	cancelUrl,
	trialDays,
}: {
	org: Organization;
	tier: PricingTier;
	interval: BillingInterval;
	email: string;
	userName?: string;
	successUrl: string;
	cancelUrl: string;
	/** When set (e.g. Growth pilot), Stripe starts a trial before first charge. */
	trialDays?: number;
}): Promise<string> {
	if (tier === "enterprise") {
		throw new Error(
			"Enterprise is sales-assisted only. Contact sales — self-serve checkout is not available.",
		);
	}

	const stripe = getStripe();
	const customerId = await getOrCreateStripeCustomer(org, email, userName);
	const priceId = getPriceId(tier, interval);

	const status = org.billingStatus || "none";
	const eligibleForPilot =
		tier === "growth" &&
		(status === "none" || status === "canceled") &&
		(trialDays === undefined || trialDays > 0);
	const resolvedTrialDays = eligibleForPilot
		? trialDays ?? PILOT_TRIAL_DAYS
		: undefined;

	const session = await stripe.checkout.sessions.create({
		mode: "subscription",
		customer: customerId,
		line_items: [{ price: priceId, quantity: 1 }],
		success_url: successUrl,
		cancel_url: cancelUrl,
		client_reference_id: org.$id,
		metadata: {
			orgId: org.$id,
			tier,
			interval,
			...(resolvedTrialDays
				? { pilot: "growth-90d", trialDays: String(resolvedTrialDays) }
				: {}),
		},
		subscription_data: {
			...(resolvedTrialDays
				? { trial_period_days: resolvedTrialDays }
				: {}),
			metadata: {
				orgId: org.$id,
				tier,
				interval,
				...(resolvedTrialDays ? { pilot: "growth-90d" } : {}),
			},
		},
		allow_promotion_codes: true,
	});

	if (!session.url) {
		throw new Error("Stripe Checkout session missing URL");
	}

	return session.url;
}

export async function createPortalSession({
	org,
	email,
	userName,
	returnUrl,
}: {
	org: Organization;
	email: string;
	userName?: string;
	returnUrl: string;
}): Promise<string> {
	const stripe = getStripe();
	const customerId = await getOrCreateStripeCustomer(org, email, userName);

	const session = await stripe.billingPortal.sessions.create({
		customer: customerId,
		return_url: returnUrl,
	});

	return session.url;
}

export async function listInvoicesForOrg(
	org: Organization,
	limit = 12,
): Promise<
	Array<{
		id: string;
		number: string | null;
		status: string | null;
		amountDue: number;
		amountPaid: number;
		currency: string;
		created: number;
		hostedInvoiceUrl: string | null;
		invoicePdf: string | null;
	}>
> {
	if (!org.stripeCustomerId) return [];

	const stripe = getStripe();
	const invoices = await stripe.invoices.list({
		customer: org.stripeCustomerId,
		limit,
	});

	return invoices.data.map((invoice) => ({
		id: invoice.id,
		number: invoice.number,
		status: invoice.status,
		amountDue: invoice.amount_due,
		amountPaid: invoice.amount_paid,
		currency: invoice.currency,
		created: invoice.created,
		hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
		invoicePdf: invoice.invoice_pdf ?? null,
	}));
}

export async function syncSubscriptionToOrg(
	subscription: Stripe.Subscription,
	orgIdOverride?: string,
): Promise<void> {
	const orgId =
		orgIdOverride ||
		subscription.metadata?.orgId ||
		(typeof subscription.customer === "string" ? undefined : undefined);

	const customerId =
		typeof subscription.customer === "string"
			? subscription.customer
			: subscription.customer.id;

	let resolvedOrgId = orgId;
	if (!resolvedOrgId) {
		const { listOrganizations } = await import("@/lib/rbac/organizations");
		const orgs = await listOrganizations();
		const match = orgs.find((o) => o.stripeCustomerId === customerId);
		resolvedOrgId = match?.$id;
	}

	if (!resolvedOrgId) {
		console.error(
			"[stripe] syncSubscriptionToOrg: no org for subscription",
			subscription.id,
		);
		return;
	}

	const priceId = subscription.items.data[0]?.price?.id;
	const mapped = priceId ? getTierFromPriceId(priceId) : null;

	const statusMap: Record<string, BillingStatus> = {
		active: "active",
		trialing: "trialing",
		past_due: "past_due",
		canceled: "canceled",
		unpaid: "past_due",
		incomplete: "none",
		incomplete_expired: "canceled",
		paused: "none",
	};

	const billingStatus = statusMap[subscription.status] ?? "none";
	const periodEndUnix =
		(subscription as Stripe.Subscription & { current_period_end?: number })
			.current_period_end ??
		subscription.items.data[0]?.current_period_end ??
		undefined;
	const periodEnd = periodEndUnix
		? new Date(periodEndUnix * 1000).toISOString()
		: undefined;

	await updateOrganizationBilling(resolvedOrgId, {
		stripeCustomerId: customerId,
		stripeSubscriptionId: subscription.id,
		stripePriceId: priceId,
		billingStatus,
		billingInterval: mapped?.interval,
		subscriptionTier: mapped?.tier,
		currentPeriodEnd: periodEnd,
	});
}

export async function clearOrgSubscription(orgId: string): Promise<void> {
	await updateOrganizationBilling(orgId, {
		stripeSubscriptionId: "",
		stripePriceId: "",
		billingStatus: "canceled",
	});
}

export { getOrganization };
