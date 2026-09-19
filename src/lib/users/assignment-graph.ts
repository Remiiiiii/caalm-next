/**
 * Builds a directed assignment graph from user-management "Assigned by"
 * values. Access grant answers "who gave this person their account or role",
 * not who they report to at work. Layout matches the reporting org chart:
 * rank on one axis, siblings stacked on the other, parent centered.
 */

import {
	type GraphOrientation,
	isTopDownOrientation,
} from "@/lib/users/graph-orientation";

export const SYSTEM_NODE_ID = "system";

export type AssignmentEdgeKind = "system" | "admin";

export type AssignmentGraphUser = {
	$id: string;
	fullName: string;
	accountId?: string;
	roleName?: string;
	assignedById?: string;
	assignedByName?: string;
};

export type AssignmentGraphNodeKind = "system" | "user" | "ghost";

export type AssignmentGraphPoint = { x: number; y: number };

export type AssignmentGraphNode = {
	id: string;
	kind: AssignmentGraphNodeKind;
	label: string;
	roleLabel: string;
	initials: string;
	/** Profile id when this node is a real user (clickable). */
	userId?: string;
	/** How this person received their role (System node is "system"). */
	assignerKind: AssignmentEdgeKind;
	/** Center of the 42px square. */
	x: number;
	y: number;
};

export type AssignmentGraphEdge = {
	fromId: string;
	toId: string;
	kind: AssignmentEdgeKind;
	/** Orthogonal polyline, start at assigner and end at assignee. */
	points: AssignmentGraphPoint[];
	junctions: AssignmentGraphPoint[];
};

export type AssignmentGraphLayout = {
	nodes: AssignmentGraphNode[];
	edges: AssignmentGraphEdge[];
	width: number;
	height: number;
};

export const GRAPH_NODE_SIZE = 42;
export const GRAPH_RANK_GAP = 112;
export const GRAPH_MIN_COL_WIDTH = 108;
export const GRAPH_PAD_X = 48;
export const GRAPH_PAD_Y = 36;
export const GRAPH_BUS_STUB = 24;
export const GRAPH_LABEL_BLOCK = 40;
export const GRAPH_JUNCTION_SIZE = 7;

/** Card size used by the interactive React Flow canvas (top-left origin). */
export const FLOW_CARD_WIDTH = 252;
export const FLOW_CARD_HEIGHT = 176;
/** Vertical gap between stacked sibling cards. */
export const FLOW_ROW_GAP = 20;
/** Horizontal gap between tree levels (handles + a short bezier). */
export const FLOW_COL_GAP = 56;
/** Vertical span reserved for one leaf row. */
export const FLOW_ROW_EXTENT = FLOW_CARD_HEIGHT + FLOW_ROW_GAP;
/** Horizontal gap between tree levels (System on the left, reports to the right). */
export const FLOW_RANK_GAP = FLOW_CARD_WIDTH + FLOW_COL_GAP;
/** Vertical gap between tree levels in top-down layout. */
export const FLOW_TB_RANK_GAP = FLOW_CARD_HEIGHT + FLOW_COL_GAP;
/** Horizontal span reserved for one card in top-down sibling rows. */
export const FLOW_TB_COL_EXTENT = FLOW_CARD_WIDTH + FLOW_ROW_GAP;

export const SYSTEM_ASSIGN_COLOR = "#0f5384";
export const ADMIN_ASSIGN_COLOR = "#03afbf";

const GHOST_PREFIX = "ghost:";

export function graphInitials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
	if (parts.length === 0) return "?";
	return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function isSystemAssigner(id?: string, name?: string): boolean {
	const raw = (id || "").trim();
	const rawLower = raw.toLowerCase();
	if (rawLower === "system" || rawLower === "admin_manual") return true;
	const label = (name || "").trim();
	if (!raw && (!label || label.toLowerCase() === "system")) return true;
	return false;
}

/** Person-to-person lines only. System/ghost assigners have no inbound edge (a cut). */
export function isDrawnAssignmentSource(fromId: string): boolean {
	return fromId !== SYSTEM_NODE_ID && !fromId.startsWith(GHOST_PREFIX);
}

export function ghostAssignerId(label: string): string {
	return `${GHOST_PREFIX}${label.trim().toLowerCase()}`;
}

function uniqueNameMatches(
	name: string,
	users: AssignmentGraphUser[],
): AssignmentGraphUser[] {
	const needle = name.trim().toLowerCase();
	if (!needle) return [];
	return users.filter((user) => user.fullName.trim().toLowerCase() === needle);
}

/**
 * Resolve the "Assigned by" cell to a node id. Prefer the stored assigner
 * id (profile or account). Fall back to a unique name match so older rows
 * that only have a display name still produce a real edge.
 */
export function resolveAssignerNodeId(
	user: AssignmentGraphUser,
	lookupUsers: AssignmentGraphUser[],
): string {
	if (isSystemAssigner(user.assignedById, user.assignedByName)) {
		return SYSTEM_NODE_ID;
	}

	const byId = new Map(lookupUsers.map((item) => [item.$id, item]));
	const byAccount = new Map(
		lookupUsers
			.filter((item) => item.accountId)
			.map((item) => [item.accountId as string, item]),
	);

	const rawId = (user.assignedById || "").trim();
	if (rawId && byId.has(rawId)) return rawId;
	if (rawId && byAccount.has(rawId)) return byAccount.get(rawId)?.$id || rawId;

	const rawName = (user.assignedByName || "").trim();
	const named = uniqueNameMatches(rawName, lookupUsers);
	if (named.length === 1) return named[0].$id;

	if (rawName && rawName.toLowerCase() !== "system") {
		return ghostAssignerId(rawName);
	}
	if (rawId) return ghostAssignerId(rawId);
	return SYSTEM_NODE_ID;
}

export function collectGraphUsers(
	visibleUsers: AssignmentGraphUser[],
	allUsers: AssignmentGraphUser[],
): AssignmentGraphUser[] {
	const included = new Map<string, AssignmentGraphUser>();
	for (const user of visibleUsers) {
		included.set(user.$id, user);
	}

	const queue = [...visibleUsers];
	while (queue.length > 0) {
		const current = queue.pop();
		if (!current) continue;
		const assignerId = resolveAssignerNodeId(current, allUsers);
		if (assignerId === SYSTEM_NODE_ID || assignerId.startsWith(GHOST_PREFIX)) {
			continue;
		}
		if (included.has(assignerId)) continue;
		const assigner = allUsers.find((item) => item.$id === assignerId);
		if (!assigner) continue;
		included.set(assigner.$id, assigner);
		queue.push(assigner);
	}

	return [...included.values()];
}

type TreeChildMap = Map<string, string[]>;

export function wouldCreateCycle(
	parentId: string,
	childId: string,
	parentOf: Map<string, string>,
): boolean {
	let cursor: string | undefined = parentId;
	const seen = new Set<string>();
	while (cursor) {
		if (cursor === childId) return true;
		if (seen.has(cursor)) return true;
		seen.add(cursor);
		cursor = parentOf.get(cursor);
	}
	return false;
}

function buildParentChildMaps(
	users: AssignmentGraphUser[],
	lookup: AssignmentGraphUser[],
) {
	const parentOf = new Map<string, string>();
	const childrenOf: TreeChildMap = new Map();
	const edges: Array<{
		fromId: string;
		toId: string;
		kind: AssignmentEdgeKind;
	}> = [];

	const ensureChildList = (id: string) => {
		if (!childrenOf.has(id)) childrenOf.set(id, []);
		return childrenOf.get(id) as string[];
	};

	ensureChildList(SYSTEM_NODE_ID);

	for (const user of users) {
		const fromId = resolveAssignerNodeId(user, lookup);
		const kind: AssignmentEdgeKind =
			fromId === SYSTEM_NODE_ID ? "system" : "admin";
		edges.push({ fromId, toId: user.$id, kind });

		const layoutParent = wouldCreateCycle(fromId, user.$id, parentOf)
			? SYSTEM_NODE_ID
			: fromId;
		parentOf.set(user.$id, layoutParent);
		ensureChildList(layoutParent).push(user.$id);
		ensureChildList(user.$id);
	}

	return { parentOf, childrenOf, edges };
}

function subtreeWidth(
	id: string,
	childrenOf: TreeChildMap,
	memo: Map<string, number>,
): number {
	const cached = memo.get(id);
	if (cached != null) return cached;
	const kids = childrenOf.get(id) || [];
	if (kids.length === 0) {
		memo.set(id, GRAPH_MIN_COL_WIDTH);
		return GRAPH_MIN_COL_WIDTH;
	}
	const width = Math.max(
		GRAPH_MIN_COL_WIDTH,
		kids.reduce((sum, child) => sum + subtreeWidth(child, childrenOf, memo), 0),
	);
	memo.set(id, width);
	return width;
}

function uniqueJunctions(
	points: AssignmentGraphPoint[],
): AssignmentGraphPoint[] {
	const seen = new Set<string>();
	const next: AssignmentGraphPoint[] = [];
	for (const point of points) {
		const key = `${Math.round(point.x)}:${Math.round(point.y)}`;
		if (seen.has(key)) continue;
		seen.add(key);
		next.push(point);
	}
	return next;
}

function routeOrthogonal(
	from: AssignmentGraphPoint,
	to: AssignmentGraphPoint,
	busY: number,
): { points: AssignmentGraphPoint[]; junctions: AssignmentGraphPoint[] } {
	const start = { x: from.x, y: from.y + GRAPH_NODE_SIZE / 2 };
	const end = { x: to.x, y: to.y - GRAPH_NODE_SIZE / 2 };
	const busFrom = { x: from.x, y: busY };
	const busTo = { x: to.x, y: busY };

	const points: AssignmentGraphPoint[] = [start, busFrom];
	if (from.x !== to.x) points.push(busTo);
	points.push(end);

	// Junctions sit at every turn or branch — the Tailscale visual tic.
	const junctions = uniqueJunctions([busFrom, busTo]);
	return { points, junctions };
}

/**
 * Axis-aligned segment vs node box. Used to prove connectors do not
 * cut through squares (they ride a bus between ranks instead).
 */
export function segmentIntersectsNodeBox(
	a: AssignmentGraphPoint,
	b: AssignmentGraphPoint,
	node: AssignmentGraphPoint,
	size = GRAPH_NODE_SIZE,
): boolean {
	const half = size / 2 - 0.5;
	const left = node.x - half;
	const right = node.x + half;
	const top = node.y - half;
	const bottom = node.y + half;

	const minX = Math.min(a.x, b.x);
	const maxX = Math.max(a.x, b.x);
	const minY = Math.min(a.y, b.y);
	const maxY = Math.max(a.y, b.y);

	const overlapsX = maxX >= left && minX <= right;
	const overlapsY = maxY >= top && minY <= bottom;
	return overlapsX && overlapsY;
}

export function nodesOverlap(
	a: AssignmentGraphPoint,
	b: AssignmentGraphPoint,
	size = GRAPH_NODE_SIZE,
): boolean {
	return Math.abs(a.x - b.x) < size - 0.5 && Math.abs(a.y - b.y) < size - 0.5;
}

export function layoutAssignmentGraph(
	visibleUsers: AssignmentGraphUser[],
	allUsers: AssignmentGraphUser[] = visibleUsers,
): AssignmentGraphLayout {
	const graphUsers = collectGraphUsers(visibleUsers, allUsers);
	const lookup = allUsers.length > 0 ? allUsers : graphUsers;
	const { childrenOf, edges: rawEdges } = buildParentChildMaps(
		graphUsers,
		lookup,
	);

	const ghostIds = new Set<string>();
	for (const edge of rawEdges) {
		if (edge.fromId.startsWith(GHOST_PREFIX)) ghostIds.add(edge.fromId);
	}

	const widthMemo = new Map<string, number>();
	const positions = new Map<string, AssignmentGraphPoint>();

	const forestRoots = [SYSTEM_NODE_ID, ...ghostIds];
	const rootWidth = forestRoots.reduce(
		(sum, id) => sum + subtreeWidth(id, childrenOf, widthMemo),
		0,
	);

	const place = (id: string, left: number, depth: number) => {
		const width = subtreeWidth(id, childrenOf, widthMemo);
		positions.set(id, {
			x: left + width / 2,
			y: GRAPH_PAD_Y + depth * GRAPH_RANK_GAP,
		});
		let cursor = left;
		for (const childId of childrenOf.get(id) || []) {
			const childWidth = subtreeWidth(childId, childrenOf, widthMemo);
			place(childId, cursor, depth + 1);
			cursor += childWidth;
		}
	};

	let rootCursor = GRAPH_PAD_X;
	for (const rootId of forestRoots) {
		const width = subtreeWidth(rootId, childrenOf, widthMemo);
		place(rootId, rootCursor, 0);
		rootCursor += width;
	}

	const assignerKindById = new Map<string, AssignmentEdgeKind>();
	assignerKindById.set(SYSTEM_NODE_ID, "system");
	for (const edge of rawEdges) {
		assignerKindById.set(edge.toId, edge.kind);
	}

	const nodes: AssignmentGraphNode[] = [];

	const systemPos = positions.get(SYSTEM_NODE_ID);
	if (systemPos) {
		nodes.push({
			id: SYSTEM_NODE_ID,
			kind: "system",
			label: "System",
			roleLabel: "Root assigner",
			initials: "SY",
			assignerKind: "system",
			x: systemPos.x,
			y: systemPos.y,
		});
	}

	for (const ghostId of ghostIds) {
		const pos = positions.get(ghostId);
		if (!pos) continue;
		const namedBy =
			graphUsers.find((user) => resolveAssignerNodeId(user, lookup) === ghostId)
				?.assignedByName || ghostId.slice(GHOST_PREFIX.length);
		nodes.push({
			id: ghostId,
			kind: "ghost",
			label: namedBy,
			roleLabel: "Assigner",
			initials: graphInitials(namedBy),
			assignerKind: "admin",
			x: pos.x,
			y: pos.y,
		});
	}

	for (const user of graphUsers) {
		const pos = positions.get(user.$id);
		if (!pos) continue;
		nodes.push({
			id: user.$id,
			kind: "user",
			label: user.fullName,
			roleLabel: user.roleName || "Unassigned",
			initials: graphInitials(user.fullName),
			userId: user.$id,
			assignerKind: assignerKindById.get(user.$id) || "system",
			x: pos.x,
			y: pos.y,
		});
	}

	const nodeById = new Map(nodes.map((node) => [node.id, node]));
	const edges: AssignmentGraphEdge[] = [];

	for (const raw of rawEdges) {
		const from = nodeById.get(raw.fromId);
		const to = nodeById.get(raw.toId);
		if (!from || !to) continue;
		const busY = from.y + GRAPH_NODE_SIZE / 2 + GRAPH_BUS_STUB;
		const routed = routeOrthogonal(from, to, busY);
		edges.push({
			fromId: raw.fromId,
			toId: raw.toId,
			kind: raw.kind,
			points: routed.points,
			junctions: routed.junctions,
		});
	}

	let maxX = GRAPH_PAD_X;
	let maxY = GRAPH_PAD_Y;
	for (const node of nodes) {
		maxX = Math.max(maxX, node.x + GRAPH_MIN_COL_WIDTH / 2);
		maxY = Math.max(maxY, node.y + GRAPH_NODE_SIZE / 2 + GRAPH_LABEL_BLOCK);
	}

	return {
		nodes,
		edges,
		width: Math.ceil(maxX + GRAPH_PAD_X),
		height: Math.ceil(maxY + GRAPH_PAD_Y),
	};
}

function flowRoleRank(roleName?: string): number {
	const name = (roleName || "").trim().toLowerCase();
	if (name === "super admin") return 0;
	if (name === "organization admin") return 1;
	if (name === "executive") return 2;
	if (name === "department manager") return 3;
	if (name === "viewer") return 4;
	return 5;
}

function flowChildOrder(
	ids: string[],
	usersById: Map<string, AssignmentGraphUser>,
): string[] {
	return [...ids].sort((a, b) => {
		const left = usersById.get(a);
		const right = usersById.get(b);
		const rankDelta =
			flowRoleRank(left?.roleName) - flowRoleRank(right?.roleName);
		if (rankDelta !== 0) return rankDelta;
		return (left?.fullName || a).localeCompare(
			right?.fullName || b,
			undefined,
			{
				sensitivity: "base",
			},
		);
	});
}

function flowSubtreeHeight(
	id: string,
	childrenOf: TreeChildMap,
	memo: Map<string, number>,
	usersById: Map<string, AssignmentGraphUser>,
): number {
	const cached = memo.get(id);
	if (cached != null) return cached;
	const kids = flowChildOrder(childrenOf.get(id) || [], usersById);
	if (kids.length === 0) {
		memo.set(id, FLOW_ROW_EXTENT);
		return FLOW_ROW_EXTENT;
	}
	const height = Math.max(
		FLOW_ROW_EXTENT,
		kids.reduce(
			(sum, childId) =>
				sum + flowSubtreeHeight(childId, childrenOf, memo, usersById),
			0,
		),
	);
	memo.set(id, height);
	return height;
}

function flowSubtreeWidth(
	id: string,
	childrenOf: TreeChildMap,
	memo: Map<string, number>,
	usersById: Map<string, AssignmentGraphUser>,
): number {
	const cached = memo.get(id);
	if (cached != null) return cached;
	const kids = flowChildOrder(childrenOf.get(id) || [], usersById);
	if (kids.length === 0) {
		memo.set(id, FLOW_TB_COL_EXTENT);
		return FLOW_TB_COL_EXTENT;
	}
	const width = Math.max(
		FLOW_TB_COL_EXTENT,
		kids.reduce(
			(sum, childId) =>
				sum + flowSubtreeWidth(childId, childrenOf, memo, usersById),
			0,
		),
	);
	memo.set(id, width);
	return width;
}

/**
 * Canvas positions for Access grant. Same packing as reporting: rank along
 * the depth axis, siblings stacked, parent centered on its stack. Saved
 * spots apply in both orientations.
 */
export function seedFlowNodePositions(
	visibleUsers: AssignmentGraphUser[],
	allUsers: AssignmentGraphUser[],
	saved: Map<string, { x: number; y: number }>,
	options?: { orientation?: GraphOrientation },
): Map<string, { x: number; y: number }> {
	const topDown = isTopDownOrientation(options?.orientation);
	const graphUsers = collectGraphUsers(visibleUsers, allUsers);
	const lookup = allUsers.length > 0 ? allUsers : graphUsers;
	const { childrenOf } = buildParentChildMaps(graphUsers, lookup);
	const usersById = new Map(graphUsers.map((user) => [user.$id, user]));

	const ghostIds = new Set<string>();
	for (const user of graphUsers) {
		const fromId = resolveAssignerNodeId(user, lookup);
		if (fromId.startsWith(GHOST_PREFIX)) ghostIds.add(fromId);
	}

	const extentMemo = new Map<string, number>();
	const positions = new Map<string, AssignmentGraphPoint>();
	const forestRoots = [SYSTEM_NODE_ID, ...ghostIds];

	const placeLtr = (id: string, top: number, depth: number) => {
		const kids = flowChildOrder(childrenOf.get(id) || [], usersById);
		let cursor = top;
		for (const childId of kids) {
			const childHeight = flowSubtreeHeight(
				childId,
				childrenOf,
				extentMemo,
				usersById,
			);
			placeLtr(childId, cursor, depth + 1);
			cursor += childHeight;
		}
		const span = flowSubtreeHeight(id, childrenOf, extentMemo, usersById);
		const y =
			kids.length === 0
				? top
				: top + Math.max(0, (span - FLOW_CARD_HEIGHT) / 2);
		positions.set(id, {
			x: GRAPH_PAD_X + depth * FLOW_RANK_GAP,
			y,
		});
	};

	const placeTb = (id: string, left: number, depth: number) => {
		const kids = flowChildOrder(childrenOf.get(id) || [], usersById);
		const subtreeW = flowSubtreeWidth(id, childrenOf, extentMemo, usersById);
		positions.set(id, {
			x:
				kids.length === 0
					? left
					: left + Math.max(0, (subtreeW - FLOW_CARD_WIDTH) / 2),
			y: GRAPH_PAD_Y + depth * FLOW_TB_RANK_GAP,
		});
		let cursor = left;
		for (const childId of kids) {
			const childW = flowSubtreeWidth(
				childId,
				childrenOf,
				extentMemo,
				usersById,
			);
			placeTb(childId, cursor, depth + 1);
			cursor += childW;
		}
	};

	if (topDown) {
		let rootCursor = GRAPH_PAD_X;
		for (const rootId of forestRoots) {
			const width = flowSubtreeWidth(rootId, childrenOf, extentMemo, usersById);
			placeTb(rootId, rootCursor, 0);
			rootCursor += width;
		}
	} else {
		let rootCursor = GRAPH_PAD_Y;
		for (const rootId of forestRoots) {
			const extent = flowSubtreeHeight(
				rootId,
				childrenOf,
				extentMemo,
				usersById,
			);
			placeLtr(rootId, rootCursor, 0);
			rootCursor += extent;
		}
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

export const SPEC_SAMPLE_USERS: AssignmentGraphUser[] = [
	{
		$id: "victor",
		fullName: "Victor Ramirez",
		roleName: "Super Admin",
		assignedByName: "System",
		assignedById: "system",
	},
	{
		$id: "john",
		fullName: "John Doe",
		roleName: "Department Manager",
		assignedByName: "System",
		assignedById: "system",
	},
	{
		$id: "lylla",
		fullName: "Lylla Harrold",
		roleName: "Department Manager",
		assignedByName: "System",
		assignedById: "system",
	},
	{
		$id: "remy",
		fullName: "Remy Ouji",
		roleName: "Organization Admin",
		assignedByName: "System",
		assignedById: "system",
	},
	{
		$id: "jimmy",
		fullName: "Jimmy Hendricks",
		roleName: "Organization Admin",
		assignedByName: "Victor Ramirez",
		assignedById: "victor",
	},
];
