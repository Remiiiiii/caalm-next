import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 9.9 Import/export audit log", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[9]?.tasks.find(
		(row) => row.taskCode === "9.9",
	);

	it("is catalogued as import/export audit log", () => {
		expect(task?.title).toMatch(/Import\/export audit log/i);
	});

	it("logs import commit with counts metadata only", () => {
		const route = readFileSync(
			join(
				process.cwd(),
				"src/app/api/constituents/import/commit/route.ts",
			),
			"utf8",
		);
		expect(route).toMatch(/logAuditEvent/);
		expect(route).toMatch(/counts: result\.counts/);
		expect(route).not.toMatch(/metadata:[\s\S]*email:/i);
	});

	it("logs journal export with date range and row count", () => {
		const route = readFileSync(
			join(process.cwd(), "src/app/api/funding/journal-export/route.ts"),
			"utf8",
		);
		expect(route).toMatch(/logAuditEvent/);
		expect(route).toMatch(/startDate/);
		expect(route).toMatch(/endDate/);
		expect(route).toMatch(/rowCount/);
	});
});
