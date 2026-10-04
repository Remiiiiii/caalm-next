import type { NextRequest } from "next/server";
import { logAuditEvent } from "@/lib/services/audit-logger";

type SecurityActor = {
	$id: string;
	fullName?: string;
	email?: string;
};

type SecurityTarget = {
	$id?: string;
	fullName?: string;
	email?: string;
	orgId?: string;
};

export type SecurityAuditKind =
	| "session_revoke"
	| "password_reset"
	| "two_factor_reset"
	| "two_factor_enabled";

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

const TITLES: Record<SecurityAuditKind, string> = {
	session_revoke: "Sessions revoked",
	password_reset: "Password reset emailed",
	two_factor_reset: "Two-factor authentication reset",
	two_factor_enabled: "Two-factor authentication enabled",
};

/**
 * Write a security audit row (actor + target) for revoke / password / 2FA events.
 */
export async function logSecurityAudit(input: {
	kind: SecurityAuditKind;
	actor: SecurityActor;
	target: SecurityTarget;
	orgId?: string;
	request?: NextRequest;
	status?: "success" | "failed";
	errorMessage?: string;
}): Promise<void> {
	const actorName = input.actor.fullName || input.actor.email || "Unknown";
	const targetLabel =
		input.target.fullName ||
		input.target.email ||
		input.target.$id ||
		"user";
	const title = TITLES[input.kind];
	const summary = `${actorName}: ${title.toLowerCase()} for ${targetLabel}`;

	await logAuditEvent({
		event_id: crypto.randomUUID(),
		event_title: title,
		action: input.kind === "session_revoke" ? "logout" : "update",
		source: "caalm",
		user_id: input.actor.$id,
		user_name: actorName,
		user_email: input.actor.email || "",
		orgId: input.orgId || input.target.orgId || "default_organization",
		status: input.status || "success",
		error_message: input.errorMessage,
		module: "auth",
		target_type: "user",
		target_id: input.target.$id,
		target_label: targetLabel,
		summary,
		metadata: {
			securityKind: input.kind,
			actorUserId: input.actor.$id,
			targetUserId: input.target.$id,
			targetEmail: input.target.email,
		},
		...clientMeta(input.request),
	});
}
