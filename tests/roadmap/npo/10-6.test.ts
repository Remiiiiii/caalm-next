import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	evaluateNpoPackagingGate,
	NPO_PACKAGING_SCAN_ROOTS,
} from "@/lib/roadmap/nonprofit/npo-packaging-gate";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 10.6 Packaging grep for banned NPO claims", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[10]?.tasks.find(
		(row) => row.taskCode === "10.6",
	);

	it("is catalogued", () => {
		expect(task?.title).toMatch(/Packaging grep/i);
	});

	it("scans landing and docs roots", () => {
		expect(NPO_PACKAGING_SCAN_ROOTS).toContain("src/components/landing");
		expect(NPO_PACKAGING_SCAN_ROOTS).toContain("src/content/docs");
	});

	it("flags real claims but not disclaimers", () => {
		const cwd = mkdtempSync(join(tmpdir(), "npo-gate-"));
		const docs = join(cwd, "src/content/docs");
		mkdirSync(docs, { recursive: true });
		writeFileSync(
			join(docs, "claims.md"),
			[
				"CAALM includes 990 e-file for every org.",
				"Run payroll system sync.",
			].join("\n"),
		);
		writeFileSync(
			join(docs, "disclaimers.md"),
			[
				"It is **not** payroll, **not** a ledger, and does **not** offer **990 e-file**.",
				"Worksheet mapping (not payroll, GL, or 990 e-file).",
				"## What CAALM does not ship",
				"- 990 e-file",
			].join("\n"),
		);
		const files = new Set(
			evaluateNpoPackagingGate(cwd).bannedViolations.map((v) => v.file),
		);
		expect(files.size).toBe(1);
		expect([...files][0]).toMatch(/claims\.md$/);
	});

	it("packaging gate is green (no banned marketing claims)", () => {
		const gate = evaluateNpoPackagingGate();
		expect(gate.bannedViolations).toEqual([]);
	});
});
