import type { NextRequest } from "next/server";
import { logAuditEvent } from "@/lib/services/audit-logger";

type ImpersonationAuditInput = {
	actor: {
		$id: string;
		fullName?: string;
		name?: string;
		email?: string;
	};
	targetUserId?: string;
	targetLabel?: string;
	orgId?: string;
	reason?: string;
	status: "success" | "failed";
	kind: "start" | "end" | "denied";
	errorMessage?: string;
	request?: NextRequest;
};

function clientMeta(request?: NextRequest): {
	ip_address?: string;
	user_agent?: string;
} {
	if (!request) return {};
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

export async function logImpersonationAudit(
	input: ImpersonationAuditInput,
): Promise<void> {
	const titles = {
		start: "Impersonation started",
		end: "Impersonation ended",
		denied: "Impersonation denied",
	};
	const actorName = input.actor.fullName || input.actor.name || "Unknown";
	const summary =
		input.kind === "start"
			? `${actorName} started viewing as ${input.targetLabel || input.targetUserId}`
			: input.kind === "end"
				? `${actorName} ended viewing as ${input.targetLabel || input.targetUserId}`
				: `${actorName} was denied impersonation of ${input.targetLabel || input.targetUserId || "unknown"}`;

	await logAuditEvent({
		event_id: crypto.randomUUID(),
		event_title: titles[input.kind],
		action: input.kind === "end" ? "logout" : "login",
		source: "caalm",
		user_id: input.actor.$id,
		user_name: actorName,
		user_email: input.actor.email || "",
		orgId: input.orgId,
		reason: input.reason,
		status: input.status,
		error_message: input.errorMessage,
		module: "auth",
		target_type: "user",
		target_id: input.targetUserId,
		target_label: input.targetLabel,
		summary,
		metadata: {
			impersonationKind: input.kind,
			actorUserId: input.actor.$id,
			actingAsUserId: input.targetUserId,
		},
		...clientMeta(input.request),
	});
}
