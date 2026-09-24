import type { LifecycleSegment } from "./constants";

export type NextBestActionKind = "thank" | "call" | "invite" | "ask";

export type NextBestActionInput = {
	segment: LifecycleSegment;
	lapseRiskScore: number;
	daysSinceLastGift: number | null;
	suggestedAskAmount: number | null;
	hasOpenPledgeInstallment: boolean;
	hasUpcomingPublicEvent: boolean;
	daysSinceLastPostedGift: number | null;
	lastPostedGiftAmount: number | null;
	thankYouThreshold: number;
	hasThankInteractionWithin7Days: boolean;
	inviteEligibleCampaignEvent: boolean;
};

export type NextBestAction = {
	kind: NextBestActionKind;
	title: string;
	rationale: string;
};

const ASK_SEGMENTS: LifecycleSegment[] = ["Champion", "Loyal", "New"];

/** Rule table — unit-tested fixtures; UI reads the primary action only. */
export function computeNextBestActions(
	input: NextBestActionInput,
): NextBestAction[] {
	const actions: NextBestAction[] = [];

	const giftAmount = input.lastPostedGiftAmount ?? 0;
	if (
		giftAmount >= input.thankYouThreshold &&
		!input.hasThankInteractionWithin7Days &&
		input.daysSinceLastPostedGift != null
	) {
		actions.push({
			kind: "thank",
			title: "Send thank-you",
			rationale:
				"Posted gift meets your thank threshold with no thank-you logged in seven days.",
		});
	}

	if (input.hasOpenPledgeInstallment) {
		actions.push({
			kind: "call",
			title: "Call about pledge",
			rationale: "An installment is still open on an active pledge.",
		});
	}

	if (
		(input.segment === "At-risk" || input.segment === "Lapsed") &&
		input.lapseRiskScore >= 55
	) {
		actions.push({
			kind: "call",
			title: "Stewardship call",
			rationale: "Lapse risk is elevated for this segment.",
		});
	}

	if (input.inviteEligibleCampaignEvent) {
		actions.push({
			kind: "invite",
			title: "Invite to campaign event",
			rationale:
				"An upcoming campaign event has no registration on file for this donor.",
		});
	}

	if (
		input.suggestedAskAmount != null &&
		input.suggestedAskAmount > 0 &&
		ASK_SEGMENTS.includes(input.segment)
	) {
		actions.push({
			kind: "ask",
			title: "Discuss next gift",
			rationale: "Scores support a concrete ask amount.",
		});
	}

	return actions.filter(
		(action) =>
			action.kind !== "ask" || input.suggestedAskAmount != null,
	);
}

export function applyDismissedKinds(
	actions: NextBestAction[],
	dismissedKinds: ReadonlySet<NextBestActionKind>,
): NextBestAction[] {
	return actions.filter((action) => !dismissedKinds.has(action.kind));
}

export function pickPrimaryNextBestAction(
	input: NextBestActionInput,
	dismissedKinds: ReadonlySet<NextBestActionKind> = new Set(),
): NextBestAction | null {
	const actions = applyDismissedKinds(
		computeNextBestActions(input),
		dismissedKinds,
	);
	return actions[0] ?? null;
}
