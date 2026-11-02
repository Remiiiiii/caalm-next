import { notifyCapEscalation } from "./notify";
import { listOpenCapsAllOrgs, updateCap } from "./store";

const TIER_DAYS = [0, 7, 14, 30];

function daysPastDue(dueAt: string): number {
	return Math.floor((Date.now() - new Date(dueAt).getTime()) / 86_400_000);
}

export async function sweepAuditCaps(): Promise<{
	scanned: number;
	escalated: number;
	markedOverdue: number;
}> {
	const caps = await listOpenCapsAllOrgs(250);
	let escalated = 0;
	let markedOverdue = 0;

	for (const cap of caps) {
		const late = daysPastDue(cap.dueAt);
		if (late < 0) continue;

		let nextTier = cap.escalationTier;
		if (late >= TIER_DAYS[3]) nextTier = Math.max(nextTier, 3);
		else if (late >= TIER_DAYS[2]) nextTier = Math.max(nextTier, 2);
		else if (late >= TIER_DAYS[1]) nextTier = Math.max(nextTier, 1);

		const nextStatus = late >= 0 && cap.status !== "escalated" ? "overdue" : cap.status;
		const becameEscalated = nextTier > cap.escalationTier;
		if (becameEscalated || nextStatus !== cap.status) {
			await updateCap(cap.$id, {
				escalationTier: nextTier,
				status: becameEscalated ? "escalated" : nextStatus,
			});
			if (nextStatus === "overdue" && !becameEscalated) markedOverdue += 1;
			if (becameEscalated) {
				escalated += 1;
				if (cap.assigneeId) {
					await notifyCapEscalation({
						userId: cap.assigneeId,
						capId: cap.$id,
						title: cap.title,
						tier: nextTier,
					});
				}
			}
		}
	}

	return { scanned: caps.length, escalated, markedOverdue };
}
