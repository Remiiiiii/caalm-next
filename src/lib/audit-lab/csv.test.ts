import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
	it("escapes commas and quotes", () => {
		const csv = toCsv(["name", "note"], [
			{ name: "Finance", note: 'said "ok", then left' },
		]);
		expect(csv).toContain('"said ""ok"", then left"');
	});
});