import type { PermissionKey } from "@/constants/permissions";
import type { AssistantAuthContext } from "@/lib/assistant/auth";

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

const pending = new Map<string, PendingAssistantAction>();
const TTL_MS = 10 * 60 * 1000;

export function storePendingAction(
	action: Omit<PendingAssistantAction, "id" | "createdAt" | "expiresAt">,
): PendingAssistantAction {
	const id = crypto.randomUUID();
	const now = Date.now();
	const record: PendingAssistantAction = {
		...action,
		id,
		createdAt: now,
		expiresAt: now + TTL_MS,
	};
	pending.set(id, record);
	return record;
}

export function consumePendingAction(
	id: string,
	ctx: AssistantAuthContext,
): PendingAssistantAction | null {
	const record = pending.get(id);
	if (!record) return null;
	pending.delete(id);
	if (record.expiresAt < Date.now()) return null;
	if (record.userId !== ctx.user.$id || record.orgId !== ctx.orgId) return null;
	return record;
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
	) => Promise<{ result?: unknown; clientAction?: { type: "navigate"; href: string } }>;
};
