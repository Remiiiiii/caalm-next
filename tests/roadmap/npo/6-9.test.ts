import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 6.9 no public PII on check-in success", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[6]?.tasks.find(
		(row) => row.taskCode === "6.9",
	);

	it("is catalogued as check-in PII minimization", () => {
		expect(task?.title).toMatch(/No public PII/i);
	});

	it("returns firstName and ticket type only from check-in API", () => {
		const route = readFileSync(
			join(process.cwd(), "src/app/api/events/check-in/route.ts"),
			"utf8",
		);
		expect(route).toMatch(/firstName/);
		expect(route).toMatch(/ticketTypeName/);
		expect(route).not.toMatch(/guestEmail/);
		expect(route).not.toMatch(/amountCents/);
	});

	it("does not render email on check-in success UI", () => {
		const ui = readFileSync(
			join(
				process.cwd(),
				"src/app/(root)/events/check-in/EventCheckInClient.tsx",
			),
			"utf8",
		);
		expect(ui).toMatch(/firstName/);
		expect(ui).not.toMatch(/displayName/);
	});
});
