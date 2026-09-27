import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { API_AUTHZ_ALLOWLIST } from "@/lib/rbac/api-authz-allowlist";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 9.4 public give page allowlist", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[9]?.tasks.find(
		(row) => row.taskCode === "9.4",
	);

	it("is catalogued as public give page allowlist", () => {
		expect(task?.title).toMatch(/Public give page allowlist/i);
	});

	it("allowlists give checkout with a public donation reason", () => {
		const entry = API_AUTHZ_ALLOWLIST.find((row) => row.path === "give/checkout");
		expect(entry?.reason).toMatch(/donation checkout/i);
		expect(entry?.reason).toMatch(/not CAALM SaaS entitlements/i);
	});

	it("public give page does not grant entitlements", () => {
		const page = readFileSync(
			join(process.cwd(), "src/app/give/[orgSlug]/page.tsx"),
			"utf8",
		);
		expect(page).toMatch(/does not sign you into CAALM/);
		expect(page).not.toMatch(/entitlement/i);
	});
});
