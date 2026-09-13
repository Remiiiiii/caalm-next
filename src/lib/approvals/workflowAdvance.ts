import type { ApprovalWorkflowState } from "@/lib/approvals/contractApprovalWorkflow.types";

/**
 * After the current step is marked complete, open the next pending step.
 * Parallel siblings (same parallelGroupId) stay current until every sibling finishes.
 */
export function advanceWorkflowAfterApprove(
	state: ApprovalWorkflowState,
	completedIndex: number,
): ApprovalWorkflowState {
	const completed = state.steps[completedIndex];
	if (!completed) return state;

	const groupId = completed.parallelGroupId;
	if (groupId) {
		const siblingsIncomplete = state.steps.some(
			(step) =>
				step.parallelGroupId === groupId &&
				step.status !== "complete" &&
				step.status !== "skipped" &&
				step.status !== "rejected",
		);
		if (siblingsIncomplete) {
			const nextCurrent = state.steps.findIndex(
				(step) =>
					step.parallelGroupId === groupId && step.status === "current",
			);
			return {
				...state,
				currentStepIndex: nextCurrent >= 0 ? nextCurrent : completedIndex,
				derivedAt: new Date().toISOString(),
			};
		}
	}

	const nextIndex = state.steps.findIndex(
		(step, index) => index > completedIndex && step.status === "pending",
	);
	if (nextIndex < 0) {
		return { ...state, currentStepIndex: completedIndex };
	}

	const nextGroup = state.steps[nextIndex].parallelGroupId;
	const steps = state.steps.map((step, index) => {
		if (nextGroup && step.parallelGroupId === nextGroup) {
			return { ...step, status: "current" as const };
		}
		if (!nextGroup && index === nextIndex) {
			return { ...step, status: "current" as const };
		}
		return step;
	});

	return {
		...state,
		steps,
		currentStepIndex: nextIndex,
		derivedAt: new Date().toISOString(),
	};
}
