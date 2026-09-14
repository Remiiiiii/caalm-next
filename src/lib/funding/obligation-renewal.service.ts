import { listObligations } from "./obligation.repository";
import {
	compareObligationQueue,
	isObligationOpen,
	isObligationOverdue,
} from "./obligation-queue.service";
import type { ContractObligation } from "./types";

export type RenewalObligationItem = ContractObligation & { isOverdue: boolean };

export type RenewalObligationsResult = {
	items: RenewalObligationItem[];
	openCount: number;
	overdueCount: number;
};

export type RenewalObligationDeps = {
	listObligations: typeof listObligations;
};

const defaultDeps: RenewalObligationDeps = {
	listObligations,
};

/** Open or overdue obligations flagged for renewal work on this contract. */
export function filterRenewalLinkedOpenObligations(
	obligations: ContractObligation[],
	contractId?: string,
): RenewalObligationItem[] {
	const items = obligations
		.filter((row) => {
			if (contractId && row.contractId !== contractId) return false;
			if (!row.renewalLinked) return false;
			return isObligationOpen(row);
		})
		.map((row) => ({
			...row,
			isOverdue: isObligationOverdue(row),
		}));

	items.sort((a, b) => compareObligationQueue(a, b));
	return items;
}

export async function buildRenewalObligationsForContract(
	input: { orgId: string; contractId: string },
	deps: RenewalObligationDeps = defaultDeps,
): Promise<RenewalObligationsResult> {
	const rows = await deps.listObligations({
		orgId: input.orgId,
		contractId: input.contractId,
		limit: 500,
	});
	const items = filterRenewalLinkedOpenObligations(rows, input.contractId);
	return {
		items,
		openCount: items.length,
		overdueCount: items.filter((row) => row.isOverdue).length,
	};
}
