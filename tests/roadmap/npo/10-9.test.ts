import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FUNDRAISING_INTELLIGENCE_RETENTION_NOTE } from "@/lib/fundraising/intelligence-privacy-copy";
import { NPO_TENANT_DATA_EXPORT_KEYS } from "@/lib/portability/npo-tenant-data-keys";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 10.9 Consent retention note for AI scores", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[10]?.tasks.find(
		(row) => row.taskCode === "10.9",
	);

	it("is catalogued", () => {
		expect(task?.title).toMatch(/retention note/i);
	});

	it("Intelligence tab surfaces the retention note", () => {
		const tab = readFileSync(
			join(process.cwd(), "src/components/constituents/FundraisingIntelligenceTab.tsx"),
			"utf8",
		);
		expect(tab).toContain("FUNDRAISING_INTELLIGENCE_RETENTION_NOTE");
		expect(tab).toMatch(/Data retention/i);
		expect(FUNDRAISING_INTELLIGENCE_RETENTION_NOTE).toMatch(/tenant export\/delete/i);
	});

	it("segment scores are in the tenant delete export list", () => {
		expect(NPO_TENANT_DATA_EXPORT_KEYS).toContain("constituentSegments");
	});
});
