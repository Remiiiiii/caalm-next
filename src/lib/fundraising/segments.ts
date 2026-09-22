import type { LifecycleSegment } from "./constants";
import type { RfmFeatures } from "./rfm";

const NEW_DONOR_MAX_DAYS = 90;

/** Map RFM features to a stored lifecycle bucket (deterministic). */
export function classifyLifecycleSegment(
	features: RfmFeatures,
	lapseDays: number,
): LifecycleSegment {
	const recency = features.recencyDays;

	if (features.frequency === 0 || recency == null) {
		return "Lost";
	}

	if (recency > lapseDays * 1.5) {
		return "Lost";
	}
	if (recency > lapseDays) {
		return "Lapsed";
	}

	if (features.frequency === 1 && recency <= NEW_DONOR_MAX_DAYS) {
		return "New";
	}

	if (features.giftTrend < 0 || recency > lapseDays * 0.75) {
		return "At-risk";
	}

	if (features.monetary >= 1000 && features.frequency >= 3 && recency <= 120) {
		return "Champion";
	}

	return "Loyal";
}
