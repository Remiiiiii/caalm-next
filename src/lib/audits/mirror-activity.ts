import type { AuditAction, AuditModule } from "@/lib/audits/audit-log.utils";
import type { AuditLogEntry } from "@/lib/services/audit-logger";

export type ActivityFeedType =
	| "contract"
	| "user"
	| "event"
	| "notification"
	| "file";

export function mapActivityTypeToAudit(type: ActivityFeedType): {
	module: AuditModule;
	action: AuditAction;
	targetType: string;
} {
	switch (type) {
		case "file":
			return { module: "documents", action: "create", targetType: "file" };
		case "contract":
			return { module: "contracts", action: "update", targetType: "contract" };
		case "event":
			return { module: "governance", action: "create", targetType: "event" };
		case "user":
			return { module: "governance", action: "create", targetType: "user" };
		case "notification":
		default:
			return { module: "system", action: "update", targetType: "notification" };
	}
}

export function buildActivityAuditEntry(input: {
	$id: string;
	action: string;
	description: string;
	type: ActivityFeedType;
	userId?: string;
	userName?: string;
	orgId?: string;
	contractId?: string;
	eventId?: string;
}): AuditLogEntry {
	const mapped = mapActivityTypeToAudit(input.type);
	const targetId =
		input.contractId || input.eventId || input.userId || input.$id;
	const userName = input.userName || "User";

	return {
		event_id: `activity-${input.$id}`,
		event_title: input.action,
		action: mapped.action,
		source: "caalm",
		user_id: input.userId || "system",
		user_name: userName,
		user_email: "",
		orgId: input.orgId || "default_organization",
		status: "success",
		module: mapped.module,
		target_type: mapped.targetType,
		target_id: targetId,
		target_label: input.description,
		summary: `${userName} — ${input.action}: ${input.description}`,
		correlation_id: `recent-activity:${input.$id}`,
	};
}
