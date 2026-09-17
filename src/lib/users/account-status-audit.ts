import type { NextRequest } from "next/server";
import { logAuditEvent } from "@/lib/services/audit-logger";

export type AccountStatus = "active" | "inactive" | "suspended";

function normalizeStatus(status?: string | null): AccountStatus {
	if (status === "inactive" || status === "suspended") return status;
	return "active";
}

function clientMeta(request: NextRequest): {
	ip_address?: string;
	user_agent?: string;
} {
	const forwarded = request.headers.get("x-forwarded-for");
	const ip =
		forwarded?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip") ||
		undefined;
	return {
		ip_address: ip,
		user_agent: request.headers.get("user-agent") || undefined,
	};
}

export async function logAccountStatusChange(input: {
	actor: { $id: string; fullName?: string; email?: string };
	target: { $id?: string; fullName?: string; email?: string; orgId?: string };
	previousStatus?: string | null;
	nextStatus: AccountStatus;
	orgId?: string;
	request: NextRequest;
}): Promise<void> {
	const previous = normalizeStatus(input.previousStatus);
	const next = normalizeStatus(input.nextStatus);
	if (previous === next) return;

	const isReactivate = next === "active";
	const actorName = input.actor.fullName || input.actor.email || "Unknown";
	const targetLabel =
		input.target.fullName || input.target.email || input.target.$id || "user";

	await logAuditEvent({
		event_id: crypto.randomUUID(),
		event_title: isReactivate ? "Account reactivated" : "Account deactivated",
		action: "update",
		source: "caalm",
		user_id: input.actor.$id,
		user_name: actorName,
		user_email: input.actor.email || "",
		orgId: input.orgId || input.target.orgId || "default_organization",
		status: "success",
		module: "governance",
		target_type: "user",
		target_id: input.target.$id,
		target_label: targetLabel,
		summary: `${actorName} ${isReactivate ? "reactivated" : "deactivated"} ${targetLabel}`,
		changes: [{ field: "status", before: previous, after: next }],
		metadata: {
			previousStatus: previous,
			nextStatus: next,
			targetUserId: input.target.$id,
			targetEmail: input.target.email,
		},
		...clientMeta(input.request),
	});
}
