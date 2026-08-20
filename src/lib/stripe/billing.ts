import type Stripe from "stripe";
import {
	settingsFromTier,
	normalizePricingTier,
} from "@/lib/billing/entitlements";
import {
	type BillingInterval,
	type BillingStatus,
	getOrganization,
	type Organization,
	updateOrganization,
	updateOrganizationBilling,
} from "@/lib/rbac/organizations";
import { getStripe } from "./client";
import { getPriceId, getTierFromPriceId, type PricingTier } from "./prices";

function automaticTaxEnabled(): boolean {
	const raw = process.env.STRIPE_AUTOMATIC_TAX;
	if (raw === undefined || raw === "") return true;
	return raw === "1" || raw.toLowerCase() === "true";
}

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
}: {
	org: Organization;
	tier: PricingTier;
	interval: BillingInterval;
	email: string;
	userName?: string;
	successUrl: string;
	cancelUrl: string;
}): Promise<string> {
	const stripe = getStripe();
	const customerId = await getOrCreateStripeCustomer(org, email, userName);
	// Price IDs always resolved server-side from env — never trust the client.
	const priceId = getPriceId(tier, interval);

	const sessionParams: Stripe.Checkout.SessionCreateParams = {
		mode: "subscription",
		customer: customerId,
		line_items: [{ price: priceId, quantity: 1 }],
		success_url: successUrl,
		cancel_url: cancelUrl,
		client_reference_id: org.$id,
		billing_address_collection: "required",
		customer_update: {
			address: "auto",
			name: "auto",
		},
		tax_id_collection: { enabled: true },
		metadata: {
			orgId: org.$id,
			tier,
			interval,
		},
		subscription_data: {
			metadata: {
				orgId: org.$id,
				tier,
				interval,
			},
		},
		allow_promotion_codes: true,
	};

	if (automaticTaxEnabled()) {
		sessionParams.automatic_tax = { enabled: true };
	}

	const session = await stripe.checkout.sessions.create(sessionParams);

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

/**
 * Change plan on an existing subscription with Stripe proration.
 * Price ID is resolved server-side only.
 */
export async function changeSubscriptionPlan({
	org,
	tier,
	interval,
}: {
	org: Organization;
	tier: PricingTier;
	interval: BillingInterval;
}): Promise<Stripe.Subscription> {
	if (!org.stripeSubscriptionId) {
		throw new Error("Organization has no active Stripe subscription");
	}

	const stripe = getStripe();
	const priceId = getPriceId(tier, interval);
	const subscription = await stripe.subscriptions.retrieve(
		org.stripeSubscriptionId,
	);
	const itemId = subscription.items.data[0]?.id;
	if (!itemId) {
		throw new Error("Subscription has no line items");
	}

	const updated = await stripe.subscriptions.update(subscription.id, {
		items: [{ id: itemId, price: priceId }],
		proration_behavior: "create_prorations",
		metadata: {
			...subscription.metadata,
			orgId: org.$id,
			tier,
			interval,
		},
		cancel_at_period_end: false,
	});

	await syncSubscriptionToOrg(updated, org.$id);
	return updated;
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
		orgIdOverride || subscription.metadata?.orgId || undefined;

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

	const settingsPatch: Record<string, unknown> = {};
	if (billingStatus === "past_due") {
		const existing = await getOrganization(resolvedOrgId);
		if (!existing?.settings?.pastDueSince) {
			settingsPatch.pastDueSince = new Date().toISOString();
		}
	} else if (billingStatus === "active" || billingStatus === "trialing") {
		settingsPatch.pastDueSince = null;
	}

	await updateOrganizationBilling(resolvedOrgId, {
		stripeCustomerId: customerId,
		stripeSubscriptionId: subscription.id,
		stripePriceId: priceId,
		billingStatus,
		billingInterval: mapped?.interval,
		subscriptionTier: mapped?.tier,
		currentPeriodEnd: periodEnd,
		settingsPatch,
	});
}

export async function markOrgPastDue(orgId: string): Promise<void> {
	const existing = await getOrganization(orgId);
	const settingsPatch: Record<string, unknown> = {};
	if (!existing?.settings?.pastDueSince) {
		settingsPatch.pastDueSince = new Date().toISOString();
	}
	await updateOrganizationBilling(orgId, {
		billingStatus: "past_due",
		settingsPatch,
	});
}

export async function clearOrgSubscription(orgId: string): Promise<void> {
	await updateOrganizationBilling(orgId, {
		stripeSubscriptionId: "",
		stripePriceId: "",
		billingStatus: "canceled",
		settingsPatch: { pastDueSince: null },
	});
}

/**
 * Start a free pilot (3–6 months). No Stripe charge until they convert via Checkout.
 * Only callable from the pilot API (platform permission).
 */
export async function startOrgPilot({
	orgId,
	tier,
	months,
}: {
	orgId: string;
	tier: PricingTier;
	months: 3 | 4 | 5 | 6;
}): Promise<Organization> {
	const org = await getOrganization(orgId);
	if (!org) throw new Error("Organization not found");

	if (
		org.billingStatus === "active" ||
		org.billingStatus === "trialing" ||
		org.billingStatus === "past_due"
	) {
		throw new Error(
			"Organization already has a Stripe subscription; cancel it before starting a pilot",
		);
	}

	const now = new Date();
	const ends = new Date(now);
	ends.setMonth(ends.getMonth() + months);
	const caps = settingsFromTier(tier);

	await updateOrganization(orgId, {
		subscriptionTier: tier,
		status: "trial",
		settings: {
			...org.settings,
			...caps,
			features: org.settings?.features || [],
			pilotStartedAt: now.toISOString(),
			pilotMonths: months,
			pastDueSince: null,
		},
	});

	const updated = await updateOrganizationBilling(orgId, {
		billingStatus: "pilot",
		subscriptionTier: tier,
		currentPeriodEnd: ends.toISOString(),
		stripeSubscriptionId: "",
		stripePriceId: "",
		settingsPatch: {
			pilotStartedAt: now.toISOString(),
			pilotMonths: months,
			pastDueSince: null,
		},
	});

	if (!updated) throw new Error("Failed to start pilot");
	return updated;
}

export { getOrganization, normalizePricingTier };
