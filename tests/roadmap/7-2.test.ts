import { describe, expect, it } from "vitest";
import {
	diffParagraphs,
	hasDiffChanges,
} from "@/lib/contracts/negotiation/diff.service";

describe("roadmap task 7.2 document versioning + diff", () => {
	it("renders changes for two seeded versions", () => {
		const v1 =
			"Payment is due in 30 days.\n\nThe vendor shall keep records for one year.";
		const v2 =
			"Payment is due in 45 days.\n\nThe vendor shall keep records for one year.";
		const rows = diffParagraphs(v1, v2);
		expect(hasDiffChanges(rows)).toBe(true);
		expect(
			rows.some((row) => row.kind === "remove" && /30 days/.test(row.text)),
		).toBe(true);
		expect(
			rows.some((row) => row.kind === "add" && /45 days/.test(row.text)),
		).toBe(true);
		expect(
			rows.some((row) => row.kind === "equal" && /one year/.test(row.text)),
		).toBe(true);
	});
});
