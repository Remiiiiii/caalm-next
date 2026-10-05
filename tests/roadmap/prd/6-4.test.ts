import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PRD 6.4 buyer demo script", () => {
	it("demo script leads with contracts and licenses and lists disclaimers", () => {
		const script = readFileSync(
			join(process.cwd(), "docs/internal/buyer-demo-script.md"),
			"utf8",
		);
		expect(script).toMatch(/Contracts hub/);
		expect(script).toMatch(/Licenses/);
		expect(script).toMatch(/disclaimers/i);
		expect(script).toMatch(/SSO.*not self-serve|not self-serve Connected/i);
		expect(script).toMatch(/IT portal/);
	});

	it("aligns with public pricing honesty on SSO and API", () => {
		const pricing = readFileSync(
			join(process.cwd(), "public/PRICING.md"),
			"utf8",
		);
		expect(pricing).toMatch(/not.*shipped yet.*customer API\/webhooks.*SSO/i);
		const script = readFileSync(
			join(process.cwd(), "docs/internal/buyer-demo-script.md"),
			"utf8",
		);
		expect(script).toMatch(/PRICING\.md/);
		expect(script).not.toMatch(/SSO included on Growth/i);
	});
});
