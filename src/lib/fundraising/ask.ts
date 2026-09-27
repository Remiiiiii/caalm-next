import type { RfmGiftRow } from "./rfm";

function isCountableGift(gift: RfmGiftRow): boolean {
	if (gift.status === "voided") return false;
	if (gift.voidOfId) return false;
	return gift.amount > 0;
}

function median(values: number[]): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 0) {
		return (sorted[mid - 1] + sorted[mid]) / 2;
	}
	return sorted[mid];
}

/** Upgrade factor from 0–100 readiness: 1.0 at 0, up to 1.25 at 100. */
export function upgradeFactorFromReadiness(upgradeReadinessScore: number): number {
	const clamped = Math.min(100, Math.max(0, upgradeReadinessScore));
	return 1 + (clamped / 100) * 0.25;
}

export type SuggestedAskResult = {
	suggestedAsk: number | null;
	baseAmount: number | null;
	upgradeFactor: number;
	cappedByCapacity: boolean;
};

/**
 * Ask = max(last gift, median of last 3) × upgrade factor, capped by capacityBand.
 * Returns null suggested ask when the constituent has no countable gifts.
 */
export function computeSuggestedAsk(input: {
	gifts: RfmGiftRow[];
	upgradeReadinessScore: number;
	capacityBand?: number | null;
}): SuggestedAskResult {
	const countable = input.gifts
		.filter(isCountableGift)
		.sort(
			(a, b) =>
				new Date(b.giftDate).getTime() - new Date(a.giftDate).getTime(),
		);
	if (countable.length === 0) {
		return {
			suggestedAsk: null,
			baseAmount: null,
			upgradeFactor: upgradeFactorFromReadiness(input.upgradeReadinessScore),
			cappedByCapacity: false,
		};
	}

	const amounts = countable.map((g) => g.amount);
	const last = amounts[0];
	const medianLast3 = median(amounts.slice(0, 3));
	const baseAmount = Math.max(last, medianLast3);
	const upgradeFactor = upgradeFactorFromReadiness(input.upgradeReadinessScore);
	let ask = baseAmount * upgradeFactor;
	let cappedByCapacity = false;
	if (
		input.capacityBand != null &&
		Number.isFinite(input.capacityBand) &&
		input.capacityBand > 0 &&
		ask > input.capacityBand
	) {
		ask = input.capacityBand;
		cappedByCapacity = true;
	}
	return {
		suggestedAsk: Math.round(ask * 100) / 100,
		baseAmount,
		upgradeFactor,
		cappedByCapacity,
	};
}
