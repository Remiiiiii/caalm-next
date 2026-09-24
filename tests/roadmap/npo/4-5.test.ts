import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { budgetVsActual } from "@/lib/funding/budget-vs-actual";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 4.5 budget vs actual", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[4]?.tasks.find(
		(row) => row.taskCode === "4.5",
	);

	it("is catalogued as budget vs actual", () => {
		expect(task?.title).toMatch(/Budget vs actual/i);
	});

	it("excludes waived obligations from actuals", () => {
		const result = budgetVsActual({
			budgetLines: [
				{ $id: "line-1", category: "admin", amount: 10_000 },
			],
			obligations: [
				{ status: "done", kind: "payment", actualAmount: 2000 },
				{ status: "waived", kind: "payment", actualAmount: 9000 },
			],
			gifts: [],
		});
		expect(result.obligationActual).toBe(2000);
	});

	it("excludes voided gifts from actuals", () => {
		const result = budgetVsActual({
			budgetLines: [
				{ $id: "line-1", category: "program", amount: 5000 },
			],
			obligations: [],
			gifts: [
				{ amount: 1000, status: "posted" },
				{ amount: 500, status: "posted", voidOfId: "void-1" },
				{ amount: 300, status: "voided" },
			],
		});
		expect(result.giftActual).toBe(1000);
	});

	it("does not call Date.now in calculator module", () => {
		const source = readFileSync(
			join(process.cwd(), "src/lib/funding/budget-vs-actual.ts"),
			"utf8",
		);
		expect(source).not.toMatch(/Date\.now\(/);
	});

	it("shows over-budget badge classes in grant panel", () => {
		const panel = readFileSync(
			join(process.cwd(), "src/components/funding/GrantBudgetPanel.tsx"),
			"utf8",
		);
		expect(panel).toMatch(/bg-red\/10 text-red border-red\/20/);
		expect(panel).toMatch(/bg-green\/10 text-green border-green\/20/);
	});
});
