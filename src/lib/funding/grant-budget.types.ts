export const GRANT_BUDGET_CATEGORIES = [
	"personnel",
	"program",
	"admin",
	"other",
] as const;

export type GrantBudgetCategory = (typeof GRANT_BUDGET_CATEGORIES)[number];

export type GrantBudgetLine = {
	$id: string;
	orgId: string;
	contractId: string;
	category: GrantBudgetCategory;
	amount: number;
	periodStart: string;
	periodEnd: string;
	label?: string;
};
