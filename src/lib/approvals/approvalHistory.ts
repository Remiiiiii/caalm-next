import type { ApprovalWorkflowNotification } from "@/lib/approvals/contractApprovalWorkflow.types";
import type { StyledXlsxInput } from "@/lib/export/styled-xlsx";

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

export function historyToXlsxInput(
	events: ApprovalHistoryEvent[],
): StyledXlsxInput {
	return {
		sheetName: "Approval History",
		title: "Approval History",
		subtitle: "CAALM · Chronological approval events",
		columns: [
			{ header: "Time", width: 22 },
			{ header: "Type", width: 16 },
			{ header: "Label", width: 40 },
			{ header: "Step", width: 18 },
			{ header: "User IDs", width: 30 },
			{ header: "Reason", width: 34 },
			{ header: "Detail", width: 40 },
		],
		rows: events.map((event) => [
			event.at.replace("T", " ").slice(0, 19),
			event.type,
			event.label,
			event.stepId,
			event.actorUserIds.join("; "),
			event.reason,
			event.detail,
		]),
	};
}
