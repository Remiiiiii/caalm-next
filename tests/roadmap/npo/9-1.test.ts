import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listUnknownCsvHeaders } from "@/lib/constituents/import/fields";
import { parseCsvText } from "@/lib/constituents/import/csv";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 9.1 CSV mapper UI", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[9]?.tasks.find(
		(row) => row.taskCode === "9.1",
	);

	it("is catalogued as CSV mapper UI", () => {
		expect(task?.title).toMatch(/CSV mapper UI/i);
	});

	it("lists unknown columns instead of dropping them silently", () => {
		const unknown = listUnknownCsvHeaders(["Email", "Extra"], {
			Email: "email",
			Extra: "",
		});
		expect(unknown).toEqual(["Extra"]);
	});

	it("parses CSV client-side on the import page", () => {
		const client = readFileSync(
			join(
				process.cwd(),
				"src/app/(root)/constituents/import/ConstituentsImportClient.tsx",
			),
			"utf8",
		);
		expect(client).toMatch(/parseCsvText/);
		expect(client).toMatch(/parsed locally/i);
		const parsed = parseCsvText("firstName,lastName\nPat,Lee\n");
		expect(parsed.rows[0]?.firstName).toBe("Pat");
	});
});
