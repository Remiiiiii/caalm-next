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
import {
	CAALM_INVOICE_FOOTER,
	CAALM_QUOTE_HEADER,
	stripeDashboardLinks,
} from "./branding";
import { getStripe } from "./client";
import {
	customerIdFromStripeObject,
	mapPlanFromInvoice,
	periodEndUnixFromInvoice,
	resolveOrgIdFromInvoice,
	subscriptionIdFromInvoice,
} from "./invoice-utils";
import { getPriceId, getTierFromPriceId, type PricingTier } from "./prices";

function isStripeMissingCustomerError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const stripeError = error as { code?: string; param?: string; message?: string };
	if (stripeError.code === "resource_missing" && stripeError.param === "customer") {
		return true;
	}
	return (
		typeof stripeError.message === "string" &&
		stripeError.message.includes("No such customer")
	);
}

async function retrieveStripeCustomer(
	stripe: Stripe,
	customerId: string,
): Promise<Stripe.Customer | Stripe.DeletedCustomer | null> {
	try {
		return await stripe.customers.retrieve(customerId);
	} catch (error) {
		if (isStripeMissingCustomerError(error)) return null;
		throw error;
	}
}

async function clearStaleStripeCustomer(orgId: string): Promise<void> {
	await updateOrganizationBilling(orgId, {
		stripeCustomerId: "",
		stripeSubscriptionId: "",
		stripePriceId: "",
	});
}

function automaticTaxEnabled(): boolean {
	const raw = process.env.STRIPE_AUTOMATIC_TAX;
	if (raw === undefined || raw === "") return true;
	return raw === "1" || raw.toLowerCase() === "true";
}

const FLEXIBLE_BILLING_MODE = { type: "flexible" as const };

/**
 * Card-on-file Checkout trial. Pilots already grant access without a card,
 * so converting a pilot charges immediately (no extra trial). Set
 * STRIPE_CHECKOUT_TRIAL_DAYS=0 to turn this off.
 */
function checkoutTrialPeriodDays(org: Organization): number | undefined {
	const raw = process.env.STRIPE_CHECKOUT_TRIAL_DAYS;
	if (raw === "0" || raw?.toLowerCase() === "false") return undefined;
	const days = raw ? Number.parseInt(raw, 10) : 90;
	if (!Number.isFinite(days) || days <= 0) return undefined;
	if (org.billingStatus === "pilot") return undefined;
	return days;
}

export async function getOrCreateStripeCustomer(
	org: Organization,
	email: string,
	name?: string,
): Promise<string> {
	const stripe = getStripe();

	if (org.stripeCustomerId) {
		const existing = await retrieveStripeCustomer(stripe, org.stripeCustomerId);
		if (existing && !("deleted" in existing && existing.deleted)) {
			return org.stripeCustomerId;
		}

		console.warn(
			`[stripe] Stale customer ${org.stripeCustomerId} for org ${org.$id}; creating a new customer`,
		);
		await clearStaleStripeCustomer(org.$id);
	}

	const customer = await stripe.customers.create({
		email,
		name: name || org.name,
		metadata: {
			orgId: org.$id,
		},
		invoice_settings: {
			footer: CAALM_INVOICE_FOOTER,
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

	const trialDays = checkoutTrialPeriodDays(org);
	const subscriptionData: NonNullable<
		Stripe.Checkout.SessionCreateParams["subscription_data"]
	> & {
		billing_mode?: { type: "flexible" | "classic" };
	} = {
		metadata: {
			orgId: org.$id,
			tier,
			interval,
		},
		// Flexible mode is Stripe's current default for prorations; set it
		// explicitly so new Checkout subs match Quotes and Dashboard invoices.
		billing_mode: { type: "flexible" },
	};
	if (trialDays) {
		subscriptionData.trial_period_days = trialDays;
	}

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
		subscription_data: subscriptionData,
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
 * Sales-led Stripe Quote for Enterprise (or any listed plan).
 * Finalize so sales can download the PDF from the Dashboard and send it.
 * Accepting the quote creates a subscription; webhooks then grant access.
 */
export async function createAndFinalizeQuote({
	org,
	tier,
	interval,
	email,
	userName,
	daysUntilDue = 30,
}: {
	org: Organization;
	tier: PricingTier;
	interval: BillingInterval;
	email: string;
	userName?: string;
	daysUntilDue?: number;
}): Promise<{
	quoteId: string;
	number: string | null;
	status: string;
	dashboardUrl: string;
}> {
	const stripe = getStripe();
	const customerId = await getOrCreateStripeCustomer(org, email, userName);
	const priceId = getPriceId(tier, interval);

	const quoteParams: Stripe.QuoteCreateParams = {
		customer: customerId,
		collection_method: "send_invoice",
		header: CAALM_QUOTE_HEADER,
		footer: CAALM_INVOICE_FOOTER,
		description: `${org.name} — ${tier} (${interval})`,
		invoice_settings: { days_until_due: daysUntilDue },
		line_items: [{ price: priceId, quantity: 1 }],
		metadata: {
			orgId: org.$id,
			tier,
			interval,
		},
		subscription_data: {
			billing_mode: FLEXIBLE_BILLING_MODE,
			metadata: {
				orgId: org.$id,
				tier,
				interval,
			},
		},
	};

	if (automaticTaxEnabled()) {
		quoteParams.automatic_tax = { enabled: true };
	}

	const draft = await stripe.quotes.create(quoteParams);
	const quote = await stripe.quotes.finalizeQuote(draft.id);

	return {
		quoteId: quote.id,
		number: quote.number ?? null,
		status: quote.status,
		dashboardUrl: stripeDashboardLinks().quote(quote.id),
	};
}

/**
 * Paid invoices without a subscription (Dashboard / sales send_invoice)
 * still need to unlock the org. Subscription invoices go through the
 * existing sync path.
 */
export async function syncPaidInvoiceToOrg(
	invoice: Stripe.Invoice,
): Promise<void> {
	const subscriptionId = subscriptionIdFromInvoice(invoice);
	const orgId = await resolveOrgIdFromInvoice(invoice);
	if (!orgId) {
		if (subscriptionId) {
			console.error(
				"[stripe] syncPaidInvoiceToOrg: no org for invoice",
				invoice.id,
			);
		}
		return;
	}
	if (subscriptionId) {
		const stripe = getStripe();
		const subscription = await stripe.subscriptions.retrieve(subscriptionId);
		await syncSubscriptionToOrg(subscription, orgId);
		return;
	}

	const paid =
		invoice.status === "paid" ||
		(invoice as { paid?: boolean }).paid === true;
	if (!paid) return;

	const mapped = mapPlanFromInvoice(invoice);
	if (!mapped) {
		console.error(
			"[stripe] syncPaidInvoiceToOrg: paid invoice has no mapped plan",
			invoice.id,
		);
		return;
	}

	const customerId = customerIdFromStripeObject(invoice);
	const periodEndUnix = periodEndUnixFromInvoice(invoice);
	const periodEnd = periodEndUnix
		? new Date(periodEndUnix * 1000).toISOString()
		: undefined;

	await updateOrganizationBilling(orgId, {
		stripeCustomerId: customerId,
		stripePriceId: mapped.priceId,
		billingStatus: "active",
		billingInterval: mapped.interval,
		subscriptionTier: mapped.tier,
		currentPeriodEnd: periodEnd,
		settingsPatch: { pastDueSince: null },
	});
}

/**
 * After a credit note, re-read the subscription so Appwrite billing
 * matches Stripe (refunds should not leave us showing "active" if
 * Stripe moved the sub to unpaid). Standalone credits do not revoke access.
 */
export async function syncCreditNoteToOrg(
	creditNote: Stripe.CreditNote,
): Promise<void> {
	const invoiceRef = creditNote.invoice;
	const invoiceId =
		typeof invoiceRef === "string" ? invoiceRef : invoiceRef?.id;
	if (!invoiceId) return;

	const stripe = getStripe();
	const invoice = await stripe.invoices.retrieve(invoiceId);
	const subscriptionId = subscriptionIdFromInvoice(invoice);
	if (!subscriptionId) return;

	const subscription = await stripe.subscriptions.retrieve(subscriptionId);
	await syncSubscriptionToOrg(subscription);
}

export async function syncQuoteAcceptedToOrg(
	quote: Stripe.Quote,
): Promise<void> {
	const orgId = quote.metadata?.orgId;
	const subscriptionId = asQuoteSubscriptionId(quote);
	if (subscriptionId) {
		const stripe = getStripe();
		const subscription = await stripe.subscriptions.retrieve(subscriptionId);
		await syncSubscriptionToOrg(subscription, orgId || undefined);
		return;
	}

	const invoiceId = asQuoteInvoiceId(quote);
	if (invoiceId) {
		const stripe = getStripe();
		const invoice = await stripe.invoices.retrieve(invoiceId);
		await syncPaidInvoiceToOrg(invoice);
	}
}

function asQuoteSubscriptionId(quote: Stripe.Quote): string | undefined {
	const value = quote.subscription;
	if (typeof value === "string") return value;
	if (value && typeof value === "object" && "id" in value) return value.id;
	return undefined;
}

function asQuoteInvoiceId(quote: Stripe.Quote): string | undefined {
	const value = quote.invoice;
	if (typeof value === "string") return value;
	if (value && typeof value === "object" && "id" in value) return value.id;
	return undefined;
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

export async function getInvoicePdfDownloadForOrg(
	org: Organization,
	invoiceId: string,
): Promise<{ pdfUrl: string; filename: string }> {
	if (!org.stripeCustomerId) {
		throw new Error("Invoice not found");
	}

	const stripe = getStripe();
	const invoice = await stripe.invoices.retrieve(invoiceId);
	const customerId = customerIdFromStripeObject(invoice);
	if (customerId !== org.stripeCustomerId) {
		throw new Error("Invoice not found");
	}

	const pdfUrl = invoice.invoice_pdf;
	if (!pdfUrl) {
		throw new Error("Invoice PDF is not available");
	}

	const filename = `invoice-${invoice.number || invoice.id}.pdf`;
	return { pdfUrl, filename };
}

export async function listInvoicesForOrg(
	org: Organization,
	limit = 100,
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
	const customer = await retrieveStripeCustomer(stripe, org.stripeCustomerId);
	if (!customer || ("deleted" in customer && customer.deleted)) {
		console.warn(
			`[stripe] Clearing stale customer ${org.stripeCustomerId} for org ${org.$id} during invoice list`,
		);
		await clearStaleStripeCustomer(org.$id);
		return [];
	}

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

export type OrgPaymentMethod = {
	id: string;
	brand: string;
	last4: string;
	expMonth: number;
	expYear: number;
	name: string | null;
	isDefault: boolean;
};

export async function listPaymentMethodsForOrg(
	org: Organization,
): Promise<OrgPaymentMethod[]> {
	if (!org.stripeCustomerId) return [];

	const stripe = getStripe();
	const customer = await retrieveStripeCustomer(stripe, org.stripeCustomerId);
	if (!customer || ("deleted" in customer && customer.deleted)) {
		console.warn(
			`[stripe] Clearing stale customer ${org.stripeCustomerId} for org ${org.$id} during payment method list`,
		);
		await clearStaleStripeCustomer(org.$id);
		return [];
	}

	const defaultPaymentMethod =
		customer.invoice_settings?.default_payment_method;
	const defaultId =
		typeof defaultPaymentMethod === "string"
			? defaultPaymentMethod
			: (defaultPaymentMethod?.id ?? null);

	const methods = await stripe.paymentMethods.list({
		customer: org.stripeCustomerId,
		type: "card",
	});

	return methods.data.map((pm) => ({
		id: pm.id,
		brand: pm.card?.brand ?? "card",
		last4: pm.card?.last4 ?? "••••",
		expMonth: pm.card?.exp_month ?? 0,
		expYear: pm.card?.exp_year ?? 0,
		name: pm.billing_details?.name ?? null,
		isDefault: pm.id === defaultId,
	}));
}

const UPCOMING_INVOICE_BILLING_STATUSES = new Set<BillingStatus>([
	"active",
	"trialing",
	"past_due",
]);

export async function orgHasUpcomingInvoice(org: Organization): Promise<boolean> {
	if (!org.stripeCustomerId) return false;

	if (
		org.stripeSubscriptionId &&
		org.billingStatus &&
		UPCOMING_INVOICE_BILLING_STATUSES.has(org.billingStatus)
	) {
		return true;
	}

	const stripe = getStripe();
	try {
		await stripe.invoices.retrieveUpcoming({
			customer: org.stripeCustomerId,
		});
		return true;
	} catch {
		// No subscription preview — still block if an unpaid invoice is open.
		const openInvoices = await stripe.invoices.list({
			customer: org.stripeCustomerId,
			status: "open",
			limit: 1,
		});
		return openInvoices.data.length > 0;
	}
}

async function assertPaymentMethodForOrg(
	org: Organization,
	paymentMethodId: string,
): Promise<{ stripe: ReturnType<typeof getStripe>; customerId: string }> {
	if (!org.stripeCustomerId) {
		throw new Error("No billing customer for this organization");
	}

	const stripe = getStripe();
	const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
	const paymentMethodCustomerId =
		typeof paymentMethod.customer === "string"
			? paymentMethod.customer
			: paymentMethod.customer?.id;

	if (paymentMethodCustomerId !== org.stripeCustomerId) {
		throw new Error("Payment method not found for this organization");
	}

	return { stripe, customerId: org.stripeCustomerId };
}

export async function updateOrgPaymentMethod(
	org: Organization,
	paymentMethodId: string,
	updates: { name?: string; expMonth?: number; expYear?: number },
): Promise<OrgPaymentMethod> {
	const { stripe } = await assertPaymentMethodForOrg(org, paymentMethodId);

	const updateParams: Stripe.PaymentMethodUpdateParams = {};
	if (updates.name !== undefined) {
		updateParams.billing_details = { name: updates.name };
	}
	if (updates.expMonth !== undefined || updates.expYear !== undefined) {
		updateParams.card = {
			...(updates.expMonth !== undefined
				? { exp_month: updates.expMonth }
				: {}),
			...(updates.expYear !== undefined ? { exp_year: updates.expYear } : {}),
		};
	}

	const updated = await stripe.paymentMethods.update(
		paymentMethodId,
		updateParams,
	);
	const methods = await listPaymentMethodsForOrg(org);
	const match = methods.find((method) => method.id === updated.id);
	if (!match) {
		throw new Error("Updated payment method could not be loaded");
	}
	return match;
}

export async function setDefaultOrgPaymentMethod(
	org: Organization,
	paymentMethodId: string,
): Promise<OrgPaymentMethod[]> {
	const { stripe, customerId } = await assertPaymentMethodForOrg(
		org,
		paymentMethodId,
	);

	await stripe.customers.update(customerId, {
		invoice_settings: { default_payment_method: paymentMethodId },
	});

	return listPaymentMethodsForOrg(org);
}

export async function detachOrgPaymentMethod(
	org: Organization,
	paymentMethodId: string,
): Promise<void> {
	const { stripe, customerId } = await assertPaymentMethodForOrg(
		org,
		paymentMethodId,
	);

	const customer = await retrieveStripeCustomer(stripe, customerId);
	if (!customer || ("deleted" in customer && customer.deleted)) {
		throw new Error("Billing customer is unavailable");
	}

	const defaultPaymentMethod =
		customer.invoice_settings?.default_payment_method;
	const defaultId =
		typeof defaultPaymentMethod === "string"
			? defaultPaymentMethod
			: (defaultPaymentMethod?.id ?? null);

	if (defaultId === paymentMethodId) {
		const hasUpcomingInvoice = await orgHasUpcomingInvoice(org);
		if (hasUpcomingInvoice) {
			throw new Error(
				`The default payment method cannot be removed while ${org.name} has an upcoming invoice. Set a backup or add a new default payment method first.`,
			);
		}
	}

	const allMethods = await stripe.paymentMethods.list({
		customer: customerId,
		type: "card",
	});

	if (allMethods.data.length <= 1 && defaultId === paymentMethodId) {
		throw new Error(
			"Add another payment method before removing your default card.",
		);
	}

	if (defaultId === paymentMethodId) {
		const fallback = allMethods.data.find(
			(method) => method.id !== paymentMethodId,
		);
		if (fallback) {
			await stripe.customers.update(customerId, {
				invoice_settings: { default_payment_method: fallback.id },
			});
		}
	}

	await stripe.paymentMethods.detach(paymentMethodId);
}

export async function createPaymentMethodSetupSession({
	org,
	email,
	userName,
	successUrl,
	cancelUrl,
	replacePaymentMethodId,
}: {
	org: Organization;
	email: string;
	userName?: string;
	successUrl: string;
	cancelUrl: string;
	replacePaymentMethodId?: string;
}): Promise<string> {
	const stripe = getStripe();
	const customerId = await getOrCreateStripeCustomer(org, email, userName);

	if (replacePaymentMethodId) {
		await assertPaymentMethodForOrg(org, replacePaymentMethodId);
	}

	const metadata: Record<string, string> = {
		orgId: org.$id,
		purpose: replacePaymentMethodId ? "replace" : "add",
	};
	if (replacePaymentMethodId) {
		metadata.replacePaymentMethodId = replacePaymentMethodId;
	}

	const session = await stripe.checkout.sessions.create({
		mode: "setup",
		customer: customerId,
		success_url: successUrl,
		cancel_url: cancelUrl,
		metadata,
		client_reference_id: org.$id,
		billing_address_collection: "required",
		payment_method_types: ["card"],
	});

	if (!session.url) {
		throw new Error("Stripe setup session missing URL");
	}

	return session.url;
}

export async function completePaymentMethodReplace(
	org: Organization,
	replacePaymentMethodId: string,
	newPaymentMethodId: string,
): Promise<void> {
	const { stripe, customerId } = await assertPaymentMethodForOrg(
		org,
		replacePaymentMethodId,
	);

	const newPaymentMethod =
		await stripe.paymentMethods.retrieve(newPaymentMethodId);
	const newCustomerId =
		typeof newPaymentMethod.customer === "string"
			? newPaymentMethod.customer
			: newPaymentMethod.customer?.id;

	if (newCustomerId !== customerId) {
		throw new Error("Replacement card is not attached to this customer");
	}

	const customer = await retrieveStripeCustomer(stripe, customerId);
	if (!customer || ("deleted" in customer && customer.deleted)) {
		throw new Error("Billing customer is unavailable");
	}

	const defaultPaymentMethod =
		customer.invoice_settings?.default_payment_method;
	const defaultId =
		typeof defaultPaymentMethod === "string"
			? defaultPaymentMethod
			: (defaultPaymentMethod?.id ?? null);
	const wasDefault = defaultId === replacePaymentMethodId;

	if (wasDefault) {
		await stripe.customers.update(customerId, {
			invoice_settings: { default_payment_method: newPaymentMethodId },
		});
	}

	await stripe.paymentMethods.detach(replacePaymentMethodId);
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
