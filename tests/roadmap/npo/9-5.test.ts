import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DONATION_CHECKOUT_PURPOSE } from "@/lib/stripe/donations";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 9.5 Stripe donation Checkout", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[9]?.tasks.find(
		(row) => row.taskCode === "9.5",
	);

	it("is catalogued as Stripe donation Checkout", () => {
		expect(task?.title).toMatch(/Stripe donation Checkout/i);
	});

	it("uses payment mode with donation metadata", () => {
		const donations = readFileSync(
			join(process.cwd(), "src/lib/stripe/donations.ts"),
			"utf8",
		);
		expect(donations).toMatch(/mode: "payment"/);
		expect(donations).toMatch(/purpose: DONATION_CHECKOUT_PURPOSE/);
		expect(DONATION_CHECKOUT_PURPOSE).toBe("donation");
	});

	it("isolates donation webhooks from billing", () => {
		const webhook = readFileSync(
			join(process.cwd(), "src/lib/stripe/donation-webhooks.ts"),
			"utf8",
		);
		expect(webhook).toMatch(/STRIPE_DONATION_WEBHOOK_SECRET/);
		expect(webhook).toMatch(/stripe-donation/);
		expect(webhook).toMatch(/postGift/);
		const billing = readFileSync(
			join(process.cwd(), "src/lib/stripe/webhooks.ts"),
			"utf8",
		);
		expect(billing).not.toMatch(/DONATION_CHECKOUT_PURPOSE/);
	});
});
