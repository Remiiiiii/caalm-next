import { daysUntil } from "./constants";
import { listObligations } from "./obligation.repository";
import type { ContractObligation, ObligationStatus } from "./types";

export const OPEN_OBLIGATION_STATUSES: readonly ObligationStatus[] = [
	"open",
	"in_progress",
	"overdue",
];

const OPEN_STATUS_SET = new Set<string>(OPEN_OBLIGATION_STATUSES);

export type QueueObligation = ContractObligation & { isOverdue: boolean };

export type ObligationQueueInput = {
	orgId: string;
	ownerName?: string;
	overdueOnly?: boolean;
	dueWithinDays?: number;
	search?: string;
	page?: number;
	pageSize?: number;
};

export type ObligationQueueResult = {
	items: QueueObligation[];
	totalItems: number;
	page: number;
	pageSize: number;
	owners: string[];
	summary: { openCount: number; overdueCount: number };
};

export type ObligationQueueDeps = {
	listObligations: typeof listObligations;
};

const defaultDeps: ObligationQueueDeps = {
	listObligations,
};

export function isObligationOpen(
	obligation: Pick<ContractObligation, "status">,
): boolean {
	return OPEN_STATUS_SET.has(obligation.status);
}

export function isObligationOverdue(
	obligation: Pick<ContractObligation, "status" | "dueDate">,
): boolean {
	if (!isObligationOpen(obligation)) return false;
	if (obligation.status === "overdue") return true;
	if (!obligation.dueDate) return false;
	const days = daysUntil(obligation.dueDate);
	return days != null && days < 0;
}

function dueSortValue(dueDate?: string): number {
	if (!dueDate) return Number.POSITIVE_INFINITY;
	const raw = dueDate.split("T")[0];
	const [y, m, d] = raw.split("-").map(Number);
	if (!y || !m || !d) return Number.POSITIVE_INFINITY;
	return new Date(y, m - 1, d).getTime();
}

export function compareObligationQueue(
	a: QueueObligation,
	b: QueueObligation,
): number {
	if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
	const dueDiff = dueSortValue(a.dueDate) - dueSortValue(b.dueDate);
	if (dueDiff !== 0) return dueDiff;
	return a.title.localeCompare(b.title);
}

function matchesDueWindow(
	obligation: QueueObligation,
	dueWithinDays?: number,
): boolean {
	if (dueWithinDays == null) return true;
	if (!obligation.dueDate) return false;
	const days = daysUntil(obligation.dueDate);
	if (days == null) return false;
	return days <= dueWithinDays;
}

function matchesSearch(obligation: QueueObligation, search?: string): boolean {
	const q = search?.trim().toLowerCase();
	if (!q) return true;
	const haystack = [obligation.title, obligation.contractName]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();
	return haystack.includes(q);
}

/**
 * Org-wide open-obligation backlog. Filters/sort/page in memory so overdue
 * (status or past due date) stays consistent with retention health.
 */
export async function buildObligationQueue(
	input: ObligationQueueInput,
	deps: ObligationQueueDeps = defaultDeps,
): Promise<ObligationQueueResult> {
	const pageSize = Math.max(1, Math.min(input.pageSize ?? 20, 100));
	const page = Math.max(1, input.page ?? 1);
	const ownerName = input.ownerName?.trim();

	const rows = await deps.listObligations({
		orgId: input.orgId,
		limit: 1000,
	});

	const open = rows.filter(isObligationOpen).map((row) => ({
		...row,
		isOverdue: isObligationOverdue(row),
	}));

	const owners = Array.from(
		new Set(
			open
				.map((row) => row.ownerName?.trim())
				.filter((name): name is string => Boolean(name)),
		),
	).sort((a, b) => a.localeCompare(b));

	const filtered = open.filter((row) => {
		if (ownerName && (row.ownerName?.trim() || "") !== ownerName) {
			return false;
		}
		if (input.overdueOnly && !row.isOverdue) return false;
		if (!matchesDueWindow(row, input.dueWithinDays)) return false;
		if (!matchesSearch(row, input.search)) return false;
		return true;
	});

	filtered.sort(compareObligationQueue);

	const start = (page - 1) * pageSize;
	const items = filtered.slice(start, start + pageSize);

	return {
		items,
		totalItems: filtered.length,
		page,
		pageSize,
		owners,
		summary: {
			openCount: open.length,
			overdueCount: open.filter((row) => row.isOverdue).length,
		},
	};
}
