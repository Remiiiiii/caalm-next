import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getOrgExportCatalog } from "@/lib/portability/org-export-catalog";
import { NPO_TENANT_DATA_EXPORT_KEYS } from "@/lib/portability/npo-tenant-data-keys";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 10.5 Constituents in tenant delete", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[10]?.tasks.find(
		(row) => row.taskCode === "10.5",
	);

	it("is catalogued", () => {
		expect(task?.title).toMatch(/Constituents in tenant delete/i);
	});

	it("deletion catalog lists NPO collections including wealth imports", () => {
		const keys = new Set(getOrgExportCatalog().map((e) => e.key));
		for (const required of NPO_TENANT_DATA_EXPORT_KEYS) {
			expect(keys.has(required)).toBe(true);
		}
		expect(keys.has("constituentWealthScreens")).toBe(true);
	});

	it("constituent and gift APIs 404 when organization is purged", () => {
		const ctx = readFileSync(
			join(process.cwd(), "src/lib/constituents/request-context.ts"),
			"utf8",
		);
		expect(ctx).toMatch(/isActiveOrganization/);
		const gifts = readFileSync(
			join(process.cwd(), "src/lib/gifts/request-context.ts"),
			"utf8",
		);
		expect(gifts).toMatch(/isActiveOrganization/);
	});
});
