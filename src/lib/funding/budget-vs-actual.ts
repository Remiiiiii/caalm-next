import type { GrantBudgetCategory, GrantBudgetLine } from "./grant-budget.types";

export type BudgetVsActualGiftRow = {
	amount: number;
	status: string;
	voidOfId?: string;
};

export type BudgetVsActualObligationRow = {
	status: string;
	kind: string;
	actualAmount?: number | null;
	budgetCategory?: GrantBudgetCategory | null;
};

export type BudgetVsActualLineResult = {
	lineId: string;
	category: GrantBudgetCategory;
	budgetAmount: number;
	actualAmount: number;
	overBudget: boolean;
};

export type BudgetVsActualResult = {
	lines: BudgetVsActualLineResult[];
	totalBudget: number;
	totalActual: number;
	giftActual: number;
	obligationActual: number;
};

function isCountableGift(gift: BudgetVsActualGiftRow): boolean {
	if (gift.status === "voided") return false;
	if (gift.voidOfId) return false;
	return gift.amount > 0;
}

function obligationCategory(
	obligation: BudgetVsActualObligationRow,
): GrantBudgetCategory {
	if (obligation.budgetCategory) return obligation.budgetCategory;
	if (obligation.kind === "payment") return "admin";
	if (obligation.kind === "renewal" || obligation.kind === "compliance") {
		return "admin";
	}
	return "program";
}

/** Pure budget vs actual — no clock reads, no I/O. */
export function budgetVsActual(input: {
	budgetLines: Pick<
		GrantBudgetLine,
		"$id" | "category" | "amount"
	>[];
	obligations: BudgetVsActualObligationRow[];
	gifts: BudgetVsActualGiftRow[];
}): BudgetVsActualResult {
	const giftActual = input.gifts
		.filter(isCountableGift)
		.reduce((sum, g) => sum + g.amount, 0);

	let obligationActual = 0;
	const actualByCategory = new Map<GrantBudgetCategory, number>();

	for (const obligation of input.obligations) {
		if (obligation.status === "waived") continue;
		if (obligation.status !== "done") continue;
		const amount = Number(obligation.actualAmount ?? 0);
		if (!Number.isFinite(amount) || amount <= 0) continue;
		obligationActual += amount;
		const cat = obligationCategory(obligation);
		actualByCategory.set(cat, (actualByCategory.get(cat) ?? 0) + amount);
	}

	// Posted gift cash counts toward program services by default (ASC 958 narrative).
	actualByCategory.set(
		"program",
		(actualByCategory.get("program") ?? 0) + giftActual,
	);

	const budgetTotalByCategory = new Map<GrantBudgetCategory, number>();
	for (const line of input.budgetLines) {
		budgetTotalByCategory.set(
			line.category,
			(budgetTotalByCategory.get(line.category) ?? 0) + line.amount,
		);
	}

	const lines: BudgetVsActualLineResult[] = input.budgetLines.map((line) => {
		const budgetAmount = line.amount;
		const categoryBudget = budgetTotalByCategory.get(line.category) ?? 0;
		const categoryActual = actualByCategory.get(line.category) ?? 0;
		const actualAmount =
			categoryBudget > 0
				? (categoryActual * budgetAmount) / categoryBudget
				: 0;
		return {
			lineId: line.$id,
			category: line.category,
			budgetAmount,
			actualAmount: Math.round(actualAmount * 100) / 100,
			overBudget: actualAmount > budgetAmount,
		};
	});

	const totalBudget = lines.reduce((sum, l) => sum + l.budgetAmount, 0);
	const totalActual = giftActual + obligationActual;

	return {
		lines,
		totalBudget,
		totalActual,
		giftActual,
		obligationActual,
	};
}
