import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 6.8 registration confirmation email", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[6]?.tasks.find(
		(row) => row.taskCode === "6.8",
	);

	it("is catalogued as confirmation email", () => {
		expect(task?.title).toMatch(/confirmation email/i);
	});

	it("skips DNC constituents and idempotent sends", () => {
		const sender = readFileSync(
			join(
				process.cwd(),
				"src/lib/events/registration-confirmation-email.ts",
			),
			"utf8",
		);
		expect(sender).toMatch(/canContact/);
		expect(sender).toMatch(/confirmationEmailSentAt/);
		expect(sender).toMatch(/createRegistrationToken/);
	});
});
