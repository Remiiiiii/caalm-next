import { describe, expect, it } from "vitest";
import {
	donationShareFromMetadata,
	shouldSkipDonationCreateInvoice,
} from "@/lib/stripe/donation-webhooks";

describe("donation webhook guards", () => {
	it("maps share fields from Stripe metadata", () => {
		expect(
			donationShareFromMetadata({
				shareSource: "embed",
				shareMedium: "caalm",
				shareCampaign: "gala",
			}),
		).toEqual({
			shareSource: "embed",
			shareMedium: "caalm",
			shareCampaign: "gala",
		});
	});

	it("skips the first subscription invoice", () => {
		expect(shouldSkipDonationCreateInvoice("subscription_create")).toBe(true);
		expect(shouldSkipDonationCreateInvoice("subscription_cycle")).toBe(false);
		expect(shouldSkipDonationCreateInvoice(null)).toBe(false);
	});
});
