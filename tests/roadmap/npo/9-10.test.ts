import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 9.10 Finance export help copy", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[9]?.tasks.find(
		(row) => row.taskCode === "9.10",
	);

	it("is catalogued as finance export help copy", () => {
		expect(task?.title).toMatch(/Finance export help copy/i);
	});

	it("dialog copy does not claim live Intacct or QuickBooks connector", () => {
		const dialog = readFileSync(
			join(process.cwd(), "src/components/funding/JournalExportDialog.tsx"),
			"utf8",
		);
		expect(dialog).toMatch(/journal feed/i);
		expect(dialog).toMatch(/CSV or IIF download only/i);
		expect(dialog).toMatch(/not a two-way sync/i);
		expect(dialog).not.toMatch(/integrates with Intacct/i);
		expect(dialog).not.toMatch(/QuickBooks Online sync/i);
		expect(dialog).not.toMatch(/live connector/i);
	});
});
