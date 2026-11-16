import { createNotification } from "@/lib/actions/notification.actions";
import { listEvidence } from "@/lib/audit-lab/repository";
import type { EvidenceRequest } from "@/lib/audit-lab/types";

function isOverdue(item: EvidenceRequest): boolean {
	if (!item.dueAt) return false;
	return Date.parse(item.dueAt) < Date.now();
}

export async function processEvidenceChasers(orgId: string) {
	const items = await listEvidence(orgId);
	const overdue = items.filter(
		(item) =>
			isOverdue(item) &&
			item.status !== "accepted" &&
			item.status !== "not_applicable",
	);

	let sent = 0;
	for (const item of overdue) {
		const target = item.assigneeUserId || item.ownerUserId;
		if (!target) continue;
		try {
			await createNotification({
				userId: target,
				title: "Evidence request overdue",
				message: `${item.title} is past its internal due date.`,
				type: "warning",
				actionUrl: `/audit-lab/evidence/${item.$id}`,
				actionText: "Open request",
				triggerType: "scheduled",
				priority: "high",
			});
			sent += 1;
		} catch {
			/* best effort */
		}
	}

	return { overdue: overdue.length, sent };
}