import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	FUNDING_OUT_OF_LANE,
	FUNDING_SCOPE_HELP,
} from "@/lib/funding/finance-scope-copy";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

const FUNDING_UI_FILES = [
	"src/components/funding/FinanceScopeHelp.tsx",
	"src/components/funding/FundingRetentionClient.tsx",
	"src/components/funding/Form990ExportPanel.tsx",
	"src/components/funding/RestrictionReleasePanel.tsx",
	"src/components/settings/FundsSettingsClient.tsx",
	"src/components/settings/Form990MappingClient.tsx",
];

describe("NPO 4.10 finance help and out-of-lane guards", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[4]?.tasks.find(
		(row) => row.taskCode === "4.10",
	);

	it("is catalogued as finance help copy", () => {
		expect(task?.title).toMatch(/Finance help copy/i);
	});

	it("help text names payroll, 990 e-file, and general ledger", () => {
		const lower = FUNDING_SCOPE_HELP.toLowerCase();
		for (const phrase of FUNDING_OUT_OF_LANE) {
			expect(lower).toContain(phrase);
		}
	});

	it("funding UI does not claim payroll, e-file, or GL posting", () => {
		const forbidden = [
			/\b990 e-file\b/i,
			/\bpayroll system\b/i,
			/\bgeneral ledger posting\b/i,
			/\bwe file form 990\b/i,
		];
		for (const rel of FUNDING_UI_FILES) {
			const source = readFileSync(join(process.cwd(), rel), "utf8");
			for (const pattern of forbidden) {
				expect(source).not.toMatch(pattern);
			}
		}
	});
});
