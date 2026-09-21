import type { AuditAction } from "@/lib/audits/audit-log.utils";
import { type AuditLogEntry, logAuditEvent } from "@/lib/services/audit-logger";

export const CONSTITUENT_PII_VIEW_ACTION = "view_pii" as const;

export type ConstituentActor = {
	userId: string;
	userName: string;
	userEmail: string;
};

export function constituentActorFromUser(user: {
	$id: string;
	fullName?: string;
	email?: string;
}): ConstituentActor {
	return {
		userId: user.$id,
		userName: user.fullName || user.email || "Unknown",
		userEmail: user.email || "",
	};
}

/**
 * Profile-open audit row. Resource id + actor + view_pii only —
 * never donor email, phone, or address values.
 */
export function buildConstituentPiiViewEntry(input: {
	actor: ConstituentActor;
	orgId: string;
	constituentId: string;
}): AuditLogEntry {
	return {
		event_id: input.constituentId,
		event_title: "Constituent PII view",
		action: CONSTITUENT_PII_VIEW_ACTION,
		source: "caalm",
		user_id: input.actor.userId,
		user_name: input.actor.userName,
		user_email: input.actor.userEmail,
		orgId: input.orgId,
		status: "success",
		reason: CONSTITUENT_PII_VIEW_ACTION,
		module: "governance",
		target_type: "constituent",
		target_id: input.constituentId,
		target_label: input.constituentId,
		summary: "Viewed constituent PII",
		metadata: { action: CONSTITUENT_PII_VIEW_ACTION },
	};
}

export async function logConstituentPiiView(input: {
	actor: ConstituentActor;
	orgId: string;
	constituentId: string;
}): Promise<void> {
	await logAuditEvent(buildConstituentPiiViewEntry(input));
}

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
