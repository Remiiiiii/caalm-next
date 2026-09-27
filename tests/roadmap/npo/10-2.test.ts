import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	createPreferenceToken,
	verifyPreferenceToken,
} from "@/lib/constituents/preference-token";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 10.2 Public preference-center token", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[10]?.tasks.find(
		(row) => row.taskCode === "10.2",
	);

	it("is catalogued as preference-center token", () => {
		expect(task?.title).toMatch(/preference-center token/i);
	});

	it("expired token fails verification", () => {
		const token = createPreferenceToken("org1", "c1", {
			expiresAt: Math.floor(Date.now() / 1000) - 10,
		});
		const result = verifyPreferenceToken(token);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe("expired");
	});

	it("public preferences API does not list constituents", () => {
		const route = readFileSync(
			join(process.cwd(), "src/app/api/preferences/[token]/route.ts"),
			"utf8",
		);
		expect(route).not.toMatch(/listConstituents/);
		expect(route).toMatch(/getConstituentById/);
	});
});
