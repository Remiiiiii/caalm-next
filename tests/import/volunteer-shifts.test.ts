import { describe, expect, it } from "vitest";
import { guessVolunteerShiftImportField } from "@/lib/volunteers/import/fields";
import { applyVolunteerShiftColumnMapping } from "@/lib/volunteers/import/parse";

describe("volunteer shift import mapping", () => {
	it("guesses shift headers", () => {
		expect(guessVolunteerShiftImportField("start_date")).toBe("startDate");
		expect(guessVolunteerShiftImportField("shift_capacity")).toBe(
			"shiftCapacity",
		);
	});

	it("defaults capacity to 1 and rejects missing titles", () => {
		const { valid, errors } = applyVolunteerShiftColumnMapping(
			[
				{ title: "Front desk", start_date: "2026-05-01" },
				{ title: "", start_date: "2026-05-01" },
			],
			{ title: "title", start_date: "startDate" },
		);
		expect(valid).toHaveLength(1);
		expect(valid[0]?.shiftCapacity).toBe(1);
		expect(errors).toHaveLength(1);
	});
});
