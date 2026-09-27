import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 6.6 donation-at-registration transaction", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[6]?.tasks.find(
		(row) => row.taskCode === "6.6",
	);

	it("is catalogued as donation-at-registration", () => {
		expect(task?.title).toMatch(/Donation-at-registration/i);
	});

	it("rolls back registration when payment fails", () => {
		const service = readFileSync(
			join(process.cwd(), "src/lib/events/registration-donation.service.ts"),
			"utf8",
		);
		expect(service).toMatch(/RegistrationDonationPaymentError/);
		expect(service).toMatch(/deleteRegistration/);
		expect(service).toMatch(/registrationTransactionId/);
	});

	it("posts gift with the event campaign", () => {
		const service = readFileSync(
			join(process.cwd(), "src/lib/events/registration-donation.service.ts"),
			"utf8",
		);
		expect(service).toMatch(/campaignId: event.campaignId/);
	});
});
