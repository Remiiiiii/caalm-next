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
};

export type NextBestAction = {
	kind: NextBestActionKind;
	title: string;
	rationale: string;
};

const INVITE_SEGMENTS: LifecycleSegment[] = [
	"At-risk",
	"Lapsed",
	"Loyal",
	"Champion",
];

const ASK_SEGMENTS: LifecycleSegment[] = ["Champion", "Loyal", "New"];

/** Rule table — unit-tested fixtures; UI reads the primary action only. */
export function computeNextBestActions(
	input: NextBestActionInput,
): NextBestAction[] {
	const actions: NextBestAction[] = [];

	if (
		input.daysSinceLastPostedGift != null &&
		input.daysSinceLastPostedGift <= 14
	) {
		actions.push({
			kind: "thank",
			title: "Send thank-you",
			rationale: "They gave within the last two weeks.",
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

	if (
		input.hasUpcomingPublicEvent &&
		INVITE_SEGMENTS.includes(input.segment)
	) {
		actions.push({
			kind: "invite",
			title: "Invite to upcoming event",
			rationale: "A public event is coming up that fits re-engagement.",
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

export function pickPrimaryNextBestAction(
	input: NextBestActionInput,
): NextBestAction | null {
	const actions = computeNextBestActions(input);
	return actions[0] ?? null;
}
