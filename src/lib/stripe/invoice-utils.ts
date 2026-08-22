import type Stripe from "stripe";
import { getOrganizationByStripeCustomerId } from "@/lib/rbac/organizations";
import {
	getTierFromPriceId,
	type BillingInterval,
	type PricingTier,
} from "./prices";

function asId(value: unknown): string | undefined {
	if (typeof value === "string" && value.length > 0) return value;
	if (value && typeof value === "object" && "id" in value) {
		const id = (value as { id?: unknown }).id;
		if (typeof id === "string" && id.length > 0) return id;
	}
	return undefined;
}

/**
 * Stripe API 2025+ moved invoice.subscription onto parent.subscription_details.
 * Check both so Dashboard invoices and Basil-era payloads still map to a sub.
 */
export function subscriptionIdFromInvoice(
	invoice: Stripe.Invoice,
): string | undefined {
	const legacy = asId(
		(invoice as { subscription?: unknown }).subscription,
	);
	if (legacy) return legacy;

	const parent = (
		invoice as {
			parent?: {
				subscription_details?: { subscription?: unknown };
				type?: string;
			};
		}
	).parent;
	return asId(parent?.subscription_details?.subscription);
}

export function customerIdFromStripeObject(object: {
	customer?: unknown;
}): string | undefined {
	return asId(object.customer);
}

function priceIdFromLine(line: Stripe.InvoiceLineItem): string | undefined {
	const nested = (
		line as {
			pricing?: { price_details?: { price?: unknown } };
			price?: unknown;
		}
	).pricing?.price_details?.price;
	return asId(nested) || asId((line as { price?: unknown }).price);
}

export function mapPlanFromInvoice(invoice: Stripe.Invoice): {
	tier: PricingTier;
	interval: BillingInterval;
	priceId?: string;
} | null {
	const metaTier = invoice.metadata?.tier;
	const metaInterval = invoice.metadata?.interval;
	if (
		metaTier === "starter" ||
		metaTier === "growth" ||
		metaTier === "enterprise"
	) {
		return {
			tier: metaTier,
			interval: metaInterval === "yearly" ? "yearly" : "monthly",
		};
	}

	const lines = invoice.lines?.data ?? [];
	for (const line of lines) {
		const priceId = priceIdFromLine(line);
		if (!priceId) continue;
		const mapped = getTierFromPriceId(priceId);
		if (mapped) {
			return { ...mapped, priceId };
		}
	}

	return null;
}

export function periodEndUnixFromInvoice(
	invoice: Stripe.Invoice,
): number | undefined {
	const direct = (invoice as { period_end?: number }).period_end;
	if (typeof direct === "number" && direct > 0) return direct;

	const linePeriod = invoice.lines?.data?.[0] as
		| { period?: { end?: number } }
		| undefined;
	if (typeof linePeriod?.period?.end === "number") {
		return linePeriod.period.end;
	}

	return undefined;
}

export async function resolveOrgIdFromInvoice(
	invoice: Stripe.Invoice,
): Promise<string | undefined> {
	const metaOrg =
		invoice.metadata?.orgId ||
		(
			invoice as {
				subscription_details?: { metadata?: { orgId?: string } };
			}
		).subscription_details?.metadata?.orgId ||
		(
			invoice as {
				parent?: {
					subscription_details?: { metadata?: { orgId?: string } };
				};
			}
		).parent?.subscription_details?.metadata?.orgId;
	if (metaOrg) return metaOrg;

	const customerId = customerIdFromStripeObject(invoice);
	if (!customerId) return undefined;
	const org = await getOrganizationByStripeCustomerId(customerId);
	return org?.$id;
}
