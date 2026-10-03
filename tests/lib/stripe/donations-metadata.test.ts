import { describe, expect, it } from "vitest";
import { buildDonationCheckoutMetadata } from "@/lib/stripe/donations";

describe("buildDonationCheckoutMetadata", () => {
	it("includes share fields and empty strings when unset", () => {
		expect(
			buildDonationCheckoutMetadata({
				orgId: "org_1",
				interval: "monthly",
				shareSource: "qr",
				shareMedium: "caalm",
				shareCampaign: "spring",
			}),
		).toMatchObject({
			purpose: "donation",
			orgId: "org_1",
			donationInterval: "monthly",
			shareSource: "qr",
			shareMedium: "caalm",
			shareCampaign: "spring",
			campaignId: "",
		});
	});
});
