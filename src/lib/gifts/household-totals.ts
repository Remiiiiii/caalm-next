/**
 * Household reporting: soft credits add recognition, not cash.
 * Cash is counted once on the hard-credit gift only.
 */
export function householdGiftTotals(input: {
	hardGiftAmount: number;
	softCreditAmounts: number[];
}): { cashTotal: number; recognitionTotal: number } {
	const softSum = input.softCreditAmounts.reduce((s, n) => s + n, 0);
	return {
		cashTotal: input.hardGiftAmount,
		recognitionTotal: input.hardGiftAmount + softSum,
	};
}
