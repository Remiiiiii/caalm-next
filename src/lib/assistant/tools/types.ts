import type { PermissionKey } from "@/constants/permissions";
import type { AssistantAuthContext } from "@/lib/assistant/auth";
import * as cache from "@/lib/services/redis-cache";

export type PendingAssistantAction = {
	id: string;
	userId: string;
	orgId: string;
	toolName: string;
	args: Record<string, unknown>;
	label: string;
	preview: string;
	createdAt: number;
	expiresAt: number;
};

const TTL_MS = 10 * 60 * 1000;
const TTL_SEC = 10 * 60;

function pendingKey(id: string): string {
	return `assistant:pending:${id}`;
}

export async function storePendingAction(
	action: Omit<PendingAssistantAction, "id" | "createdAt" | "expiresAt">,
): Promise<PendingAssistantAction> {
	const id = crypto.randomUUID();
	const now = Date.now();
	const record: PendingAssistantAction = {
		...action,
		id,
		createdAt: now,
		expiresAt: now + TTL_MS,
	};
	await cache.set(pendingKey(id), record, TTL_SEC);
	return record;
}

export async function consumePendingAction(
	id: string,
	ctx: AssistantAuthContext,
): Promise<PendingAssistantAction | null> {
	const record = await cache.get<PendingAssistantAction>(pendingKey(id));
	if (!record) return null;
	await cache.del(pendingKey(id));
	if (record.expiresAt < Date.now()) return null;
	if (record.userId !== ctx.user.$id || record.orgId !== ctx.orgId) return null;
	return record;
}

/** Merge client-side confirmation edits into a still-pending action. */
export async function patchPendingActionArgs(
	id: string,
	ctx: AssistantAuthContext,
	argsPatch: Record<string, unknown>,
): Promise<PendingAssistantAction | null> {
	const record = await cache.get<PendingAssistantAction>(pendingKey(id));
	if (!record) return null;
	if (record.expiresAt < Date.now()) {
		await cache.del(pendingKey(id));
		return null;
	}
	if (record.userId !== ctx.user.$id || record.orgId !== ctx.orgId) return null;
	const updated: PendingAssistantAction = {
		...record,
		args: { ...record.args, ...argsPatch },
		preview: JSON.stringify({ ...record.args, ...argsPatch }, null, 2).slice(
			0,
			500,
		),
	};
	const remainingSec = Math.max(
		1,
		Math.ceil((updated.expiresAt - Date.now()) / 1000),
	);
	await cache.set(pendingKey(id), updated, remainingSec);
	return updated;
}

export type ToolContext = AssistantAuthContext & {
	pathname?: string;
};

export type ToolDefinition = {
	name: string;
	description: string;
	requiredPermissions: PermissionKey[];
	mutating: boolean;
	parameters: Record<string, unknown>;
	handler: (
		ctx: ToolContext,
		args: Record<string, unknown>,
	) => Promise<{
		result?: unknown;
		clientAction?: { type: "navigate"; href: string };
	}>;
};
