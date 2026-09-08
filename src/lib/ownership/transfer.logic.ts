import type { ApprovalWorkflowState } from "@/lib/approvals/contractApprovalWorkflow.types";

/** Replace every occurrence of fromUserId with toUserId in workflow assignees. */
export function remapWorkflowOwnerIds(
	state: ApprovalWorkflowState,
	fromUserId: string,
	toUserId: string,
): ApprovalWorkflowState {
	if (!fromUserId || !toUserId || fromUserId === toUserId) return state;
	return {
		...state,
		derivedAt: new Date().toISOString(),
		steps: state.steps.map((step) => ({
			...step,
			assigneeUserIds: (step.assigneeUserIds || []).map((id) =>
				id === fromUserId ? toUserId : id,
			),
		})),
		notifications: (state.notifications || []).map((note) => ({
			...note,
			recipientUserIds: (note.recipientUserIds || []).map((id) =>
				id === fromUserId ? toUserId : id,
			),
		})),
	};
}

/** Swap old owner for new owner in an assignedManagers string array. */
export function remapAssignedManagers(
	managers: unknown,
	fromUserId: string,
	toUserId: string,
): string[] | undefined {
	if (!Array.isArray(managers)) return undefined;
	const next = managers.map((id) =>
		String(id) === fromUserId ? toUserId : String(id),
	);
	if (!next.includes(toUserId)) next.push(toUserId);
	return [...new Set(next.filter(Boolean))];
}
