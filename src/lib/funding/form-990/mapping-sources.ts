import { GRANT_BUDGET_CATEGORIES } from "@/lib/funding/grant-budget.types";
import { OBLIGATION_KINDS } from "@/lib/funding/types";

/** Known category keys finance can map to 990 Part IX worksheet buckets. */
export const FORM_990_KNOWN_SOURCES: {
	sourceType: "obligation_kind" | "budget_category" | "gift";
	sourceKey: string;
	label: string;
}[] = [
	...OBLIGATION_KINDS.map((kind) => ({
		sourceType: "obligation_kind" as const,
		sourceKey: kind,
		label: `Obligation: ${kind.replace(/_/g, " ")}`,
	})),
	...GRANT_BUDGET_CATEGORIES.map((category) => ({
		sourceType: "budget_category" as const,
		sourceKey: category,
		label: `Budget line: ${category}`,
	})),
	{
		sourceType: "gift",
		sourceKey: "gift_cash",
		label: "Posted gift (cash)",
	},
];

export function mappingLookupKey(
	sourceType: string,
	sourceKey: string,
): string {
	return `${sourceType}:${sourceKey}`;
}
