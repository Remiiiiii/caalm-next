import { describe, expect, it } from "vitest";
import { readImportPayload } from "@/lib/import/http";
import {
	parseCsvText,
	parseSpreadsheetFile,
	parseXlsxArrayBuffer,
} from "@/lib/import/spreadsheet";

describe("spreadsheet import parser", () => {
	it("parses CSV text into headers and rows", () => {
		const parsed = parseCsvText("name,amount\nAnnual,100\n");
		expect(parsed.headers).toEqual(["name", "amount"]);
		expect(parsed.rows).toEqual([{ name: "Annual", amount: "100" }]);
	});

	it("parses an xlsx first sheet", async () => {
		const XLSX = await import("xlsx");
		const workbook = XLSX.utils.book_new();
		const sheet = XLSX.utils.aoa_to_sheet([
			["name", "goal"],
			["Annual appeal", "150000"],
		]);
		XLSX.utils.book_append_sheet(workbook, sheet, "Campaigns");
		const buffer = XLSX.write(workbook, {
			bookType: "xlsx",
			type: "array",
		}) as ArrayBuffer;
		const parsed = await parseXlsxArrayBuffer(buffer);
		expect(parsed.headers).toEqual(["name", "goal"]);
		expect(parsed.rows[0]).toEqual({ name: "Annual appeal", goal: "150000" });
	});

	it("rejects an empty sheet", async () => {
		const XLSX = await import("xlsx");
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), "Empty");
		const buffer = XLSX.write(workbook, {
			bookType: "xlsx",
			type: "array",
		}) as ArrayBuffer;
		await expect(parseXlsxArrayBuffer(buffer)).rejects.toThrow(/empty/i);
	});

	it("parses a CSV File through parseSpreadsheetFile", async () => {
		const file = {
			name: "people.csv",
			type: "text/csv",
			text: async () => "email,name\npat@example.org,Pat\n",
		} as File;
		const parsed = await parseSpreadsheetFile(file);
		expect(parsed.rows).toHaveLength(1);
		expect(parsed.rows[0]?.email).toBe("pat@example.org");
	});

	it("caps import payloads at 500 rows", () => {
		const rows = Array.from({ length: 501 }, () => ({ name: "x" }));
		const parsed = readImportPayload({ rows, mapping: {} });
		expect(parsed.ok).toBe(false);
		if (!parsed.ok) expect(parsed.status).toBe(400);
	});
});
