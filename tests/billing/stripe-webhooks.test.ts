import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const mockClaim = vi.fn();
const mockSyncPaidInvoiceToOrg = vi.fn();
const mockSyncCreditNoteToOrg = vi.fn();
const mockSyncQuoteAcceptedToOrg = vi.fn();
const mockSyncSubscriptionToOrg = vi.fn();
const mockClearOrgSubscription = vi.fn();
const mockMarkOrgPastDue = vi.fn();
const mockResolveOrgId = vi.fn();

vi.mock("@/lib/stripe/webhook-idempotency", () => ({
	claimStripeEvent: (id: string) => mockClaim(id),
}));

vi.mock("@/lib/stripe/billing", () => ({
	clearOrgSubscription: (...args: unknown[]) =>
		mockClearOrgSubscription(...args),
	markOrgPastDue: (...args: unknown[]) => mockMarkOrgPastDue(...args),
	syncCreditNoteToOrg: (...args: unknown[]) =>
		mockSyncCreditNoteToOrg(...args),
	syncPaidInvoiceToOrg: (...args: unknown[]) =>
		mockSyncPaidInvoiceToOrg(...args),
	syncQuoteAcceptedToOrg: (...args: unknown[]) =>
		mockSyncQuoteAcceptedToOrg(...args),
	syncSubscriptionToOrg: (...args: unknown[]) =>
		mockSyncSubscriptionToOrg(...args),
}));

vi.mock("@/lib/stripe/invoice-utils", async () => {
	const actual = await vi.importActual<
		typeof import("@/lib/stripe/invoice-utils")
	>("@/lib/stripe/invoice-utils");
	return {
		...actual,
		resolveOrgIdFromInvoice: (...args: unknown[]) => mockResolveOrgId(...args),
	};
});

vi.mock("@/lib/stripe/client", () => ({
	getStripe: () => ({
		subscriptions: { retrieve: vi.fn() },
	}),
}));

function event(type: string, object: Record<string, unknown>): Stripe.Event {
	return {
		id: "evt_1",
		type,
		data: { object },
	} as unknown as Stripe.Event;
}

describe("handleStripeWebhookEvent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockClaim.mockResolvedValue(true);
	});

	it("syncs Dashboard invoices that have no subscription", async () => {
		const { handleStripeWebhookEvent } = await import(
			"@/lib/stripe/webhooks"
		);
		const invoice = { id: "in_dash", customer: "cus_1", status: "paid" };
		await handleStripeWebhookEvent(event("invoice.paid", invoice));
		expect(mockSyncPaidInvoiceToOrg).toHaveBeenCalledWith(invoice);
	});

	it("syncs credit notes so refunds do not drift from Appwrite", async () => {
		const { handleStripeWebhookEvent } = await import(
			"@/lib/stripe/webhooks"
		);
		const creditNote = { id: "cn_1", invoice: "in_1" };
		await handleStripeWebhookEvent(event("credit_note.created", creditNote));
		expect(mockSyncCreditNoteToOrg).toHaveBeenCalledWith(creditNote);
	});

	it("syncs accepted quotes to the org", async () => {
		const { handleStripeWebhookEvent } = await import(
			"@/lib/stripe/webhooks"
		);
		const quote = { id: "qt_1", metadata: { orgId: "org_1" } };
		await handleStripeWebhookEvent(event("quote.accepted", quote));
		expect(mockSyncQuoteAcceptedToOrg).toHaveBeenCalledWith(quote);
	});
});
