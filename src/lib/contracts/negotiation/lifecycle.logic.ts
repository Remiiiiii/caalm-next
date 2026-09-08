import { ELIGIBLE_START_LIFECYCLES, NEGOTIATION_LIFECYCLE } from "./constants";
import { canSendForReview } from "./comments.logic";

export function canStartNegotiation(lifecycleStatus?: string): boolean {
	const status = (lifecycleStatus || "draft").toLowerCase();
	return (ELIGIBLE_START_LIFECYCLES as readonly string[]).includes(status);
}

export function assertCanLeaveNegotiation(input: {
	lifecycleStatus?: string;
	openCommentCount: number;
	hasApprovePermission: boolean;
}): { ok: boolean; reason?: string } {
	const status = (input.lifecycleStatus || "").toLowerCase();
	if (status && status !== NEGOTIATION_LIFECYCLE) {
		return { ok: false, reason: "Contract is not in negotiation" };
	}
	return canSendForReview({
		openCommentCount: input.openCommentCount,
		hasApprovePermission: input.hasApprovePermission,
	});
}

export function nextStatusAfterNegotiation(): {
	lifecycleStatus: "under_review";
	status: "pending-review";
} {
	return { lifecycleStatus: "under_review", status: "pending-review" };
}

export function isNegotiationLifecycle(lifecycleStatus?: string): boolean {
	return (lifecycleStatus || "").toLowerCase() === NEGOTIATION_LIFECYCLE;
}
