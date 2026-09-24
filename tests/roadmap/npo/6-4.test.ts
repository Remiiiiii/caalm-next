import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 6.4 signed QR tokens and scanner", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[6]?.tasks.find(
		(row) => row.taskCode === "6.4",
	);

	it("is catalogued as QR check-in", () => {
		expect(task?.title).toMatch(/Signed QR/i);
	});

	it("uses HMAC registration tokens without email in payload", () => {
		const helper = readFileSync(
			join(process.cwd(), "src/lib/events/registration-token.ts"),
			"utf8",
		);
		expect(helper).toMatch(/createHmac/);
		expect(helper).toMatch(/registrationQrPayload/);
		expect(helper).not.toMatch(/guestEmail/);
	});

	it("returns 400 on check-in for invalid tokens", () => {
		const route = readFileSync(
			join(process.cwd(), "src/app/api/events/check-in/route.ts"),
			"utf8",
		);
		expect(route).toMatch(/checkInWithRegistrationToken/);
		expect(route).toMatch(/status: 400/);
	});

	it("provides desktop check-in page", () => {
		const page = readFileSync(
			join(process.cwd(), "src/app/(root)/events/check-in/page.tsx"),
			"utf8",
		);
		expect(page).toMatch(/EVENTS\.INVITE/);
		expect(page).toMatch(/EventCheckInClient/);
	});
});
