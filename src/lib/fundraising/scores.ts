import type { RfmFeatures } from "./rfm";

export type ScoreFeatureWeight = {
	label: string;
	weight: number;
	direction: "increases_risk" | "decreases_risk";
};

export type LapseRiskScore = {
	score: number;
	featureWeights: ScoreFeatureWeight[];
	topFeatures: ScoreFeatureWeight[];
};

function clamp(n: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, n));
}

/** Transparent 0–100 lapse risk from RFM features (no ML). */
export function computeLapseRiskScore(features: RfmFeatures): LapseRiskScore {
	const weights: ScoreFeatureWeight[] = [];

	if (features.recencyDays != null) {
		const recencyWeight = clamp(features.recencyDays / 3, 0, 45);
		weights.push({
			label: `${features.recencyDays} days since last gift`,
			weight: recencyWeight,
			direction: "increases_risk",
		});
	} else {
		weights.push({
			label: "No posted gifts on file",
			weight: 40,
			direction: "increases_risk",
		});
	}

	if (features.streakMonths <= 1) {
		weights.push({
			label: "Monthly giving streak broken",
			weight: 20,
			direction: "increases_risk",
		});
	} else {
		weights.push({
			label: `${features.streakMonths}-month giving streak`,
			weight: Math.min(features.streakMonths * 2, 15),
			direction: "decreases_risk",
		});
	}

	if (features.giftTrend < 0) {
		weights.push({
			label: "Gift amount trending down",
			weight: 15,
			direction: "increases_risk",
		});
	} else if (features.giftTrend > 0) {
		weights.push({
			label: "Gift amount trending up",
			weight: 10,
			direction: "decreases_risk",
		});
	}

	let score = 35;
	for (const row of weights) {
		if (row.direction === "increases_risk") score += row.weight;
		else score -= row.weight;
	}
	score = clamp(Math.round(score), 0, 100);

	const topFeatures = [...weights]
		.sort((a, b) => b.weight - a.weight)
		.slice(0, 3);

	return { score, featureWeights: weights, topFeatures };
}
