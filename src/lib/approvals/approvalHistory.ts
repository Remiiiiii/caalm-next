import type { ApprovalWorkflowNotification } from "@/lib/approvals/contractApprovalWorkflow.types";

export interface ApprovalHistoryEvent {
	id: string;
	at: string;
	type: string;
	label: string;
	stepId?: string;
	actorUserIds: string[];
	reason?: string;
	detail?: string;
}

export function historyFromNotifications(
	notifications: ApprovalWorkflowNotification[] | undefined,
): ApprovalHistoryEvent[] {
	return (notifications || [])
		.map((note) => ({
			id: note.id,
			at: note.sentAt,
			type: note.type,
			label: note.label || note.type.replace(/_/g, " "),
			stepId: note.stepId,
			// Prefer explicit actor; fall back to recipients for older rows.
			actorUserIds: note.actorUserId
				? [note.actorUserId]
				: note.recipientUserIds || [],
			reason: note.reason,
			detail: note.detail,
		}))
		.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export function historyToCsv(events: ApprovalHistoryEvent[]): string {
	const header = "time,type,label,stepId,userIds,reason,detail";
	const rows = events.map((event) =>
		[
			event.at,
			event.type,
			`"${event.label.replace(/"/g, '""')}"`,
			event.stepId || "",
			event.actorUserIds.join(";"),
			`"${(event.reason || "").replace(/"/g, '""')}"`,
			`"${(event.detail || "").replace(/"/g, '""')}"`,
		].join(","),
	);
	return [header, ...rows].join("\n");
}
