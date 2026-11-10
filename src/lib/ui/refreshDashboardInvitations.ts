import { mutate } from "swr";

const CLIENT_CACHE_PREFIX = "caalm_cache_";

/** Shape the Pending Invitations table needs to paint a new row immediately. */
export type DashboardInvitationPrepend = {
	$id: string;
	name: string;
	email: string;
	role: string;
	token: string;
	expiresAt?: string;
	status?: string;
	revoked?: boolean;
	$createdAt?: string;
	department?: string | null;
	division?: string | null;
	invitedBy?: string;
};

export type InvitationsUpdatedDetail = {
	prepend: DashboardInvitationPrepend[];
};

type UnifiedCachePayload = {
	data?: {
		invitations?: unknown[];
		[key: string]: unknown;
	};
	timestamp?: number;
	[key: string]: unknown;
};

function clearClientInviteCaches(): void {
	if (typeof window === "undefined") return;
	try {
		for (const storage of [localStorage, sessionStorage]) {
			const toRemove: string[] = [];
			for (let i = 0; i < storage.length; i++) {
				const key = storage.key(i);
				if (!key?.startsWith(CLIENT_CACHE_PREFIX)) continue;
				if (
					key.includes("/api/dashboard/unified") ||
					key.includes("/api/users/uninvited") ||
					key.includes("/api/dashboard/invitations")
				) {
					toRemove.push(key);
				}
			}
			for (const key of toRemove) storage.removeItem(key);
		}
	} catch {
		/* ignore storage errors */
	}
}

function normalizePrependRow(
	row: DashboardInvitationPrepend,
): DashboardInvitationPrepend {
	return {
		...row,
		status: row.status ?? "pending-review",
		revoked: row.revoked ?? false,
		$createdAt: row.$createdAt ?? new Date().toISOString(),
	};
}

/** Paint new invite rows into the unified dashboard SWR cache (no wait on refetch). */
async function prependInvitationsToUnifiedCache(
	invitations: DashboardInvitationPrepend[],
): Promise<void> {
	const rows = invitations
		.filter((row) => Boolean(row.token?.trim()))
		.map(normalizePrependRow);
	if (rows.length === 0) return;

	await mutate(
		(key) =>
			typeof key === "string" && key.includes("/api/dashboard/unified"),
		(current: UnifiedCachePayload | undefined) => {
			if (!current?.data) return current;
			let existing = [...(current.data.invitations || [])];
			for (const inv of rows) {
				const token = inv.token;
				if (
					existing.some(
						(row) => (row as { token?: string }).token === token,
					)
				) {
					continue;
				}
				existing = [inv, ...existing];
			}
			return {
				...current,
				timestamp: Date.now(),
				data: {
					...current.data,
					invitations: existing,
				},
			};
		},
		{ revalidate: false },
	);
}

/**
 * After assistant (or other) invite mutations, force Pending Invitations
 * and the directory picker to refetch instead of showing stale SWR/local cache.
 * Pass `prepend` to mirror the dashboard invite form (row appears immediately).
 *
 * Important: when `prepend` is set, we do **not** immediately revalidate the
 * unified dashboard key. A same-second revalidate can reuse a 60s-deduped stale
 * payload and wipe the optimistic row (hard refresh then "fixes" it).
 */
export async function refreshDashboardInvitations(opts?: {
	prepend?: DashboardInvitationPrepend[];
}): Promise<void> {
	const prepend = (opts?.prepend ?? [])
		.filter((row) => Boolean(row.token?.trim()))
		.map(normalizePrependRow);

	clearClientInviteCaches();

	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent<InvitationsUpdatedDetail>("caalm:invitations-updated", {
				detail: { prepend },
			}),
		);
	}

	if (prepend.length > 0) {
		await prependInvitationsToUnifiedCache(prepend);
	}

	await Promise.all([
		mutate(
			(key) =>
				typeof key === "string" && key.includes("/api/users/uninvited"),
			undefined,
			{ revalidate: true },
		),
		mutate(
			(key) =>
				typeof key === "string" &&
				key.includes("/api/dashboard/invitations"),
			undefined,
			{ revalidate: true },
		),
	]);

	if (prepend.length === 0) {
		await mutate(
			(key) =>
				typeof key === "string" && key.includes("/api/dashboard/unified"),
			undefined,
			{ revalidate: true },
		);
	}
}
