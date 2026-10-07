import { logAuditEvent } from "@/lib/services/audit-logger";

type NewsAuditInput = {
	action: "create" | "update" | "delete";
	eventId: string;
	eventTitle: string;
	userId: string;
	userName?: string | null;
	userEmail?: string | null;
	orgId?: string | null;
	targetId: string;
	targetLabel: string;
	summary: string;
	changes?: Array<{ field: string; before?: unknown; after?: unknown }>;
};

export async function logNewsAudit(input: NewsAuditInput): Promise<void> {
	await logAuditEvent({
		event_id: input.eventId,
		event_title: input.eventTitle,
		action: input.action,
		source: "caalm",
		user_id: input.userId,
		user_name: input.userName || "unknown",
		user_email: input.userEmail || "",
		orgId: input.orgId || undefined,
		status: "success",
		module: "news",
		target_type: "news_article",
		target_id: input.targetId,
		target_label: input.targetLabel,
		summary: input.summary,
		changes: input.changes,
	});
}
