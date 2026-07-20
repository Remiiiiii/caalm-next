import type { AuditControlDomain } from "@/lib/audits/types";

export type AuditModule =
	| AuditControlDomain
	| "auth"
	| "system";

export type AuditAction =
	| "create"
	| "update"
	| "delete"
	| "sync_delete"
	| "restore"
	| "approval_decided"
	| "export"
	| "login"
	| "logout";

export interface AuditChangeDiff {
	field: string;
	before?: string | number | boolean | null;
	after?: string | number | boolean | null;
}

export interface AuditStructuredFields {
	module?: AuditModule;
	target_type?: string;
	target_id?: string;
	target_label?: string;
	summary?: string;
	changes?: AuditChangeDiff[];
	correlation_id?: string;
}

const DOMAIN_KEYWORDS: Record<AuditControlDomain, string[]> = {
	regulatory: [
		"filing",
		"990",
		"registration",
		"grant report",
		"compliance",
		"audit finding",
	],
	contracts: ["contract", "grant", "vendor", "agreement", "dismiss", "approval"],
	licenses: ["license", "certification", "renewal", "credential"],
	documents: ["document", "upload", "file", "evidence", "minutes", "policy"],
	governance: [
		"admin",
		"policy",
		"training",
		"team",
		"role",
		"approval",
		"user",
		"rbac",
	],
};

const STRUCTURED_KEYS = [
	"module",
	"target_type",
	"target_id",
	"target_label",
	"summary",
	"changes",
	"correlation_id",
] as const;

export function inferModuleFromTitle(
	title: string,
	metadata?: Record<string, unknown> | null,
): AuditModule {
	if (metadata?.module && typeof metadata.module === "string") {
		return metadata.module as AuditModule;
	}

	const lower = title.toLowerCase();
	if (lower.includes("login") || lower.includes("logout") || lower.includes("auth")) {
		return "auth";
	}
	if (lower.includes("export") || lower.includes("cron") || lower.includes("sync")) {
		return "system";
	}

	for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS) as Array<
		[AuditControlDomain, string[]]
	>) {
		if (keywords.some((kw) => lower.includes(kw))) {
			return domain;
		}
	}

	return "system";
}

export function buildSummary(params: {
	userName: string;
	action: string;
	eventTitle: string;
	targetLabel?: string;
	module?: AuditModule;
}): string {
	const { userName, action, eventTitle, targetLabel, module } = params;
	const target = targetLabel || eventTitle;
	const actionVerb: Record<string, string> = {
		create: "created",
		update: "updated",
		delete: "deleted",
		sync_delete: "sync-deleted",
		restore: "restored",
		approval_decided: "decided approval for",
		export: "exported",
		login: "logged in",
		logout: "logged out",
	};
	const verb = actionVerb[action] || action;
	if (action === "login" || action === "logout") {
		return `${userName} ${verb}`;
	}
	const moduleLabel = module && module !== "system" ? ` (${module})` : "";
	return `${userName} ${verb} ${target}${moduleLabel}`;
}

export function packStructuredMetadata(
	metadata: Record<string, unknown> | undefined,
	structured: AuditStructuredFields,
): Record<string, unknown> {
	return {
		...(metadata || {}),
		...Object.fromEntries(
			Object.entries(structured).filter(([, value]) => value !== undefined),
		),
	};
}

export function extractStructuredFields(
	metadata: Record<string, unknown> | null | undefined,
	eventTitle: string,
	userName: string,
	action: string,
): AuditStructuredFields & { publicMetadata: Record<string, unknown> | null } {
	const meta = metadata || {};
	const module =
		(typeof meta.module === "string" ? (meta.module as AuditModule) : undefined) ||
		inferModuleFromTitle(eventTitle, meta);
	const target_type =
		typeof meta.target_type === "string" ? meta.target_type : undefined;
	const target_id =
		typeof meta.target_id === "string" ? meta.target_id : undefined;
	const target_label =
		typeof meta.target_label === "string"
			? meta.target_label
			: eventTitle;
	const summary =
		typeof meta.summary === "string"
			? meta.summary
			: buildSummary({
					userName,
					action,
					eventTitle,
					targetLabel: target_label,
					module,
				});
	const changes = Array.isArray(meta.changes)
		? (meta.changes as AuditChangeDiff[])
		: undefined;
	const correlation_id =
		typeof meta.correlation_id === "string"
			? meta.correlation_id
			: undefined;

	const publicMetadata: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(meta)) {
		if (!(STRUCTURED_KEYS as readonly string[]).includes(key)) {
			publicMetadata[key] = value;
		}
	}

	return {
		module,
		target_type,
		target_id,
		target_label,
		summary,
		changes,
		correlation_id,
		publicMetadata:
			Object.keys(publicMetadata).length > 0 ? publicMetadata : null,
	};
}

export function matchesModule(
	eventTitle: string,
	metadata: Record<string, unknown> | null | undefined,
	module: AuditModule | null,
): boolean {
	if (!module) return true;
	const inferred = inferModuleFromTitle(eventTitle, metadata);
	return inferred === module;
}
