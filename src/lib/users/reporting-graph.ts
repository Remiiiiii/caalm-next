/**
 * Reporting tree from managerUserId. Separate from the assignment graph
 * (who granted the role). Matrix managers are overlay edges only.
 */

import {
	FLOW_CARD_WIDTH,
	FLOW_RANK_GAP,
	FLOW_ROW_EXTENT,
	GRAPH_PAD_X,
	GRAPH_PAD_Y,
	wouldCreateCycle,
} from "@/lib/users/assignment-graph";

/** Horizontal gap between manager (left) and reports (right). */
export const REPORTING_RANK_GAP = FLOW_RANK_GAP;
export const REPORTING_COL_WIDTH = FLOW_CARD_WIDTH + 24;
export const REPORTING_ROW_EXTENT = FLOW_ROW_EXTENT;

export type ReportingGraphUser = {
	$id: string;
	accountId?: string;
	managerUserId?: string | null;
	matrixManagerUserId?: string | null;
};

export function profileIdForRaw(
	raw: string,
	byId: Map<string, { $id: string }>,
	byAccount: Map<string, { $id: string }>,
): string | null {
	const id = raw.trim();
	if (!id) return null;
	if (byId.has(id)) return id;
	return byAccount.get(id)?.$id ?? null;
}

function lookupMaps<T extends ReportingGraphUser>(users: T[]) {
	const byId = new Map(users.map((user) => [user.$id, user]));
	const byAccount = new Map(
		users
			.filter((user) => user.accountId)
			.map((user) => [user.accountId as string, user]),
	);
	return { byId, byAccount };
}

/** Resolve managerUserId to a profile id in this org, or null. */
export function resolveManagerProfileId<T extends ReportingGraphUser>(
	user: T,
	lookup: T[],
): string | null {
	const { byId, byAccount } = lookupMaps(lookup);
	return profileIdForRaw(user.managerUserId || "", byId, byAccount);
}

export function resolveMatrixManagerProfileId<T extends ReportingGraphUser>(
	user: T,
	lookup: T[],
): string | null {
	const { byId, byAccount } = lookupMaps(lookup);
	return profileIdForRaw(user.matrixManagerUserId || "", byId, byAccount);
}

export function reportingWouldCycle(
	managerId: string,
	reportId: string,
	parentOf: Map<string, string>,
): boolean {
	if (managerId === reportId) return true;
	return wouldCreateCycle(managerId, reportId, parentOf);
}

export function buildReportingParentOf<T extends ReportingGraphUser>(
	users: T[],
	lookup: T[] = users,
): Map<string, string> {
	const parentOf = new Map<string, string>();
	for (const user of users) {
		const managerId = resolveManagerProfileId(user, lookup);
		if (!managerId || managerId === user.$id) continue;
		if (reportingWouldCycle(managerId, user.$id, parentOf)) continue;
		parentOf.set(user.$id, managerId);
	}
	return parentOf;
}

export function collectReportingUsers<T extends ReportingGraphUser>(
	visibleUsers: T[],
	allUsers: T[],
): T[] {
	const included = new Map<string, T>();
	for (const user of visibleUsers) included.set(user.$id, user);

	const queue = [...visibleUsers];
	while (queue.length > 0) {
		const current = queue.pop();
		if (!current) continue;
		const managerId = resolveManagerProfileId(current, allUsers);
		if (!managerId || included.has(managerId)) continue;
		const manager = allUsers.find((item) => item.$id === managerId);
		if (!manager) continue;
		included.set(manager.$id, manager);
		queue.push(manager);
	}

	return [...included.values()];
}

function subtreeHeight(
	id: string,
	childrenOf: Map<string, string[]>,
	memo: Map<string, number>,
): number {
	const cached = memo.get(id);
	if (cached != null) return cached;
	const kids = childrenOf.get(id) || [];
	if (kids.length === 0) {
		memo.set(id, REPORTING_ROW_EXTENT);
		return REPORTING_ROW_EXTENT;
	}
	const height = Math.max(
		REPORTING_ROW_EXTENT,
		kids.reduce((sum, child) => sum + subtreeHeight(child, childrenOf, memo), 0),
	);
	memo.set(id, height);
	return height;
}

/**
 * Left-to-right positions (root on the left, reports to the right).
 * Saved diagram spots still win when present.
 */
export function seedReportingNodePositions<T extends ReportingGraphUser>(
	visibleUsers: T[],
	allUsers: T[],
	saved: Map<string, { x: number; y: number }>,
): Map<string, { x: number; y: number }> {
	const graphUsers = collectReportingUsers(visibleUsers, allUsers);
	const lookup = allUsers.length > 0 ? allUsers : graphUsers;
	const parentOf = buildReportingParentOf(graphUsers, lookup);
	const childrenOf = new Map<string, string[]>();

	for (const user of graphUsers) {
		if (!childrenOf.has(user.$id)) childrenOf.set(user.$id, []);
	}
	for (const [childId, managerId] of parentOf) {
		const list = childrenOf.get(managerId) || [];
		list.push(childId);
		childrenOf.set(managerId, list);
		if (!childrenOf.has(childId)) childrenOf.set(childId, []);
	}

	const roots = graphUsers
		.filter((user) => !parentOf.has(user.$id))
		.map((user) => user.$id)
		.sort();

	const heightMemo = new Map<string, number>();
	const positions = new Map<string, { x: number; y: number }>();

	const place = (id: string, top: number, depth: number) => {
		positions.set(id, {
			x: GRAPH_PAD_X + depth * REPORTING_RANK_GAP,
			y: top,
		});
		let cursor = top;
		for (const childId of childrenOf.get(id) || []) {
			const childHeight = subtreeHeight(childId, childrenOf, heightMemo);
			place(childId, cursor, depth + 1);
			cursor += childHeight;
		}
	};

	let rootCursor = GRAPH_PAD_Y;
	for (const rootId of roots) {
		const height = subtreeHeight(rootId, childrenOf, heightMemo);
		place(rootId, rootCursor, 0);
		rootCursor += height;
	}

	const result = new Map<string, { x: number; y: number }>();
	for (const [id, position] of positions) {
		const stored = saved.get(id);
		if (stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)) {
			result.set(id, stored);
			continue;
		}
		result.set(id, position);
	}
	return result;
}

export function skipLevelManagerId<T extends ReportingGraphUser>(
	userId: string,
	users: T[],
): string | null {
	const user = users.find((item) => item.$id === userId);
	if (!user) return null;
	const managerId = resolveManagerProfileId(user, users);
	if (!managerId) return null;
	const manager = users.find((item) => item.$id === managerId);
	if (!manager) return null;
	return resolveManagerProfileId(manager, users);
}

/** Manager chain from the person up to the root, including self. */
export function managerChainIds<T extends ReportingGraphUser>(
	userId: string,
	users: T[],
): string[] {
	const chain: string[] = [];
	const seen = new Set<string>();
	let cursor: string | null = userId;
	while (cursor && !seen.has(cursor)) {
		chain.push(cursor);
		seen.add(cursor);
		const user = users.find((item) => item.$id === cursor);
		cursor = user ? resolveManagerProfileId(user, users) : null;
	}
	return chain;
}

/** Overlay only. Never used for rank. */
export function matrixReportingEdges<T extends ReportingGraphUser>(
	users: T[],
	lookup: T[] = users,
): Array<{ fromId: string; toId: string }> {
	const edges: Array<{ fromId: string; toId: string }> = [];
	for (const user of users) {
		const fromId = resolveMatrixManagerProfileId(user, lookup);
		if (!fromId || fromId === user.$id) continue;
		const solid = resolveManagerProfileId(user, lookup);
		if (fromId === solid) continue;
		edges.push({ fromId, toId: user.$id });
	}
	return edges;
}
