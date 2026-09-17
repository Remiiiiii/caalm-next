"use client";

import { Cpu } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { UserManagementUser } from "@/hooks/useUsers";
import {
	type AssignmentEdgeKind,
	type AssignmentGraphNode,
	GRAPH_JUNCTION_SIZE,
	GRAPH_NODE_SIZE,
	layoutAssignmentGraph,
} from "@/lib/users/assignment-graph";
import { cn } from "@/lib/utils";

const SYSTEM_COLOR = "#0f5384";
const ADMIN_COLOR = "#03afbf";

function kindColor(kind: AssignmentEdgeKind): string {
	return kind === "admin" ? ADMIN_COLOR : SYSTEM_COLOR;
}

function polylinePoints(points: Array<{ x: number; y: number }>): string {
	return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function NodeSquare({
	node,
	selected,
}: {
	node: AssignmentGraphNode;
	selected: boolean;
}) {
	const color = kindColor(node.assignerKind);
	return (
		<div
			className={cn(
				"flex h-[42px] w-[42px] items-center justify-center rounded-md border-[1.5px] bg-white text-xs font-semibold tabular-nums shadow-sm transition-all duration-200",
				selected && "ring-2 ring-[#0f5384]/40",
			)}
			style={{ borderColor: color }}
		>
			{node.kind === "system" ? (
				<Cpu className="h-5 w-5" style={{ color }} />
			) : (
				<span style={{ color }}>{node.initials}</span>
			)}
		</div>
	);
}

export function UserAssignmentGraph({
	users,
	allUsers,
	selectedUserId,
	onSelectUser,
	onCloseCard,
	renderCard,
}: {
	users: UserManagementUser[];
	allUsers: UserManagementUser[];
	selectedUserId: string | null;
	onSelectUser: (user: UserManagementUser) => void;
	onCloseCard: () => void;
	renderCard: (user: UserManagementUser) => ReactNode;
}) {
	const layout = useMemo(
		() => layoutAssignmentGraph(users, allUsers),
		[users, allUsers],
	);
	const usersById = useMemo(
		() => new Map(allUsers.map((user) => [user.$id, user])),
		[allUsers],
	);

	return (
		<div className="space-y-4 px-4 pb-6 pt-2 sm:px-6">
			<div
				role="group"
				className="flex flex-wrap items-center justify-end gap-4 text-xs text-slate-600"
				aria-label="Assignment color legend"
			>
				<div className="flex items-center gap-1.5">
					<span
						className="inline-block h-3 w-3 rounded-sm border border-slate-200"
						style={{ backgroundColor: SYSTEM_COLOR }}
						aria-hidden
					/>
					<span>System assigned</span>
				</div>
				<div className="flex items-center gap-1.5">
					<span
						className="inline-block h-3 w-3 rounded-sm border border-slate-200"
						style={{ backgroundColor: ADMIN_COLOR }}
						aria-hidden
					/>
					<span>Admin assigned</span>
				</div>
			</div>

			<div className="overflow-auto rounded-lg border border-slate-200 bg-white">
				<div
					className="relative min-w-full"
					style={{ width: layout.width, height: layout.height }}
				>
					<svg
						width={layout.width}
						height={layout.height}
						className="absolute inset-0"
						aria-hidden
					>
						{layout.edges.map((edge) => (
							<g key={`${edge.fromId}-${edge.toId}`}>
								<polyline
									fill="none"
									stroke={kindColor(edge.kind)}
									strokeWidth={1.5}
									points={polylinePoints(edge.points)}
								/>
								{edge.junctions.map((junction) => (
									<rect
										key={`${edge.fromId}-${edge.toId}-${junction.x}-${junction.y}`}
										x={junction.x - GRAPH_JUNCTION_SIZE / 2}
										y={junction.y - GRAPH_JUNCTION_SIZE / 2}
										width={GRAPH_JUNCTION_SIZE}
										height={GRAPH_JUNCTION_SIZE}
										fill="#0f172a"
									/>
								))}
							</g>
						))}
					</svg>

					{layout.nodes.map((node) => {
						const user = node.userId ? usersById.get(node.userId) : undefined;
						const selected = Boolean(user && selectedUserId === user.$id);
						const top = node.y - GRAPH_NODE_SIZE / 2;
						const nodeClassName =
							"absolute flex w-[108px] -translate-x-1/2 flex-col items-center";

						const labels = (
							<>
								<NodeSquare node={node} selected={selected} />
								<p className="mt-1.5 w-full truncate text-center text-[11px] font-medium text-slate-700">
									{node.label}
								</p>
								<p className="w-full truncate text-center text-[10px] text-slate-500">
									{node.roleLabel}
								</p>
							</>
						);

						if (!user) {
							return (
								<div
									key={node.id}
									className={nodeClassName}
									style={{ left: node.x, top }}
								>
									{labels}
								</div>
							);
						}

						return (
							<Popover
								key={node.id}
								open={selected}
								onOpenChange={(open) => {
									if (open) {
										onSelectUser(user);
										return;
									}
									// Only clear when this node's card is the open one.
									// Otherwise switching nodes would close A and wipe B.
									if (selectedUserId === user.$id) onCloseCard();
								}}
							>
								<PopoverTrigger asChild>
									<button
										type="button"
										className={cn(
											nodeClassName,
											"cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
										)}
										style={{ left: node.x, top }}
										aria-label={`${node.label}, ${node.roleLabel}`}
										aria-expanded={selected}
									>
										{labels}
									</button>
								</PopoverTrigger>
								<PopoverContent
									align="center"
									side="right"
									sideOffset={12}
									className="w-auto border-slate-200 bg-slate-50 p-3 shadow-xl"
									onPointerDownOutside={(event) => {
										const target = event.target as HTMLElement | null;
										if (target?.closest("[data-radix-dropdown-menu-content]")) {
											event.preventDefault();
										}
									}}
									onOpenAutoFocus={(event) => event.preventDefault()}
								>
									{renderCard(user)}
								</PopoverContent>
							</Popover>
						);
					})}
				</div>
			</div>
		</div>
	);
}
