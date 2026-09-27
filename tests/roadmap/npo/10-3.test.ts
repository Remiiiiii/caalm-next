import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	CAN_CONTACT_REQUIRED_SENDER_PATHS,
	canContact,
} from "@/lib/constituents/consent";
import { sendAppealEmail } from "@/lib/appeals/send";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 10.3 Suppress receipts and appeals on consent", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[10]?.tasks.find(
		(row) => row.taskCode === "10.3",
	);

	it("is catalogued", () => {
		expect(task?.title).toMatch(/Suppress receipts and appeals/i);
	});

	it("email consent false blocks canContact for appeals path", () => {
		expect(
			canContact({ doNotContact: false, consentEmail: false }, "email"),
		).toBe(false);
	});

	it("known sender modules import canContact", () => {
		for (const relative of CAN_CONTACT_REQUIRED_SENDER_PATHS) {
			const source = readFileSync(join(process.cwd(), relative), "utf8");
			expect(source).toMatch(/canContact/);
		}
	});

	it("sendAppealEmail returns consent when email channel blocked", async () => {
		const result = await sendAppealEmail({
			constituent: {
				$id: "c1",
				$createdAt: "",
				$updatedAt: "",
				orgId: "o1",
				type: "donor",
				firstName: "A",
				lastName: "B",
				email: "a@example.com",
				doNotContact: false,
				consentEmail: false,
				fundCode: "UNRESTRICTED",
			} as never,
			subject: "Appeal",
			bodyText: "Give today",
		});
		expect(result).toEqual({ sent: false, reason: "consent" });
	});
});
