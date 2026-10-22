import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { riskAvertedRegisterXlsx } from "@/lib/dashboard/risk-averted-xlsx";
import type { RiskImpactEvent } from "@/lib/dashboard/risk-impact.types";

const event = (over: Partial<RiskImpactEvent>): RiskImpactEvent => ({
	id: "1",
	date: "2026-09-20T12:00:00Z",
	kind: "flag",
	recordName: "Grant & Co <A>",
	href: "/contracts",
	dollars: 100,
	dollarsFormatted: "$100",
	source: "Contract audit",
	countedTowardTotal: true,
	...over,
});

describe("riskAvertedRegisterXlsx", () => {
	const bytes = riskAvertedRegisterXlsx({
		events: [
			event({}),
			event({ id: "2", dollars: 0, countedTowardTotal: false }),
		],
		periodLabel: "2026 year to date",
		generatedAt: new Date("2026-10-19T16:31:00Z"),
	});
	const sheet = XLSX.read(bytes, { type: "array" }).Sheets["Risk Averted"];

	it("is a readable workbook with title, escaped text and serial dates", () => {
		expect(sheet.A1.v).toBe("Risk Averted Register — 2026 year to date");
		expect(sheet.C5.v).toBe("Grant & Co <A>");
		expect(XLSX.SSF.format("yyyy-mm-dd", sheet.A5.v)).toBe("2026-09-20");
	});

	it("totals counted dollars and labels duplicates", () => {
		expect(sheet.E7.v).toBe(100);
		expect(sheet.F6.v).toBe("Duplicate · not counted");
		expect(sheet.F7.v).toBe("1 of 2 events");
	});
});
