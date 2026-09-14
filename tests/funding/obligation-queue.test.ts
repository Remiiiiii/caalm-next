import { describe, expect, it } from "vitest";
import { daysUntil } from "@/lib/funding/constants";
import {
	buildObligationQueue,
	compareObligationQueue,
	isObligationOpen,
	isObligationOverdue,
	type ObligationQueueDeps,
	type QueueObligation,
} from "@/lib/funding/obligation-queue.service";
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
		contractName: "Grant 2026",
		kind: "reporting",
		status: "open",
		renewalLinked: false,
		createdByUserId: "user-1",
		...overrides,
	};
}

function asQueue(row: ContractObligation): QueueObligation {
	return { ...row, isOverdue: isObligationOverdue(row) };
}

describe("isObligationOpen", () => {
	it("keeps open, in progress, and overdue", () => {
		expect(isObligationOpen({ status: "open" })).toBe(true);
		expect(isObligationOpen({ status: "in_progress" })).toBe(true);
		expect(isObligationOpen({ status: "overdue" })).toBe(true);
	});

	it("excludes done and waived", () => {
		expect(isObligationOpen({ status: "done" })).toBe(false);
		expect(isObligationOpen({ status: "waived" })).toBe(false);
	});
});

describe("isObligationOverdue", () => {
	it("is overdue when status is overdue", () => {
		expect(
			isObligationOverdue({ status: "overdue", dueDate: isoOffset(10) }),
		).toBe(true);
	});

	it("is overdue when open and the due date is in the past", () => {
		expect(
			isObligationOverdue({ status: "open", dueDate: isoOffset(-2) }),
		).toBe(true);
		expect(daysUntil(isoOffset(-2))).toBeLessThan(0);
	});

	it("is not overdue when done even if the due date passed", () => {
		expect(
			isObligationOverdue({ status: "done", dueDate: isoOffset(-10) }),
		).toBe(false);
	});

	it("is not overdue when open with a future due date", () => {
		expect(isObligationOverdue({ status: "open", dueDate: isoOffset(5) })).toBe(
			false,
		);
	});
});

describe("compareObligationQueue", () => {
	it("puts overdue items first", () => {
		const late = asQueue(
			makeObligation({
				$id: "a",
				title: "Late report",
				dueDate: isoOffset(-1),
			}),
		);
		const soon = asQueue(
			makeObligation({
				$id: "b",
				title: "Soon report",
				dueDate: isoOffset(3),
			}),
		);
		expect(compareObligationQueue(late, soon)).toBeLessThan(0);
		expect(compareObligationQueue(soon, late)).toBeGreaterThan(0);
	});

	it("sorts earlier due dates before later ones", () => {
		const first = asQueue(
			makeObligation({ $id: "a", title: "First", dueDate: isoOffset(2) }),
		);
		const second = asQueue(
			makeObligation({ $id: "b", title: "Second", dueDate: isoOffset(8) }),
		);
		expect(compareObligationQueue(first, second)).toBeLessThan(0);
	});
});

describe("buildObligationQueue", () => {
	const rows: ContractObligation[] = [
		makeObligation({
			$id: "1",
			title: "File quarterly report",
			ownerName: "Jordan Lee",
			dueDate: isoOffset(-3),
		}),
		makeObligation({
			$id: "2",
			title: "Send invoice",
			ownerName: "Alex Kim",
			dueDate: isoOffset(5),
			kind: "payment",
		}),
		makeObligation({
			$id: "3",
			title: "Done checklist",
			status: "done",
			ownerName: "Jordan Lee",
			dueDate: isoOffset(-1),
		}),
		makeObligation({
			$id: "4",
			title: "Far-out deliverable",
			ownerName: "Jordan Lee",
			dueDate: isoOffset(60),
			kind: "deliverable",
		}),
	];

	const deps: ObligationQueueDeps = {
		listObligations: async () => rows,
	};

	it("filters by owner and excludes done items", async () => {
		const result = await buildObligationQueue(
			{ orgId: "org-1", ownerName: "Jordan Lee" },
			deps,
		);
		expect(result.items.map((item) => item.$id)).toEqual(["1", "4"]);
		expect(result.owners).toEqual(["Alex Kim", "Jordan Lee"]);
		expect(result.summary).toEqual({ openCount: 3, overdueCount: 1 });
	});

	it("filters overdue only", async () => {
		const result = await buildObligationQueue(
			{ orgId: "org-1", overdueOnly: true },
			deps,
		);
		expect(result.items).toHaveLength(1);
		expect(result.items[0].$id).toBe("1");
		expect(result.items[0].isOverdue).toBe(true);
	});

	it("filters due-within window and paginates totals", async () => {
		const page1 = await buildObligationQueue(
			{ orgId: "org-1", dueWithinDays: 10, page: 1, pageSize: 1 },
			deps,
		);
		expect(page1.totalItems).toBe(2);
		expect(page1.items).toHaveLength(1);
		expect(page1.items[0].$id).toBe("1");

		const page2 = await buildObligationQueue(
			{ orgId: "org-1", dueWithinDays: 10, page: 2, pageSize: 1 },
			deps,
		);
		expect(page2.items[0].$id).toBe("2");
	});
});
