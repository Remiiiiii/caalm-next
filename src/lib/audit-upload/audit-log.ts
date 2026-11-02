import { logAuditEvent } from "@/lib/services/audit-logger";

export async function logAuditUploadEvent(input: {
	user: { $id: string; fullName?: string; name?: string; email?: string };
	orgId: string;
	action: "create" | "update" | "delete";
	summary: string;
	targetId: string;
	targetLabel: string;
	targetType?: string;
}): Promise<void> {
	const userName = input.user.fullName || input.user.name || input.user.email || "User";
	await logAuditEvent({
		event_id: `audit-upload-${input.targetId}-${Date.now()}`,
		event_title: input.summary,
		action: input.action,
		source: "caalm",
		user_id: input.user.$id,
		user_name: userName,
		user_email: input.user.email || "",
		orgId: input.orgId,
		status: "success",
		module: "system",
		target_type: input.targetType ?? "audit_document",
		target_id: input.targetId,
		target_label: input.targetLabel,
		summary: input.summary,
	});
}
