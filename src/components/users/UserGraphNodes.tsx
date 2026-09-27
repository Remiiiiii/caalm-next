"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { ChevronDown, ChevronUp, Cpu } from "lucide-react";
import { useState } from "react";
import Avatar from "@/components/ui/avatar";
import { UserGraphCardMenu } from "@/components/users/UserGraphCardMenu";
import type { UserActionKind } from "@/components/users/UserManagementActionDialogs";
import type { UserManagementUser } from "@/hooks/useUsers";
import { isSameUserIdentity } from "@/lib/impersonation/policy";
import {
	ADMIN_ASSIGN_COLOR,
	FLOW_CARD_WIDTH,
	SYSTEM_ASSIGN_COLOR,
	type AssignmentEdgeKind,
} from "@/lib/users/assignment-graph";
import {
	isTopDownOrientation,
	type GraphOrientation,
} from "@/lib/users/graph-orientation";
import { resolveAvatarDisplayUrl, cn } from "@/lib/utils";

export type GraphNodeEmphasis = "normal" | "match" | "dim";

type ActorLike = {
	$id?: string;
	accountId?: string;
} | null;

export type UserGraphUserNodeData = {
	user: UserManagementUser;
	assignerKind: AssignmentEdgeKind;
	lineage: "reporting" | "assignment";
	orientation?: GraphOrientation;
	skipLevelName?: string | null;
	canEditGraph: boolean;
	canView: boolean;
	canEdit: boolean;
	canDeactivate: boolean;
	canAssignRoles: boolean;
	canImpersonate: boolean;
	actor: ActorLike;
	emphasis: GraphNodeEmphasis;
	onAction: (
		user: UserManagementUser,
		kind: Exclude<UserActionKind, null>,
	) => void;
};

export type UserGraphSystemNodeData = {
	canEditGraph: boolean;
	emphasis: GraphNodeEmphasis;
	orientation?: GraphOrientation;
};

export type UserGraphUserNodeType = Node<UserGraphUserNodeData, "user">;
export type UserGraphSystemNodeType = Node<UserGraphSystemNodeData, "system">;

function kindColor(kind: AssignmentEdgeKind): string {
	return kind === "admin" ? ADMIN_ASSIGN_COLOR : SYSTEM_ASSIGN_COLOR;
}

const handleClass =
	"h-2.5! w-2.5! border-2! bg-white! border-[#0f5384]! hover:bg-[#0f5384]!";

export function graphHandlePositions(orientation?: GraphOrientation): {
	target: Position;
	source: Position;
} {
	if (isTopDownOrientation(orientation)) {
		return { target: Position.Top, source: Position.Bottom };
	}
	return { target: Position.Left, source: Position.Right };
}

function emphasisClass(emphasis: GraphNodeEmphasis | undefined): string {
	if (emphasis === "dim") return "opacity-35";
	if (emphasis === "match") return "ring-2 ring-[#03afbf] ring-offset-1";
	return "";
}

export function isCurrentGraphUser(
	actor: ActorLike,
	user: Pick<UserManagementUser, "$id" | "accountId">,
): boolean {
	if (!actor) return false;
	return isSameUserIdentity(
		{
			$id: actor.$id,
			accountId: actor.accountId || actor.$id,
		},
		{
			$id: user.$id,
			accountId: user.accountId,
		},
	);
}

export function graphUserCardTitle(
	user: Pick<UserManagementUser, "$id" | "accountId" | "fullName">,
	actor: ActorLike,
): string {
	return isCurrentGraphUser(actor, user) ? "You" : user.fullName;
}

export function graphUserJobLabel(
	user: Pick<UserManagementUser, "jobTitle" | "roleName">,
): string {
	const title = user.jobTitle?.trim();
	if (title) return title;
	const role = user.roleName?.trim();
	return role || "Unassigned";
}

const EMPTY_ORG = "Not assigned";

function graphOrgValue(value: string | null | undefined): {
	label: string;
	empty: boolean;
} {
	const label = value?.trim() || EMPTY_ORG;
	return { label, empty: label === EMPTY_ORG };
}

function GraphDetailRow({
	label,
	value,
	empty = false,
}: {
	label: string;
	value: string;
	empty?: boolean;
}) {
	return (
		<div className="flex items-baseline justify-between gap-3">
			<p className="shrink-0 text-slate-500">{label}</p>
			<p
				className={cn(
					"min-w-0 truncate text-right text-slate-700",
					empty ? "italic font-normal text-slate-500" : "font-medium",
				)}
			>
				{value}
			</p>
		</div>
	);
}

export function UserGraphUserNode({ data }: NodeProps<UserGraphUserNodeType>) {
	const { user, assignerKind, canEditGraph, skipLevelName } = data;
	const [detailsCollapsed, setDetailsCollapsed] = useState(true);
	const isSelf = isCurrentGraphUser(data.actor, user);
	const isSuspended =
		user.status === "suspended" || user.status === "inactive";
	const border = kindColor(assignerKind);
	const jobLabel = graphUserJobLabel(user);
	const showRoleBadge = Boolean(user.jobTitle?.trim() && user.roleName?.trim());
	const department = graphOrgValue(user.department);
	const division = graphOrgValue(user.division);
	const location = graphOrgValue(user.workLocation);
	const costCenter = graphOrgValue(
		user.costCenterName?.trim() || user.costCenterCode,
	);
	const skipLevel = graphOrgValue(skipLevelName);
	const { target: targetPosition, source: sourcePosition } =
		graphHandlePositions(data.orientation);

	return (
		<div
			className={cn(
				"glass-card overflow-visible! rounded-lg transition-opacity duration-200",
				isSuspended && "opacity-60",
				isSelf && "user-graph-self-pulse",
				emphasisClass(data.emphasis),
			)}
			style={{
				width: FLOW_CARD_WIDTH,
				...(isSelf ? {} : { borderColor: border }),
			}}
		>
			<div className="glass-card-cap" />
			<div
				className={cn(
					"flex items-center gap-2 border-b border-slate-200 px-3 pb-2 pt-5",
					canEditGraph
						? "node-drag-handle cursor-grab active:cursor-grabbing"
						: "cursor-default",
				)}
			>
				<Avatar
					name={user.fullName}
					userId={user.$id}
					size="sm"
					className="shrink-0 gap-0"
					imageUrl={resolveAvatarDisplayUrl(user)}
				/>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-semibold text-slate-700">
						{graphUserCardTitle(user, data.actor)}
					</p>
					<p className="truncate text-xs text-slate-500">{jobLabel}</p>
				</div>
				<UserGraphCardMenu
					user={user}
					actor={data.actor}
					canView={data.canView}
					canEdit={data.canEdit}
					canDeactivate={data.canDeactivate}
					canAssignRoles={data.canAssignRoles}
					canImpersonate={data.canImpersonate}
					onAction={data.onAction}
				/>
			</div>
			<div className="space-y-1.5 px-3 py-2 text-xs">
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
					<span
						className={
							isSuspended
								? "inline-block rounded-full border border-orange/20 bg-orange/10 px-2 py-0.5 font-medium text-orange"
								: "inline-block rounded-full border border-green/20 bg-green/10 px-2 py-0.5 font-medium text-green"
						}
					>
						{isSuspended ? "Inactive" : "Active"}
					</span>
					{showRoleBadge ? (
						<span className="inline-block rounded-full border border-blue/20 bg-blue/10 px-2 py-0.5 font-medium text-blue">
							{user.roleName}
						</span>
					) : null}
				</div>
				<GraphDetailRow
					label="Department"
					value={department.label}
					empty={department.empty}
				/>
				<GraphDetailRow
					label="Division"
					value={division.label}
					empty={division.empty}
				/>
				{detailsCollapsed ? null : (
					<>
						<GraphDetailRow
							label="Location"
							value={location.label}
							empty={location.empty}
						/>
						<GraphDetailRow
							label="Cost center"
							value={costCenter.label}
							empty={costCenter.empty}
						/>
						<GraphDetailRow
							label="Skip-level"
							value={skipLevel.label}
							empty={skipLevel.empty}
						/>
					</>
				)}
				<button
					type="button"
					className="nodrag nopan nowheel flex w-full cursor-pointer items-center justify-center rounded-md py-0.5 text-slate-500 transition-all duration-200 hover:bg-blue/10 hover:text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
					aria-expanded={!detailsCollapsed}
					aria-label={
						detailsCollapsed
							? "Show location, cost center, and skip-level"
							: "Hide location, cost center, and skip-level"
					}
					data-testid="graph-node-extra-details"
					onClick={(event) => {
						event.stopPropagation();
						setDetailsCollapsed((prev) => !prev);
					}}
					onPointerDown={(event) => event.stopPropagation()}
				>
					{detailsCollapsed ? (
						<ChevronDown className="h-4 w-4" />
					) : (
						<ChevronUp className="h-4 w-4" />
					)}
				</button>
			</div>
			{canEditGraph ? (
				<>
					<Handle
						type="target"
						position={targetPosition}
						className={handleClass}
					/>
					<Handle
						type="source"
						position={sourcePosition}
						className={handleClass}
					/>
				</>
			) : null}
		</div>
	);
}

export function UserGraphSystemNode({
	data,
}: NodeProps<UserGraphSystemNodeType>) {
	return (
		<div
			className={cn(
				"glass-card overflow-visible! rounded-lg transition-opacity duration-200",
				emphasisClass(data.emphasis),
			)}
			style={{ width: 180, borderColor: SYSTEM_ASSIGN_COLOR }}
		>
			<div className="glass-card-cap" />
			<div
				className={cn(
					"flex items-center gap-2 px-3 pb-3 pt-5",
					data.canEditGraph
						? "node-drag-handle cursor-grab active:cursor-grabbing"
						: "cursor-default",
				)}
			>
				<div
					className="flex h-8 w-8 items-center justify-center rounded-md"
					style={{ backgroundColor: `${SYSTEM_ASSIGN_COLOR}18` }}
				>
					<Cpu className="h-4 w-4" style={{ color: SYSTEM_ASSIGN_COLOR }} />
				</div>
				<div>
					<p className="text-sm font-semibold text-slate-700">System</p>
					<p className="text-xs text-slate-500">Root assigner</p>
				</div>
			</div>
			{data.canEditGraph ? (
				<Handle
					type="source"
					position={graphHandlePositions(data.orientation).source}
					className={handleClass}
				/>
			) : null}
		</div>
	);
}
