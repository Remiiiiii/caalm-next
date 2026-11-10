/**
 * CAALM invite queue: people still waiting for a role/department form.
 * Checked people go out in the current Confirm; unchecked stay here for the next form.
 */

import type { DirectoryInvitee } from "@/lib/assistant/directoryInvite";
import * as cache from "@/lib/services/redis-cache";

export type InviteQueueState = {
	userId: string;
	orgId: string;
	remaining: DirectoryInvitee[];
	total: number;
};

const TTL_SEC = 30 * 60;

function queueKey(userId: string, orgId: string): string {
	return `assistant:invite-queue:${orgId}:${userId}`;
}

export async function setInviteQueue(params: {
	userId: string;
	orgId: string;
	remaining: DirectoryInvitee[];
	total?: number;
}): Promise<InviteQueueState> {
	const state: InviteQueueState = {
		userId: params.userId,
		orgId: params.orgId,
		remaining: params.remaining,
		total: params.total ?? params.remaining.length,
	};
	await cache.set(queueKey(params.userId, params.orgId), state, TTL_SEC);
	return state;
}

export async function getInviteQueue(
	userId: string,
	orgId: string,
): Promise<InviteQueueState | null> {
	const state = await cache.get<InviteQueueState>(queueKey(userId, orgId));
	if (!state || !Array.isArray(state.remaining) || state.remaining.length === 0) {
		return null;
	}
	return state;
}

export async function clearInviteQueue(
	userId: string,
	orgId: string,
): Promise<void> {
	await cache.del(queueKey(userId, orgId));
}

/** Drop one person after their invite confirms; returns the next person if any. */
export async function advanceInviteQueue(params: {
	userId: string;
	orgId: string;
	completedEmail: string;
}): Promise<{
	next: DirectoryInvitee | null;
	remaining: DirectoryInvitee[];
	remainingCount: number;
	total: number;
}> {
	const batch = await completeInviteQueueBatch({
		userId: params.userId,
		orgId: params.orgId,
		completedEmails: [params.completedEmail],
	});
	return {
		next: batch.remaining[0] ?? null,
		remaining: batch.remaining,
		remainingCount: batch.remaining.length,
		total: batch.total,
	};
}

/** Drop everyone who just confirmed; leftover people get the next form. */
export async function completeInviteQueueBatch(params: {
	userId: string;
	orgId: string;
	completedEmails: string[];
}): Promise<{ remaining: DirectoryInvitee[]; total: number }> {
	const state = await getInviteQueue(params.userId, params.orgId);
	if (!state) {
		return { remaining: [], total: 0 };
	}
	const done = new Set(
		params.completedEmails
			.map((email) => email.trim().toLowerCase())
			.filter(Boolean),
	);
	const remaining = state.remaining.filter(
		(row) => !done.has(row.email.trim().toLowerCase()),
	);
	if (remaining.length === 0) {
		await clearInviteQueue(params.userId, params.orgId);
		return { remaining: [], total: state.total };
	}
	await setInviteQueue({
		userId: params.userId,
		orgId: params.orgId,
		remaining,
		total: state.total,
	});
	return { remaining, total: state.total };
}

export function completedEmailsFromInviteArgs(
	args: Record<string, unknown>,
): string[] {
	const emails: string[] = [];
	if (typeof args.email === "string" && args.email.trim()) {
		emails.push(args.email.trim().toLowerCase());
	}
	const invitees = Array.isArray(args.invitees) ? args.invitees : [];
	for (const row of invitees) {
		if (!row || typeof row !== "object") continue;
		const email = String((row as { email?: string }).email ?? "")
			.trim()
			.toLowerCase();
		if (email) emails.push(email);
	}
	if (typeof args.invitees_json === "string" && args.invitees_json.trim()) {
		try {
			const parsed = JSON.parse(args.invitees_json) as unknown;
			if (Array.isArray(parsed)) {
				for (const row of parsed) {
					if (!row || typeof row !== "object") continue;
					const email = String((row as { email?: string }).email ?? "")
						.trim()
						.toLowerCase();
					if (email) emails.push(email);
				}
			}
		} catch {
			/* ignore bad json */
		}
	}
	return [...new Set(emails)];
}
