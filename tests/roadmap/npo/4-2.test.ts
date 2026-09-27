import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	assertGrantFundIdOnSave,
	GrantFundValidationError,
} from "@/lib/funding/grant-fund";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 4.2 require fundId on grant contracts", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[4]?.tasks.find(
		(row) => row.taskCode === "4.2",
	);

	it("is catalogued as fundId on grants", () => {
		expect(task?.title).toMatch(/fundId on grant/i);
	});

	it("returns 400 when grant save lacks fundId", () => {
		expect(() =>
			assertGrantFundIdOnSave({
				contractType: "Grant_Agreement",
				fundId: "",
			}),
		).toThrow(GrantFundValidationError);
	});

	it("does not require fundId on non-grant contracts", () => {
		expect(() =>
			assertGrantFundIdOnSave({
				contractType: "Service_Agreement",
				fundId: "",
			}),
		).not.toThrow();
	});

	it("validates on contract upload save path", () => {
		const source = readFileSync(
			join(process.cwd(), "src/lib/actions/file.actions.ts"),
			"utf8",
		);
		expect(source).toMatch(/assertGrantFundIdOnSave/);
	});
});
