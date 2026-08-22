import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import {
	mapPlanFromInvoice,
	subscriptionIdFromInvoice,
} from "@/lib/stripe/invoice-utils";

function invoice(partial: Record<string, unknown>): Stripe.Invoice {
	return partial as unknown as Stripe.Invoice;
}

describe("subscriptionIdFromInvoice", () => {
	it("reads the legacy subscription field", () => {
		expect(
			subscriptionIdFromInvoice(invoice({ subscription: "sub_abc" })),
		).toBe("sub_abc");
	});

	it("reads Basil parent.subscription_details.subscription", () => {
		expect(
			subscriptionIdFromInvoice(
				invoice({
					parent: {
						subscription_details: { subscription: "sub_parent" },
					},
				}),
			),
		).toBe("sub_parent");
	});

	it("returns undefined for Dashboard invoices with no subscription", () => {
		expect(subscriptionIdFromInvoice(invoice({ id: "in_1" }))).toBeUndefined();
	});
});

describe("mapPlanFromInvoice", () => {
	it("uses metadata.tier when present", () => {
		expect(
			mapPlanFromInvoice(
				invoice({
					metadata: { tier: "enterprise", interval: "yearly" },
				}),
			),
		).toEqual({ tier: "enterprise", interval: "yearly" });
	});
});
