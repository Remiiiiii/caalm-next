/**
 * Reporting tree from managerUserId. Separate from the assignment graph
 * (who granted the role). Matrix managers are overlay edges only.
 */

import {
	FLOW_CARD_HEIGHT,
	FLOW_CARD_WIDTH,
	FLOW_RANK_GAP,
	FLOW_ROW_EXTENT,
	FLOW_TB_COL_EXTENT,
	FLOW_TB_RANK_GAP,
	GRAPH_PAD_X,
	GRAPH_PAD_Y,
	wouldCreateCycle,
} from "@/lib/users/assignment-graph";
import { isSuperAdminProfile } from "@/lib/users/graph-visibility";
import {
	isTopDownOrientation,
	type GraphOrientation,
} from "@/lib/users/graph-orientation";

/** Horizontal gap between manager (left) and reports (right). */
export const REPORTING_RANK_GAP = FLOW_RANK_GAP;
export const REPORTING_COL_WIDTH = FLOW_CARD_WIDTH + 24;
export const REPORTING_ROW_EXTENT = FLOW_ROW_EXTENT;

export type ReportingGraphUser = {
	$id: string;
	accountId?: string;
	managerUserId?: string | null;
	matrixManagerUserId?: string | null;
	roleName?: string | null;
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
	const enqueue = (id: string | null) => {
		if (!id || included.has(id)) return;
		const person = allUsers.find((item) => item.$id === id);
		if (!person) return;
		included.set(person.$id, person);
		queue.push(person);
	};
	while (queue.length > 0) {
		const current = queue.pop();
		if (!current) continue;
		enqueue(resolveManagerProfileId(current, allUsers));
		enqueue(resolveMatrixManagerProfileId(current, allUsers));
	}

	return [...included.values()];
}

export function superAdminIdInUsers<T extends ReportingGraphUser>(
	users: T[],
): string | null {
	return users.find((user) => isSuperAdminProfile(user))?.$id ?? null;
}

/**
 * For top-down reporting: Super Admin becomes the sole forest root so
 * other roots sit on the next row. This is layout-only — do not draw
 * edges for syntheticChildIds. Real managerUserId values stay as-is.
 */
export function hoistSuperAdminReportingRoots<T extends ReportingGraphUser>(
	parentOf: Map<string, string>,
	users: T[],
	superAdminId: string,
): { parentOf: Map<string, string>; syntheticChildIds: string[] } {
	if (!users.some((user) => user.$id === superAdminId)) {
		return { parentOf, syntheticChildIds: [] };
	}

	const next = new Map(parentOf);
	next.delete(superAdminId);
	const syntheticChildIds: string[] = [];

	for (const user of users) {
		if (user.$id === superAdminId) continue;
		if (next.has(user.$id)) continue;
		if (reportingWouldCycle(superAdminId, user.$id, next)) continue;
		next.set(user.$id, superAdminId);
		if (parentOf.get(user.$id) !== superAdminId) {
			syntheticChildIds.push(user.$id);
		}
	}

	return { parentOf: next, syntheticChildIds };
}

export function reportingLayoutParentOf<T extends ReportingGraphUser>(
	users: T[],
	lookup: T[] = users,
	hoistSuperAdminId?: string | null,
): { parentOf: Map<string, string>; syntheticChildIds: string[] } {
	const parentOf = buildReportingParentOf(users, lookup);
	if (!hoistSuperAdminId) {
		return { parentOf, syntheticChildIds: [] };
	}
	return hoistSuperAdminReportingRoots(parentOf, users, hoistSuperAdminId);
}

function subtreeSpan(
	id: string,
	childrenOf: Map<string, string[]>,
	memo: Map<string, number>,
	leafExtent: number,
): number {
	const cached = memo.get(id);
	if (cached != null) return cached;
	const kids = childrenOf.get(id) || [];
	if (kids.length === 0) {
		memo.set(id, leafExtent);
		return leafExtent;
	}
	const span = Math.max(
		leafExtent,
		kids.reduce(
			(sum, child) => sum + subtreeSpan(child, childrenOf, memo, leafExtent),
			0,
		),
	);
	memo.set(id, span);
	return span;
}

export type SeedReportingOptions = {
	orientation?: GraphOrientation;
	hoistSuperAdminId?: string | null;
};

/**
 * Positions for React Flow. Left-to-right by default; top-down swaps axes.
 * Saved spots apply in both orientations.
 */
export function seedReportingNodePositions<T extends ReportingGraphUser>(
	visibleUsers: T[],
	allUsers: T[],
	saved: Map<string, { x: number; y: number }>,
	options?: SeedReportingOptions,
): Map<string, { x: number; y: number }> {
	const orientation = options?.orientation ?? "ltr";
	const topDown = isTopDownOrientation(orientation);
	const graphUsers = collectReportingUsers(visibleUsers, allUsers);
	const lookup = allUsers.length > 0 ? allUsers : graphUsers;
	const { parentOf } = reportingLayoutParentOf(
		graphUsers,
		lookup,
		options?.hoistSuperAdminId,
	);
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

	const spanMemo = new Map<string, number>();
	const positions = new Map<string, { x: number; y: number }>();
	const leafExtent = topDown ? FLOW_TB_COL_EXTENT : REPORTING_ROW_EXTENT;
	const rankGap = topDown ? FLOW_TB_RANK_GAP : REPORTING_RANK_GAP;

	const place = (id: string, start: number, depth: number) => {
		const kids = childrenOf.get(id) || [];
		let cursor = start;
		for (const childId of kids) {
			const childSpan = subtreeSpan(childId, childrenOf, spanMemo, leafExtent);
			place(childId, cursor, depth + 1);
			cursor += childSpan;
		}
		const span = subtreeSpan(id, childrenOf, spanMemo, leafExtent);
		const centered =
			kids.length === 0
				? start
				: start + Math.max(0, (span - (topDown ? FLOW_CARD_WIDTH : FLOW_CARD_HEIGHT)) / 2);
		if (topDown) {
			positions.set(id, {
				x: centered,
				y: GRAPH_PAD_Y + depth * rankGap,
			});
			return;
		}
		positions.set(id, {
			x: GRAPH_PAD_X + depth * rankGap,
			y: centered,
		});
	};

	let rootCursor = topDown ? GRAPH_PAD_X : GRAPH_PAD_Y;
	for (const rootId of roots) {
		const span = subtreeSpan(rootId, childrenOf, spanMemo, leafExtent);
		place(rootId, rootCursor, 0);
		rootCursor += span;
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
