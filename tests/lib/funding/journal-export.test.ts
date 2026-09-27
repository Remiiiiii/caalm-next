import { describe, expect, it } from "vitest";
import { journalExportToCsv } from "@/lib/funding/journal-export/format-csv";
import type { JournalExportResult } from "@/lib/funding/journal-export/types";

describe("journal export formatting", () => {
	it("gift cash total excludes reclass legs", () => {
		const result: JournalExportResult = {
			startDate: "2026-01-01",
			endDate: "2026-01-31",
			giftRowCount: 2,
			reclassReleaseCount: 1,
			giftCashTotal: 150,
			rows: [
				{
					rowKind: "gift",
					sourceId: "g1",
					transactionDate: "2026-01-05",
					fundCode: "UNRESTRICTED",
					amount: 100,
					restrictionClass: "unrestricted",
					memo: "Posted gift",
				},
				{
					rowKind: "gift",
					sourceId: "g2",
					transactionDate: "2026-01-10",
					fundCode: "GRANT-A",
					amount: 50,
					restrictionClass: "restricted",
					memo: "Posted gift",
				},
				{
					rowKind: "reclass",
					sourceId: "r1",
					transactionDate: "2026-01-15",
					fundCode: "GRANT-A",
					amount: -25,
					restrictionClass: "restricted",
					reclassLeg: "from",
					memo: "Release",
				},
				{
					rowKind: "reclass",
					sourceId: "r1",
					transactionDate: "2026-01-15",
					fundCode: "UNRESTRICTED",
					amount: 25,
					restrictionClass: "unrestricted",
					reclassLeg: "to",
					memo: "Release",
				},
			],
		};
		const giftSum = result.rows
			.filter((r) => r.rowKind === "gift")
			.reduce((s, r) => s + r.amount, 0);
		expect(giftSum).toBe(result.giftCashTotal);
		const csv = journalExportToCsv(result);
		expect(csv).toContain("restriction_class");
		expect(csv).toContain("restricted");
		expect(csv).toContain("reclass");
	});
});
