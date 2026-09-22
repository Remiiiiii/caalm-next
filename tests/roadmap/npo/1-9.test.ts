import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	canContact,
	CAN_CONTACT_FUTURE_SENDER_PATHS,
	CAN_CONTACT_REQUIRED_SENDER_PATHS,
} from "@/lib/constituents/consent";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 1.9 do-not-contact enforcement", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[1]?.tasks.find(
		(row) => row.taskCode === "1.9",
	);

	it("is catalogued for canContact", () => {
		expect(task?.title).toMatch(/do-not-contact/i);
	});

	it("returns false for DNC on every channel", () => {
		const blocked = { doNotContact: true };
		expect(canContact(blocked, "email")).toBe(false);
		expect(canContact(blocked, "sms")).toBe(false);
		expect(canContact(blocked, "phone")).toBe(false);
		expect(canContact(blocked, "mail")).toBe(false);
		expect(canContact({ doNotContact: false }, "email")).toBe(true);
	});

	it("fails if a known sender module does not import the helper", () => {
		for (const relative of CAN_CONTACT_REQUIRED_SENDER_PATHS) {
			const source = readFileSync(join(process.cwd(), relative), "utf8");
			expect(source).toMatch(/canContact/);
		}
		for (const relative of CAN_CONTACT_FUTURE_SENDER_PATHS) {
			const full = join(process.cwd(), relative);
			if (!existsSync(full)) continue;
			const source = readFileSync(full, "utf8");
			expect(source).toMatch(/canContact/);
		}
	});
});
