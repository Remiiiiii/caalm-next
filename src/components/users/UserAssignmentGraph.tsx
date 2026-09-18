"use client";

import {
	Background,
	BackgroundVariant,
	ConnectionLineType,
	Controls,
	ReactFlow,
	ReactFlowProvider,
	SelectionMode,
	type Connection,
	type Edge,
	type Node,
	type OnNodeDrag,
	useEdgesState,
	useNodesState,
	useReactFlow,
} from "@xyflow/react";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { AssignmentGraphEdge } from "@/components/users/AssignmentGraphEdge";
import type { UserActionKind } from "@/components/users/UserManagementActionDialogs";
import {
	UserGraphSystemNode,
	UserGraphUserNode,
	type GraphNodeEmphasis,
	type UserGraphUserNodeData,
} from "@/components/users/UserGraphNodes";
import { UserGraphSidebar } from "@/components/users/UserGraphSidebar";
import type { GraphLineage } from "@/components/users/UserManagementViewToggle";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import type { UserManagementUser } from "@/hooks/useUsers";
import {
	ADMIN_ASSIGN_COLOR,
	FLOW_CARD_HEIGHT,
	FLOW_CARD_WIDTH,
	isDrawnAssignmentSource,
	resolveAssignerNodeId,
	seedFlowNodePositions,
	SYSTEM_ASSIGN_COLOR,
	SYSTEM_NODE_ID,
	type AssignmentEdgeKind,
} from "@/lib/users/assignment-graph";
import {
	managerChainIds,
	matrixReportingEdges,
	resolveManagerProfileId,
	seedReportingNodePositions,
	skipLevelManagerId,
} from "@/lib/users/reporting-graph";
import {
	computeGraphSidebarStats,
	userMatchesGraphHighlight,
	type GraphHighlight,
} from "@/lib/users/graph-sidebar-stats";
import { nodeHitsMarquee } from "@/lib/users/graph-marquee";
import { usersVisibleOnGraph } from "@/lib/users/graph-visibility";

import "@xyflow/react/dist/style.css";

const nodeTypes = {
	user: UserGraphUserNode,
	system: UserGraphSystemNode,
};

const edgeTypes = {
	assignment: AssignmentGraphEdge,
};

const POSITION_PATCH_DEBOUNCE_MS = 400;
const GRAPH_DIRECTIONS_DISMISSED_KEY = "user-graph-directions:dismissed";

const CONNECTION_LINE_STYLE = {
	stroke: ADMIN_ASSIGN_COLOR,
	strokeWidth: 2,
	strokeDasharray: "6 4",
};

type ActorLike = {
	$id?: string;
	accountId?: string;
} | null;

function kindForAssigner(fromId: string): AssignmentEdgeKind {
	return fromId === SYSTEM_NODE_ID ? "system" : "admin";
}

function assignmentFlowEdge(
	fromId: string,
	targetUserId: string,
	canEditGraph: boolean,
	onDisconnect: () => void,
	options?: { dashed?: boolean },
): Edge | null {
	if (!options?.dashed && !isDrawnAssignmentSource(fromId)) return null;
	return {
		id: options?.dashed
			? `m-${fromId}-${targetUserId}`
			: `e-${fromId}-${targetUserId}`,
		source: fromId,
		target: targetUserId,
		type: "assignment",
		data: {
			kind: kindForAssigner(fromId),
			canEditGraph: options?.dashed ? false : canEditGraph,
			onDisconnect,
			dashed: options?.dashed,
		},
	};
}

function graphSignature(
	users: UserManagementUser[],
	lookup: UserManagementUser[],
	canEditGraph: boolean,
	canView: boolean,
	canEdit: boolean,
	canDeactivate: boolean,
	canAssignRoles: boolean,
	canImpersonate: boolean,
	lineage: GraphLineage,
): string {
	const userPart = users
		.map(
			(user) =>
				[
					user.$id,
					user.assignedById ?? "",
					user.managerUserId ?? "",
					user.matrixManagerUserId ?? "",
					user.status,
					user.department ?? "",
					user.division ?? "",
					user.jobTitle ?? "",
					user.workLocation ?? "",
					user.costCenterId ?? "",
					user.fullName,
					user.roleName ?? "",
				].join(":"),
		)
		.join("|");
	const lookupPart = lookup.map((user) => user.$id).join(",");
	return `${lineage}#${userPart}#${lookupPart}#${Number(canEditGraph)}${Number(canView)}${Number(canEdit)}${Number(canDeactivate)}${Number(canAssignRoles)}${Number(canImpersonate)}`;
}

function nodeEmphasis(
	nodeId: string,
	user: UserManagementUser | undefined,
	highlight: GraphHighlight | null,
	focusUserId: string | null,
	focusChain: Set<string>,
	stats: ReturnType<typeof computeGraphSidebarStats>,
): GraphNodeEmphasis {
	if (!highlight && !focusUserId) return "normal";
	if (nodeId === SYSTEM_NODE_ID) return "normal";
	if (!user) return "dim";
	if (focusUserId) return focusChain.has(user.$id) ? "match" : "dim";
	return userMatchesGraphHighlight(user, highlight, stats) ? "match" : "dim";
}

async function fetchOptionalJson<T>(url: string): Promise<T | null> {
	try {
		const res = await fetch(url, { credentials: "same-origin" });
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

function UserAssignmentGraphCanvas({
	users,
	allUsers,
	lineage,
	canEditGraph,
	canView,
	canEdit,
	canDeactivate,
	canAssignRoles,
	canImpersonate,
	actor,
	onAction,
	onRefresh,
}: {
	users: UserManagementUser[];
	allUsers: UserManagementUser[];
	lineage: GraphLineage;
	canEditGraph: boolean;
	canView: boolean;
	canEdit: boolean;
	canDeactivate: boolean;
	canAssignRoles: boolean;
	canImpersonate: boolean;
	actor: ActorLike;
	onAction: (
		user: UserManagementUser,
		kind: Exclude<UserActionKind, null>,
	) => void;
	onRefresh: () => void;
}) {
	const { toast } = useToast();
	const { fitView, screenToFlowPosition } = useReactFlow();
	const { orgId } = useOrganization();
	const [highlight, setHighlight] = useState<GraphHighlight | null>(null);
	const [focusUserId, setFocusUserId] = useState<string | null>(null);
	const [directionsDismissed, setDirectionsDismissed] = useState(false);
	const [rightMarquee, setRightMarquee] = useState<{
		x: number;
		y: number;
		w: number;
		h: number;
	} | null>(null);
	const canvasRef = useRef<HTMLDivElement>(null);
	const rightSelectRef = useRef<{
		pointerId: number;
		startClientX: number;
		startClientY: number;
	} | null>(null);
	const rightSelectCleanupRef = useRef<(() => void) | null>(null);
	const positionsRef = useRef(new Map<string, { x: number; y: number }>());
	const positionTimersRef = useRef(
		new Map<string, ReturnType<typeof setTimeout>>(),
	);
	const signatureRef = useRef("");
	const onActionRef = useRef(onAction);
	onActionRef.current = onAction;
	const onRefreshRef = useRef(onRefresh);
	onRefreshRef.current = onRefresh;
	const disconnectRef = useRef<(userId: string) => void>(() => undefined);
	const disconnectingRef = useRef(new Set<string>());

	useEffect(() => {
		setDirectionsDismissed(
			window.localStorage.getItem(GRAPH_DIRECTIONS_DISMISSED_KEY) === "true",
		);
	}, []);

	useEffect(() => {
		const timers = positionTimersRef.current;
		return () => {
			for (const timer of timers.values()) clearTimeout(timer);
			timers.clear();
		};
	}, []);

	const reassign = useCallback(
		async (targetUserId: string, assignerUserId: string) => {
			const res = await fetch(
				`/api/users/${encodeURIComponent(targetUserId)}/reassign-assigner`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ assignerUserId }),
				},
			);
			const json = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(
					(json as { error?: string }).error || "Could not update assignment",
				);
			}
			onRefreshRef.current();
		},
		[],
	);

	const reassignReportingManager = useCallback(
		async (targetUserId: string, managerUserId: string | null) => {
			const res = await fetch(
				`/api/users/${encodeURIComponent(targetUserId)}/reassign-manager`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ managerUserId }),
				},
			);
			const json = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(
					(json as { error?: string }).error || "Could not update manager",
				);
			}
			onRefreshRef.current();
		},
		[],
	);

	const graphUsers = useMemo(
		() => usersVisibleOnGraph(users, actor),
		[users, actor],
	);
	const lookup = useMemo(
		() => usersVisibleOnGraph(allUsers.length > 0 ? allUsers : users, actor),
		[allUsers, users, actor],
	);
	const sidebarStats = useMemo(
		() => computeGraphSidebarStats(lookup),
		[lookup],
	);

	const planUsageKey = orgId
		? `/api/users/plan-usage?orgId=${encodeURIComponent(orgId)}`
		: null;
	const invitesKey = orgId
		? `/api/invitations?orgId=${encodeURIComponent(orgId)}`
		: null;
	const { data: planUsage } = useSWR(
		planUsageKey,
		fetchOptionalJson<{
			tier: string;
			users: { used: number | null; limit: number };
		}>,
		{ revalidateOnFocus: false, shouldRetryOnError: false },
	);
	const { data: invitesPayload } = useSWR(
		invitesKey,
		fetchOptionalJson<{ data: Array<{ $id: string; name: string; email: string; role: string }> }>,
		{ revalidateOnFocus: false, shouldRetryOnError: false },
	);

	const focusChain = useMemo(() => {
		if (!focusUserId) return new Set<string>();
		return new Set(managerChainIds(focusUserId, lookup));
	}, [focusUserId, lookup]);

	const initial = useMemo(() => {
		const saved = new Map<string, { x: number; y: number }>();
		for (const user of lookup) {
			const local = positionsRef.current.get(user.$id);
			if (local) {
				saved.set(user.$id, local);
				continue;
			}
			if (
				typeof user.diagramPositionX === "number" &&
				typeof user.diagramPositionY === "number"
			) {
				saved.set(user.$id, {
					x: user.diagramPositionX,
					y: user.diagramPositionY,
				});
			}
		}
		const seeded =
			lineage === "reporting"
				? seedReportingNodePositions(graphUsers, lookup, saved)
				: seedFlowNodePositions(graphUsers, lookup, saved);
		const usersById = new Map(lookup.map((user) => [user.$id, user]));

		const nodes: Node[] = [];
		if (lineage === "assignment") {
			const systemPos = seeded.get(SYSTEM_NODE_ID) || { x: 48, y: 36 };
			nodes.push({
				id: SYSTEM_NODE_ID,
				type: "system",
				position: systemPos,
				draggable: canEditGraph,
				dragHandle: canEditGraph ? ".node-drag-handle" : undefined,
				data: {
					canEditGraph,
					emphasis: "normal" as GraphNodeEmphasis,
				},
			});
		}

		for (const [id, position] of seeded) {
			if (id === SYSTEM_NODE_ID || id.startsWith("ghost:")) continue;
			const user = usersById.get(id);
			if (!user) continue;
			const fromId = resolveAssignerNodeId(user, lookup);
			const skipId = skipLevelManagerId(user.$id, lookup);
			nodes.push({
				id: user.$id,
				type: "user",
				position,
				draggable: canEditGraph,
				dragHandle: canEditGraph ? ".node-drag-handle" : undefined,
				data: {
					user,
					assignerKind: kindForAssigner(fromId),
					lineage,
					skipLevelName: skipId ? usersById.get(skipId)?.fullName || null : null,
					canEditGraph,
					canView,
					canEdit,
					canDeactivate,
					canAssignRoles,
					canImpersonate,
					actor,
					emphasis: "normal" as GraphNodeEmphasis,
					onAction: (
						nextUser: UserManagementUser,
						kind: Exclude<UserActionKind, null>,
					) => onActionRef.current(nextUser, kind),
				} satisfies UserGraphUserNodeData,
			});
		}

		const edges: Edge[] =
			lineage === "reporting"
				? [
						...graphUsers.flatMap((user) => {
							const fromId = resolveManagerProfileId(user, lookup);
							if (!fromId) return [];
							const edge = assignmentFlowEdge(
								fromId,
								user.$id,
								canEditGraph,
								() => disconnectRef.current(user.$id),
							);
							return edge ? [edge] : [];
						}),
						...matrixReportingEdges(graphUsers, lookup).flatMap((pair) => {
							if (!seeded.has(pair.fromId) || !seeded.has(pair.toId)) {
								return [];
							}
							const edge = assignmentFlowEdge(
								pair.fromId,
								pair.toId,
								false,
								() => undefined,
								{ dashed: true },
							);
							return edge ? [edge] : [];
						}),
					]
				: graphUsers.flatMap((user) => {
						const fromId = resolveAssignerNodeId(user, lookup);
						const edge = assignmentFlowEdge(
							fromId,
							user.$id,
							canEditGraph,
							() => disconnectRef.current(user.$id),
						);
						return edge ? [edge] : [];
					});

		return { nodes, edges };
	}, [
		graphUsers,
		lookup,
		canEditGraph,
		canView,
		canEdit,
		canDeactivate,
		canAssignRoles,
		canImpersonate,
		actor,
		lineage,
	]);

	const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

	const disconnectUser = useCallback(
		(targetUserId: string) => {
			if (!canEditGraph || !targetUserId) return;
			if (disconnectingRef.current.has(targetUserId)) return;
			disconnectingRef.current.add(targetUserId);

			let snapshot: Edge[] = [];
			setEdges((current) => {
				snapshot = current;
				return current.filter((edge) => edge.target !== targetUserId);
			});
			setNodes((current) =>
				current.map((node) => {
					if (node.id !== targetUserId || node.type !== "user") return node;
					return {
						...node,
						data: { ...node.data, assignerKind: "system" },
					};
				}),
			);

			void (
				lineage === "reporting"
					? reassignReportingManager(targetUserId, null)
					: reassign(targetUserId, "system")
			)
				.catch((error: unknown) => {
					setEdges(snapshot);
					toast({
						title: "Could not disconnect",
						description:
							error instanceof Error ? error.message : "Try again",
						variant: "destructive",
					});
					onRefreshRef.current();
				})
				.finally(() => {
					disconnectingRef.current.delete(targetUserId);
				});
		},
		[canEditGraph, lineage, reassign, reassignReportingManager, setEdges, setNodes, toast],
	);
	disconnectRef.current = disconnectUser;

	const signature = useMemo(
		() =>
			graphSignature(
				graphUsers,
				lookup,
				canEditGraph,
				canView,
				canEdit,
				canDeactivate,
				canAssignRoles,
				canImpersonate,
				lineage,
			),
		[
			graphUsers,
			lookup,
			canEditGraph,
			canView,
			canEdit,
			canDeactivate,
			canAssignRoles,
			canImpersonate,
			lineage,
		],
	);

	const withEmphasis = useCallback(
		(list: Node[]) =>
			list.map((node) => {
				const user =
					node.type === "user"
						? (node.data as UserGraphUserNodeData).user
						: undefined;
				const emphasis = nodeEmphasis(
					node.id,
					user,
					highlight,
					focusUserId,
					focusChain,
					sidebarStats,
				);
				if (
					(node.data as { emphasis?: GraphNodeEmphasis }).emphasis === emphasis
				) {
					return node;
				}
				return { ...node, data: { ...node.data, emphasis } };
			}),
		[highlight, focusUserId, focusChain, sidebarStats],
	);

	useEffect(() => {
		if (signatureRef.current === signature) return;
		signatureRef.current = signature;
		setNodes(withEmphasis(initial.nodes));
		setEdges(initial.edges);
	}, [signature, initial, withEmphasis, setNodes, setEdges]);

	useEffect(() => {
		setNodes((current) => {
			const next = withEmphasis(current);
			const unchanged = next.every((node, index) => node === current[index]);
			return unchanged ? current : next;
		});
	}, [withEmphasis, setNodes]);

	const onConnect = useCallback(
		(connection: Connection) => {
			if (!canEditGraph) return;
			const source = connection.source;
			const target = connection.target;
			if (!source || !target || target === SYSTEM_NODE_ID) return;
			if (source === target) return;

			if (lineage === "assignment" && source === SYSTEM_NODE_ID) {
				disconnectRef.current(target);
				return;
			}

			const previous = edges;
			const nextEdge = assignmentFlowEdge(
				source,
				target,
				canEditGraph,
				() => disconnectRef.current(target),
			);
			setEdges((current) => {
				const withoutInbound = current.filter(
					(edge) =>
						edge.target !== target ||
						Boolean((edge.data as { dashed?: boolean } | undefined)?.dashed),
				);
				return nextEdge ? [...withoutInbound, nextEdge] : withoutInbound;
			});

			const persist =
				lineage === "reporting"
					? reassignReportingManager(target, source)
					: reassign(target, source);

			void persist.catch((error: unknown) => {
				setEdges(previous);
				toast({
					title:
						lineage === "reporting"
							? "Could not update manager"
							: "Could not update assignment",
					description:
						error instanceof Error ? error.message : "Try again",
					variant: "destructive",
				});
			});
		},
		[
			canEditGraph,
			edges,
			lineage,
			reassign,
			reassignReportingManager,
			setEdges,
			toast,
		],
	);

	const persistNodePosition = useCallback(
		(node: Node) => {
			positionsRef.current.set(node.id, node.position);
			if (node.id === SYSTEM_NODE_ID) return;

			const existing = positionTimersRef.current.get(node.id);
			if (existing) clearTimeout(existing);
			positionTimersRef.current.set(
				node.id,
				setTimeout(() => {
					positionTimersRef.current.delete(node.id);
					void fetch(
						`/api/users/${encodeURIComponent(node.id)}/diagram-position`,
						{
							method: "PATCH",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								x: node.position.x,
								y: node.position.y,
							}),
						},
					).then(async (res) => {
						if (!res.ok) {
							const json = await res.json().catch(() => ({}));
							toast({
								title: "Could not save layout",
								description:
									(json as { error?: string }).error ||
									"Position was not saved",
								variant: "destructive",
							});
						}
					});
				}, POSITION_PATCH_DEBOUNCE_MS),
			);
		},
		[toast],
	);

	const onNodeDragStop: OnNodeDrag = useCallback(
		(_event, node, dragged) => {
			if (!canEditGraph) return;
			const moved = dragged.length > 0 ? dragged : [node];
			for (const item of moved) persistNodePosition(item);
		},
		[canEditGraph, persistNodePosition],
	);

	const isValidConnection = useCallback((connection: Connection | Edge) => {
		if (!connection.source || !connection.target) return false;
		if (connection.target === SYSTEM_NODE_ID) return false;
		if (connection.source === connection.target) return false;
		return true;
	}, []);

	const handleSelectHighlight = useCallback((next: GraphHighlight | null) => {
		setHighlight(next);
		setFocusUserId(null);
	}, []);

	const handleFocusUser = useCallback(
		(userId: string | null) => {
			setFocusUserId(userId);
			setHighlight(null);
			if (!userId) return;
			window.requestAnimationFrame(() => {
				void fitView({ nodes: [{ id: userId }], padding: 0.45, duration: 380 });
			});
		},
		[fitView],
	);

	const handleClearHighlight = useCallback(() => {
		setHighlight(null);
		setFocusUserId(null);
	}, []);

	const localBoxFromClient = (clientX: number, clientY: number) => {
		const rect = canvasRef.current?.getBoundingClientRect();
		if (!rect) return { x: 0, y: 0 };
		return { x: clientX - rect.left, y: clientY - rect.top };
	};

	const applyRightMarquee = useCallback(
		(startClientX: number, startClientY: number, clientX: number, clientY: number) => {
			const start = localBoxFromClient(startClientX, startClientY);
			const end = localBoxFromClient(clientX, clientY);
			setRightMarquee({
				x: Math.min(start.x, end.x),
				y: Math.min(start.y, end.y),
				w: Math.abs(end.x - start.x),
				h: Math.abs(end.y - start.y),
			});
		},
		[],
	);

	const finishRightSelect = useCallback(
		(clientX: number, clientY: number) => {
			const start = rightSelectRef.current;
			rightSelectRef.current = null;
			setRightMarquee(null);
			if (!start || !canEditGraph) return;
			const a = screenToFlowPosition({
				x: start.startClientX,
				y: start.startClientY,
			});
			const b = screenToFlowPosition({ x: clientX, y: clientY });
			const box = {
				x: Math.min(a.x, b.x),
				y: Math.min(a.y, b.y),
				width: Math.abs(b.x - a.x),
				height: Math.abs(b.y - a.y),
			};
			if (box.width < 8 && box.height < 8) return;
			setNodes((current) =>
				current.map((node) => {
					const selected = nodeHitsMarquee(
						node,
						box,
						FLOW_CARD_WIDTH,
						FLOW_CARD_HEIGHT,
					);
					return node.selected === selected ? node : { ...node, selected };
				}),
			);
		},
		[canEditGraph, screenToFlowPosition, setNodes],
	);

	useEffect(() => {
		const el = canvasRef.current;
		if (!el || !canEditGraph) return;

		const onDown = (event: PointerEvent) => {
			if (event.button !== 2) return;
			const target = event.target;
			if (
				target instanceof Element &&
				target !== el &&
				target.closest("button, a, input")
			) {
				return;
			}
			event.preventDefault();
			rightSelectCleanupRef.current?.();
			rightSelectRef.current = {
				pointerId: event.pointerId,
				startClientX: event.clientX,
				startClientY: event.clientY,
			};
			applyRightMarquee(
				event.clientX,
				event.clientY,
				event.clientX,
				event.clientY,
			);

			const onMove = (moveEvent: PointerEvent) => {
				const start = rightSelectRef.current;
				if (!start || moveEvent.pointerId !== start.pointerId) return;
				applyRightMarquee(
					start.startClientX,
					start.startClientY,
					moveEvent.clientX,
					moveEvent.clientY,
				);
			};
			const onUp = (upEvent: PointerEvent) => {
				const start = rightSelectRef.current;
				if (!start || upEvent.pointerId !== start.pointerId) return;
				rightSelectCleanupRef.current?.();
				finishRightSelect(upEvent.clientX, upEvent.clientY);
			};
			window.addEventListener("pointermove", onMove);
			window.addEventListener("pointerup", onUp);
			window.addEventListener("pointercancel", onUp);
			rightSelectCleanupRef.current = () => {
				window.removeEventListener("pointermove", onMove);
				window.removeEventListener("pointerup", onUp);
				window.removeEventListener("pointercancel", onUp);
				rightSelectCleanupRef.current = null;
			};
		};

		const onContextMenu = (event: Event) => {
			event.preventDefault();
		};

		el.addEventListener("pointerdown", onDown);
		el.addEventListener("contextmenu", onContextMenu);
		return () => {
			el.removeEventListener("pointerdown", onDown);
			el.removeEventListener("contextmenu", onContextMenu);
			rightSelectCleanupRef.current?.();
		};
	}, [applyRightMarquee, canEditGraph, finishRightSelect]);

	useEffect(() => {
		window.requestAnimationFrame(() => {
			void fitView({ padding: 0.18, duration: 280 });
		});
	}, [lineage, fitView]);

	return (
		<div className="relative h-[min(76vh,880px)] overflow-hidden">
			<div className="absolute inset-y-0 left-0 z-20">
				<UserGraphSidebar
					users={lookup}
					stats={sidebarStats}
					highlight={highlight}
					onSelectHighlight={handleSelectHighlight}
					focusUserId={focusUserId}
					onFocusUser={handleFocusUser}
					onAssignUser={(user) => handleFocusUser(user.$id)}
					canAssign={canEditGraph}
					planUsage={planUsage ?? null}
					pendingInvites={invitesPayload?.data ?? null}
				/>
			</div>

			<div
				ref={canvasRef}
				data-testid="user-graph-canvas"
				className="relative h-full min-w-0"
			>
				{canEditGraph && !directionsDismissed ? (
					<div className="pointer-events-none absolute top-3 left-65 right-0 z-10 flex justify-center">
						<div className="flex max-w-xs items-start gap-2 rounded-xl border border-slate-200 bg-white/85 px-3 py-1.5 text-left text-[11px] leading-snug text-slate-600">
							<p>
								Drag a card to move it · drag a dot to a card to connect · hover
								a line and click the scissors to disconnect
							</p>
							<button
								type="button"
								onClick={() => {
									setDirectionsDismissed(true);
									window.localStorage.setItem(
										GRAPH_DIRECTIONS_DISMISSED_KEY,
										"true",
									);
								}}
								aria-label="Close directions"
								className="pointer-events-auto flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-all duration-200 hover:bg-blue/10 hover:text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						</div>
					</div>
				) : null}

				<div
					role="group"
					className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-3.5 text-[11px] text-slate-500"
					aria-label={
						lineage === "reporting"
							? "Reporting color legend"
							: "Assignment color legend"
					}
				>
					{lineage === "reporting" ? (
						<>
							<span className="flex items-center gap-1.5">
								<span
									className="inline-block h-0.5 w-2.5 rounded-sm"
									style={{ backgroundColor: ADMIN_ASSIGN_COLOR }}
									aria-hidden
								/>
								Reports to
							</span>
							<span className="flex items-center gap-1.5">
								<span
									className="inline-block h-0.5 w-2.5 rounded-sm border-t border-dashed"
									style={{ borderColor: SYSTEM_ASSIGN_COLOR }}
									aria-hidden
								/>
								Matrix manager
							</span>
						</>
					) : (
						<>
							<span className="flex items-center gap-1.5">
								<span
									className="inline-block h-0.5 w-2.5 rounded-sm"
									style={{ backgroundColor: SYSTEM_ASSIGN_COLOR }}
									aria-hidden
								/>
								System assigned
							</span>
							<span className="flex items-center gap-1.5">
								<span
									className="inline-block h-0.5 w-2.5 rounded-sm"
									style={{ backgroundColor: ADMIN_ASSIGN_COLOR }}
									aria-hidden
								/>
								Admin assigned
							</span>
						</>
					)}
				</div>

				<ReactFlow
					nodes={nodes}
					edges={edges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onConnect={onConnect}
					onEdgeClick={(_event, edge) => {
						if (!canEditGraph) return;
						if ((edge.data as { dashed?: boolean } | undefined)?.dashed) return;
						disconnectRef.current(edge.target);
					}}
					onNodeDragStop={onNodeDragStop}
					nodeTypes={nodeTypes}
					edgeTypes={edgeTypes}
					nodesDraggable={canEditGraph}
					nodesConnectable={canEditGraph}
					edgesReconnectable={false}
					elementsSelectable={canEditGraph}
					selectionOnDrag={false}
					selectionMode={SelectionMode.Partial}
					selectNodesOnDrag={false}
					deleteKeyCode={null}
					panOnDrag={[0, 1]}
					onPaneContextMenu={(event) => event.preventDefault()}
					onNodeContextMenu={(event) => event.preventDefault()}
					zoomOnScroll
					fitView
					fitViewOptions={{ padding: 0.18 }}
					minZoom={0.2}
					maxZoom={1.5}
					isValidConnection={isValidConnection}
					onNodeClick={(_event, node) => {
						if (node.id === SYSTEM_NODE_ID || node.type !== "user") return;
						const userId = (node.data as UserGraphUserNodeData).user?.$id;
						if (userId) handleFocusUser(userId);
					}}
					onPaneClick={handleClearHighlight}
					connectionLineType={ConnectionLineType.Bezier}
					connectionLineStyle={CONNECTION_LINE_STYLE}
					onInit={(instance) => {
						window.requestAnimationFrame(() => {
							void instance.fitView({ padding: 0.18 });
						});
					}}
					proOptions={{ hideAttribution: true }}
					className="user-graph-flow h-full w-full [&_.react-flow__edge-interaction]:[vector-effect:non-scaling-stroke]"
				>
					<Background
						id="assignment-grid"
						variant={BackgroundVariant.Lines}
						gap={40}
						lineWidth={1}
						color="rgba(0, 0, 0, 0.03)"
					/>
					<Controls
						position="bottom-right"
						showInteractive={false}
						className="shadow-md! border-slate-200! overflow-hidden! rounded-md!"
					/>
				</ReactFlow>
				{rightMarquee ? (
					<div
						className="pointer-events-none absolute z-30 border border-[#0f5384]/45 bg-[#0f5384]/8"
						style={{
							left: rightMarquee.x,
							top: rightMarquee.y,
							width: rightMarquee.w,
							height: rightMarquee.h,
						}}
					/>
				) : null}
			</div>
		</div>
	);
}

export function UserAssignmentGraph({
	users,
	allUsers,
	lineage,
	canEditGraph,
	canView,
	canEdit,
	canDeactivate,
	canAssignRoles = false,
	canImpersonate = false,
	actor = null,
	onAction,
	onRefresh,
}: {
	users: UserManagementUser[];
	allUsers: UserManagementUser[];
	lineage: GraphLineage;
	canEditGraph: boolean;
	canView: boolean;
	canEdit: boolean;
	canDeactivate: boolean;
	canAssignRoles?: boolean;
	canImpersonate?: boolean;
	actor?: ActorLike;
	onAction: (
		user: UserManagementUser,
		kind: Exclude<UserActionKind, null>,
	) => void;
	onRefresh: () => void;
}) {
	return (
		<ReactFlowProvider>
			<UserAssignmentGraphCanvas
					users={users}
					allUsers={allUsers}
					lineage={lineage}
					canEditGraph={canEditGraph}
					canView={canView}
					canEdit={canEdit}
					canDeactivate={canDeactivate}
					canAssignRoles={canAssignRoles}
					canImpersonate={canImpersonate}
					actor={actor}
					onAction={onAction}
					onRefresh={onRefresh}
				/>
		</ReactFlowProvider>
	);
}
