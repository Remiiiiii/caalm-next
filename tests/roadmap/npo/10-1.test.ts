import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { canContact } from "@/lib/constituents/consent";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 10.1 Channel consent fields", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[10]?.tasks.find(
		(row) => row.taskCode === "10.1",
	);

	it("is catalogued as channel consent fields", () => {
		expect(task?.title).toMatch(/Channel consent fields/i);
	});

	it("email consent false blocks email even when DNC is false", () => {
		expect(
			canContact(
				{ doNotContact: false, consentEmail: false },
				"email",
			),
		).toBe(false);
		expect(
			canContact({ doNotContact: false, consentEmail: true }, "email"),
		).toBe(true);
	});

	it("audit logs consent changes on constituent PATCH", () => {
		const route = readFileSync(
			join(process.cwd(), "src/app/api/constituents/[id]/route.ts"),
			"utf8",
		);
		expect(route).toMatch(/logConstituentConsentChange/);
		expect(route).toMatch(/consentEmail/);
	});
});
