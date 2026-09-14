import { describe, expect, it } from "vitest";
import {
	buildRenewalObligationsForContract,
	filterRenewalLinkedOpenObligations,
} from "@/lib/funding/obligation-renewal.service";
import type { ContractObligation } from "@/lib/funding/types";

function isoOffset(days: number): string {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() + days);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function makeObligation(
	overrides: Partial<ContractObligation> & { $id: string; title: string },
): ContractObligation {
	return {
		$createdAt: "",
		$updatedAt: "",
		orgId: "org-1",
		contractId: "ctr-1",
		kind: "renewal",
		status: "open",
		renewalLinked: true,
		createdByUserId: "user-1",
		...overrides,
	};
}

describe("filterRenewalLinkedOpenObligations", () => {
	it("keeps renewal-linked open and in-progress items", () => {
		const rows = [
			makeObligation({ $id: "1", title: "Renewal packet", status: "open" }),
			makeObligation({
				$id: "2",
				title: "Reporting only",
				renewalLinked: false,
			}),
			makeObligation({ $id: "3", title: "Done item", status: "done" }),
			makeObligation({
				$id: "4",
				title: "In progress",
				status: "in_progress",
			}),
		];
		const items = filterRenewalLinkedOpenObligations(rows, "ctr-1");
		expect(items.map((row) => row.$id)).toEqual(["1", "4"]);
	});

	it("marks overdue and sorts overdue first", () => {
		const rows = [
			makeObligation({
				$id: "future",
				title: "Future",
				dueDate: isoOffset(10),
			}),
			makeObligation({
				$id: "late",
				title: "Late",
				dueDate: isoOffset(-2),
			}),
		];
		const items = filterRenewalLinkedOpenObligations(rows);
		expect(items[0].$id).toBe("late");
		expect(items[0].isOverdue).toBe(true);
		expect(items[1].$id).toBe("future");
	});

	it("scopes to the contract id when provided", () => {
		const rows = [
			makeObligation({
				$id: "a",
				title: "This contract",
				contractId: "ctr-1",
			}),
			makeObligation({
				$id: "b",
				title: "Other contract",
				contractId: "ctr-2",
			}),
		];
		expect(filterRenewalLinkedOpenObligations(rows, "ctr-1")).toHaveLength(1);
	});
});

describe("buildRenewalObligationsForContract", () => {
	it("returns counts from injected listObligations", async () => {
		const rows: ContractObligation[] = [
			makeObligation({
				$id: "1",
				title: "Overdue packet",
				dueDate: isoOffset(-1),
			}),
			makeObligation({
				$id: "2",
				title: "Open packet",
				dueDate: isoOffset(5),
			}),
			makeObligation({
				$id: "3",
				title: "Not linked",
				renewalLinked: false,
			}),
		];
		const result = await buildRenewalObligationsForContract(
			{ orgId: "org-1", contractId: "ctr-1" },
			{
				listObligations: async () => rows,
			},
		);
		expect(result.openCount).toBe(2);
		expect(result.overdueCount).toBe(1);
		expect(result.items.map((row) => row.$id)).toEqual(["1", "2"]);
	});
});
