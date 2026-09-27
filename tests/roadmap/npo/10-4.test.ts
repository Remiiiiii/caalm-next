import { describe, expect, it } from "vitest";
import { getOrgExportCatalog } from "@/lib/portability/org-export-catalog";
import { NPO_TENANT_DATA_EXPORT_KEYS } from "@/lib/portability/npo-tenant-data-keys";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 10.4 Constituents in tenant export", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[10]?.tasks.find(
		(row) => row.taskCode === "10.4",
	);

	it("is catalogued", () => {
		expect(task?.title).toMatch(/Constituents in tenant export/i);
	});

	it("export manifest includes constituent and gift tables", () => {
		const keys = new Set(getOrgExportCatalog().map((e) => e.key));
		expect(keys.has("constituents")).toBe(true);
		expect(keys.has("gifts")).toBe(true);
		expect(keys.has("volunteerHours")).toBe(true);
		expect(keys.has("constituentSegments")).toBe(true);
		for (const required of NPO_TENANT_DATA_EXPORT_KEYS) {
			expect(keys.has(required)).toBe(true);
		}
	});
});
