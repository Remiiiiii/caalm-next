import { logAuditEvent } from "@/lib/services/audit-logger";
import type { AuditAction } from "@/lib/audits/audit-log.utils";

export type ConstituentActor = {
	userId: string;
	userName: string;
	userEmail: string;
};

export async function logConstituentAudit(input: {
	action: AuditAction;
	actor: ConstituentActor;
	orgId: string;
	targetId: string;
	targetLabel: string;
	summary: string;
	metadata?: Record<string, unknown>;
}): Promise<void> {
	await logAuditEvent({
		event_id: input.targetId,
		event_title: input.targetLabel,
		action: input.action,
		source: "caalm",
		user_id: input.actor.userId,
		user_name: input.actor.userName,
		user_email: input.actor.userEmail,
		orgId: input.orgId,
		status: "success",
		module: "governance",
		target_type: "constituent",
		target_id: input.targetId,
		target_label: input.targetLabel,
		summary: input.summary,
		metadata: input.metadata,
	});
}
