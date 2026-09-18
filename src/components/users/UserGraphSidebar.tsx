"use client";

import { ChevronDown, ChevronUp, Lock, PanelLeft, PanelRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UserManagementUser } from "@/hooks/useUsers";
import {
	EMPTY_ORG_LABEL,
	countNeedsAttention,
	graphHighlightsEqual,
	type GraphHighlight,
	type GraphSidebarStats,
} from "@/lib/users/graph-sidebar-stats";
import { formatUserLastActiveLabel } from "@/lib/users/user-management-display";
import { skipLevelManagerId } from "@/lib/users/reporting-graph";
import { cn } from "@/lib/utils";

const GRAPH_SIDEBAR_COLLAPSED_KEY = "user-graph-sidebar:collapsed";

type SectionId =
	| "needs-attention"
	| "unassigned"
	| "overview"
	| "activity-plan"
	| "distribution"
	| "diagnostics";

const DEFAULT_OPEN: Record<SectionId, boolean> = {
	"needs-attention": true,
	unassigned: true,
	overview: true,
	"activity-plan": false,
	distribution: false,
	diagnostics: false,
};

function GraphSidebarCollapseButton({
	collapsed,
	onToggle,
}: {
	collapsed: boolean;
	onToggle: () => void;
}) {
	const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
	const Icon = collapsed ? PanelRight : PanelLeft;

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						onClick={onToggle}
						aria-expanded={!collapsed}
						aria-label={label}
						className={cn(
							"flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer",
							"text-slate-600 hover:text-[#0f5384] hover:bg-blue/10",
							"transition-all duration-200 border border-transparent hover:border-blue/20",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
						)}
					>
						<Icon className="h-4 w-4" />
					</button>
				</TooltipTrigger>
				<TooltipContent side="right">
					<p>{label}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

const ROLE_DOT_COLORS = [
	"#0f5384",
	"#03afbf",
	"#16a34a",
	"#E0724A",
	"#64748b",
];

export type GraphPlanUsage = {
	tier: string;
	users: { used: number | null; limit: number };
};

export type GraphPendingInvite = {
	$id: string;
	name: string;
	email: string;
	role: string;
};

function sectionForHighlight(highlight: GraphHighlight | null): SectionId | null {
	if (!highlight) return null;
	switch (highlight.kind) {
		case "security":
		case "hygiene":
			return "needs-attention";
		case "status":
			return "overview";
		case "assignment":
			if (highlight.value === "admin" || highlight.value === "system") {
				return "overview";
			}
			if (
				highlight.value === "assigned-week" ||
				highlight.value === "assigned-month"
			) {
				return "activity-plan";
			}
			return "diagnostics";
		case "activity":
			return "activity-plan";
		case "role":
		case "department":
		case "division":
			return "distribution";
		case "issue":
			return highlight.value === "unassigned" ? "unassigned" : "diagnostics";
		default:
			return null;
	}
}

function SidebarSection({
	id,
	title,
	open,
	onToggle,
	badge,
	tint,
	children,
}: {
	id: SectionId;
	title: string;
	open: boolean;
	onToggle: () => void;
	badge?: number;
	tint?: "warn";
	children: ReactNode;
}) {
	const Icon = open ? ChevronUp : ChevronDown;
	const label = badge != null ? `${title}, ${badge}` : title;

	return (
		<div
			className={cn(
				tint === "warn"
					? "rounded-lg bg-[#fff6e5] px-2.5"
					: "border-t border-slate-200",
			)}
		>
			<button
				type="button"
				aria-expanded={open}
				aria-controls={`graph-sidebar-${id}`}
				aria-label={label}
				onClick={onToggle}
				className={cn(
					"flex w-full cursor-pointer items-center gap-2 py-2.5 text-left transition-colors duration-200",
					"hover:text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
				)}
			>
				<span className="min-w-0 flex-1 text-[10.5px] font-medium uppercase tracking-wide text-slate-500">
					{title}
					{tint === "warn" && badge != null ? (
						<span className="text-slate-500"> · {badge}</span>
					) : null}
				</span>
				{tint !== "warn" && badge != null ? (
					<span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red/10 px-1.5 text-[10px] font-medium tabular-nums text-red">
						{badge}
					</span>
				) : null}
				<Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
			</button>
			{open ? (
				<div id={`graph-sidebar-${id}`} className="pb-2.5">
					{children}
				</div>
			) : null}
		</div>
	);
}

function MetricRow({
	label,
	count,
	selected,
	onClick,
	dotClass,
	countClass,
}: {
	label: string;
	count: number;
	selected: boolean;
	onClick: () => void;
	dotClass?: string;
	countClass?: string;
}) {
	return (
		<button
			type="button"
			aria-pressed={selected}
			aria-label={selected ? `Clear ${label} highlight` : `Highlight ${label}`}
			onClick={onClick}
			className={cn(
				"flex w-full cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs text-slate-700 transition-colors duration-200",
				"hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
				selected && "bg-blue-50 ring-1 ring-[#0f5384]/25",
			)}
		>
			{dotClass ? (
				<span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass)} aria-hidden />
			) : null}
			<span className="min-w-0 flex-1 truncate">{label}</span>
			<span className={cn("tabular-nums text-slate-700", countClass)}>{count}</span>
		</button>
	);
}

function StatusBar({
	label,
	count,
	pct,
	barClass,
	dotClass,
	selected,
	onClick,
}: {
	label: string;
	count: number;
	pct: number;
	barClass: string;
	dotClass: string;
	selected: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			aria-pressed={selected}
			aria-label={selected ? `Clear ${label} highlight` : `Highlight ${label} users`}
			onClick={onClick}
			className={cn(
				"flex w-full cursor-pointer items-center gap-2 rounded-md px-0.5 py-0.5 text-xs text-slate-600 transition-colors duration-200",
				"hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
				selected && "bg-blue-50 ring-1 ring-[#0f5384]/25",
			)}
		>
			<span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass)} aria-hidden />
			<span className="sr-only">{label}</span>
			<div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
				<div className={cn("h-full rounded-full", barClass)} style={{ width: `${pct}%` }} />
			</div>
			<span className="w-5 text-right tabular-nums text-slate-700">{count}</span>
		</button>
	);
}

function GroupRows({
	title,
	rows,
	highlight,
	kind,
	onToggle,
}: {
	title: string;
	rows: Array<{ label: string; count: number }>;
	highlight: GraphHighlight | null;
	kind: "role" | "department" | "division" | "location" | "costCenter";
	onToggle: (next: GraphHighlight) => void;
}) {
	return (
		<div className="mb-3 last:mb-0">
			<p className="mb-1.5 px-1.5 text-[10.5px] font-medium uppercase tracking-wide text-slate-500">
				{title}
			</p>
			<div className="space-y-1">
				{rows.map((row, index) => {
					const next = { kind, value: row.label } as GraphHighlight;
					const selected = graphHighlightsEqual(highlight, next);
					const color = ROLE_DOT_COLORS[index % ROLE_DOT_COLORS.length];
					return (
						<button
							key={row.label}
							type="button"
							aria-pressed={selected}
							aria-label={
								selected
									? `Clear ${row.label} highlight`
									: `Highlight ${row.label} users`
							}
							onClick={() => onToggle(next)}
							className={cn(
								"flex w-full cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs text-slate-700 transition-colors duration-200",
								"hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
								selected && "bg-blue-50 ring-1 ring-[#0f5384]/25",
							)}
						>
							<span
								className="h-1.5 w-1.5 shrink-0 rounded-full"
								style={{ backgroundColor: color }}
								aria-hidden
							/>
							<span className="min-w-0 flex-1 truncate">{row.label}</span>
							<span className="tabular-nums text-slate-700">{row.count}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

function IssueList({
	title,
	empty,
	people,
	focusUserId,
	onFocusUser,
}: {
	title: string;
	empty: string;
	people: UserManagementUser[];
	focusUserId: string | null;
	onFocusUser: (userId: string | null) => void;
}) {
	return (
		<div className="mb-3 last:mb-0">
			<p className="px-1.5 text-[10.5px] font-medium uppercase tracking-wide text-slate-500">
				{title}
			</p>
			{people.length === 0 ? (
				<div className="mt-2 flex items-start gap-2 px-1.5">
					<Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
					<p className="text-xs text-slate-600">{empty}</p>
				</div>
			) : (
				<ul className="mt-1 space-y-1">
					{people.map((user) => (
						<li key={user.$id}>
							<button
								type="button"
								aria-pressed={focusUserId === user.$id}
								onClick={() =>
									onFocusUser(focusUserId === user.$id ? null : user.$id)
								}
								className={cn(
									"w-full cursor-pointer truncate rounded-md px-1.5 py-1 text-left text-xs text-slate-700 transition-colors duration-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
									focusUserId === user.$id &&
										"bg-blue-50 ring-1 ring-[#0f5384]/25",
								)}
							>
								{user.fullName}
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

export function UserGraphSidebar({
	users,
	stats,
	highlight,
	onSelectHighlight,
	focusUserId,
	onFocusUser,
	onAssignUser,
	canAssign = false,
	planUsage,
	pendingInvites,
}: {
	users: UserManagementUser[];
	stats: GraphSidebarStats;
	highlight: GraphHighlight | null;
	onSelectHighlight: (next: GraphHighlight | null) => void;
	focusUserId: string | null;
	onFocusUser: (userId: string | null) => void;
	onAssignUser?: (user: UserManagementUser) => void;
	canAssign?: boolean;
	planUsage?: GraphPlanUsage | null;
	pendingInvites?: GraphPendingInvite[] | null;
}) {
	const [collapsed, setCollapsed] = useState(false);
	const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>(
		() => {
			const highlighted = sectionForHighlight(highlight);
			return highlighted
				? { ...DEFAULT_OPEN, [highlighted]: true }
				: DEFAULT_OPEN;
		},
	);

	useEffect(() => {
		setCollapsed(
			window.localStorage.getItem(GRAPH_SIDEBAR_COLLAPSED_KEY) === "true",
		);
	}, []);

	useEffect(() => {
		const highlighted = sectionForHighlight(highlight);
		if (!highlighted) return;
		setOpenSections((prev) =>
			prev[highlighted] ? prev : { ...prev, [highlighted]: true },
		);
	}, [highlight]);

	const toggleCollapsed = () => {
		setCollapsed((prev) => {
			const next = !prev;
			window.localStorage.setItem(GRAPH_SIDEBAR_COLLAPSED_KEY, String(next));
			return next;
		});
	};

	const toggleSection = (id: SectionId) => {
		setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
	};

	const highlightActive = Boolean(highlight || focusUserId);
	const total = stats.total;
	const pct = (count: number) => (total > 0 ? (count / total) * 100 : 0);
	const attentionCount = countNeedsAttention(stats);

	const toggle = (next: GraphHighlight) => {
		onSelectHighlight(graphHighlightsEqual(highlight, next) ? null : next);
	};

	const selected = focusUserId
		? users.find((user) => user.$id === focusUserId)
		: undefined;
	const selectedReports = selected
		? (stats.directReportsByUserId.get(selected.$id) ?? 0)
		: 0;
	const skipLevelId = selected
		? skipLevelManagerId(selected.$id, users)
		: null;
	const skipLevelName = skipLevelId
		? users.find((user) => user.$id === skipLevelId)?.fullName
		: null;

	const seatsUsed = planUsage?.users.used;
	const seatsLimit = planUsage?.users.limit;
	const showSeats =
		planUsage != null && typeof seatsUsed === "number" && typeof seatsLimit === "number";
	const seatsPct =
		showSeats && seatsLimit > 0
			? Math.min(100, Math.round((seatsUsed / seatsLimit) * 100))
			: showSeats && seatsUsed > 0
				? 100
				: 0;

	if (collapsed) {
		return (
			<aside
				className="flex h-full w-11 shrink-0 flex-col items-center rounded-xl border border-slate-200 bg-white/90 py-3 shadow-md"
				data-collapsed="true"
			>
				<GraphSidebarCollapseButton collapsed onToggle={toggleCollapsed} />
				{highlightActive ? (
					<span
						className="mt-2 h-1.5 w-1.5 rounded-full bg-[#0f5384]"
						aria-hidden
					/>
				) : null}
			</aside>
		);
	}

	return (
		<aside className="flex h-full w-65 shrink-0 flex-col overflow-y-auto rounded-xl border border-slate-200 bg-white/90 p-3 shadow-md">
			<div className="mb-1 flex items-center justify-end">
				<GraphSidebarCollapseButton
					collapsed={false}
					onToggle={toggleCollapsed}
				/>
			</div>

			<button
				type="button"
				onClick={() => {
					onSelectHighlight(null);
					onFocusUser(null);
				}}
				aria-label={highlightActive ? "Show all users" : "All users"}
				aria-pressed={!highlightActive}
				className={cn(
					"w-full rounded-md px-1 py-1.5 text-left transition-colors duration-200",
					"cursor-pointer hover:bg-blue-50",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
				)}
			>
				<p className="text-[10.5px] font-medium uppercase tracking-wide text-slate-500">
					All users
				</p>
				<p className="pt-1 text-2xl font-bold tabular-nums text-slate-700">
					{total}
				</p>
				{highlightActive ? (
					<p className="mt-0.5 text-xs font-medium text-[#0f5384]">Show all</p>
				) : (
					<>
						<p
							className={cn(
								"mt-0.5 text-xs",
								stats.createdThisWeek > 0 ? "font-medium text-green" : "text-slate-500",
							)}
						>
							+{stats.createdThisWeek} this week
						</p>
						<p className="text-xs text-slate-500">
							+{stats.createdThisMonth} this month
						</p>
					</>
				)}
			</button>

			<div className="mt-2 space-y-2">
				<SidebarSection
					id="needs-attention"
					title="Needs attention"
					open={openSections["needs-attention"]}
					onToggle={() => toggleSection("needs-attention")}
					badge={attentionCount}
				>
					<div className="space-y-0.5">
						<MetricRow
							label="No 2FA enabled"
							count={stats.twoFactorOff}
							countClass="text-red"
							selected={graphHighlightsEqual(highlight, {
								kind: "security",
								value: "no-2fa",
							})}
							onClick={() => toggle({ kind: "security", value: "no-2fa" })}
						/>
						{stats.passwordHistoryAvailable ? (
							<>
								<MetricRow
									label="Password never changed"
									count={stats.passwordNever}
									countClass="text-orange"
									selected={graphHighlightsEqual(highlight, {
										kind: "security",
										value: "password-never",
									})}
									onClick={() =>
										toggle({ kind: "security", value: "password-never" })
									}
								/>
								<MetricRow
									label="Password 90+ days old"
									count={stats.passwordStale}
									countClass="text-orange"
									selected={graphHighlightsEqual(highlight, {
										kind: "security",
										value: "password-stale",
									})}
									onClick={() =>
										toggle({ kind: "security", value: "password-stale" })
									}
								/>
							</>
						) : null}
						<div className="my-1.5 border-t border-slate-200" />
						<MetricRow
							label="No division assigned"
							count={stats.noDivision}
							selected={graphHighlightsEqual(highlight, {
								kind: "hygiene",
								value: "no-division",
							})}
							onClick={() => toggle({ kind: "hygiene", value: "no-division" })}
						/>
						<MetricRow
							label="Assigner ≠ manager"
							count={stats.mismatch}
							selected={graphHighlightsEqual(highlight, {
								kind: "hygiene",
								value: "mismatch",
							})}
							onClick={() => toggle({ kind: "hygiene", value: "mismatch" })}
						/>
						<MetricRow
							label="No department"
							count={stats.noDepartment}
							selected={graphHighlightsEqual(highlight, {
								kind: "hygiene",
								value: "no-department",
							})}
							onClick={() => toggle({ kind: "hygiene", value: "no-department" })}
						/>
						<MetricRow
							label="No role"
							count={stats.noRole}
							selected={graphHighlightsEqual(highlight, {
								kind: "hygiene",
								value: "no-role",
							})}
							onClick={() => toggle({ kind: "hygiene", value: "no-role" })}
						/>
					</div>
				</SidebarSection>

				<SidebarSection
					id="unassigned"
					title="Unassigned users"
					open={openSections.unassigned}
					onToggle={() => toggleSection("unassigned")}
					badge={stats.unassignedUsers.length}
					tint="warn"
				>
					{stats.unassignedUsers.length === 0 ? (
						<p className="px-1.5 text-xs text-slate-600">Everyone has a manager</p>
					) : (
						<ul className="space-y-0.5">
							{stats.unassignedUsers.map((user) => (
								<li key={user.$id} className="flex items-center gap-1">
									<button
										type="button"
										aria-pressed={focusUserId === user.$id}
										onClick={() =>
											onFocusUser(focusUserId === user.$id ? null : user.$id)
										}
										className={cn(
											"min-w-0 flex-1 cursor-pointer truncate rounded-md px-1.5 py-1 text-left text-xs text-slate-700 transition-colors duration-200 hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
											focusUserId === user.$id &&
												"bg-white/80 ring-1 ring-[#0f5384]/25",
										)}
									>
										{user.fullName}
									</button>
									{canAssign ? (
										<button
											type="button"
											onClick={() =>
												onAssignUser
													? onAssignUser(user)
													: onFocusUser(user.$id)
											}
											className="shrink-0 cursor-pointer rounded-md px-1.5 py-1 text-xs font-medium text-[#0f5384] transition-colors duration-200 hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
										>
											+ Assign
										</button>
									) : null}
								</li>
							))}
						</ul>
					)}
				</SidebarSection>

				<SidebarSection
					id="overview"
					title="Overview"
					open={openSections.overview}
					onToggle={() => toggleSection("overview")}
				>
					<div className="space-y-2">
						<StatusBar
							label="Active"
							count={stats.active}
							pct={pct(stats.active)}
							barClass="bg-green"
							dotClass="bg-green"
							selected={graphHighlightsEqual(highlight, {
								kind: "status",
								value: "active",
							})}
							onClick={() => toggle({ kind: "status", value: "active" })}
						/>
						<StatusBar
							label="Inactive"
							count={stats.inactive}
							pct={pct(stats.inactive)}
							barClass="bg-slate-400"
							dotClass="bg-slate-400"
							selected={graphHighlightsEqual(highlight, {
								kind: "status",
								value: "inactive",
							})}
							onClick={() => toggle({ kind: "status", value: "inactive" })}
						/>
						<StatusBar
							label="Suspended"
							count={stats.suspended}
							pct={pct(stats.suspended)}
							barClass="bg-orange"
							dotClass="bg-orange"
							selected={graphHighlightsEqual(highlight, {
								kind: "status",
								value: "suspended",
							})}
							onClick={() => toggle({ kind: "status", value: "suspended" })}
						/>
					</div>
					<div className="mt-2 space-y-0.5">
						<MetricRow
							label="Admin assigned"
							count={stats.adminAssigned}
							selected={graphHighlightsEqual(highlight, {
								kind: "assignment",
								value: "admin",
							})}
							onClick={() => toggle({ kind: "assignment", value: "admin" })}
						/>
						<MetricRow
							label="System assigned"
							count={stats.systemAssigned}
							selected={graphHighlightsEqual(highlight, {
								kind: "assignment",
								value: "system",
							})}
							onClick={() => toggle({ kind: "assignment", value: "system" })}
						/>
						<div className="flex items-center justify-between px-1.5 py-1 text-xs text-slate-700">
							<span>Avg reports / max depth</span>
							<span className="tabular-nums">
								{stats.avgReports} / {stats.maxTreeDepth}
							</span>
						</div>
					</div>
				</SidebarSection>

				<SidebarSection
					id="activity-plan"
					title="Activity & Plan"
					open={openSections["activity-plan"]}
					onToggle={() => toggleSection("activity-plan")}
				>
					<div className="space-y-0.5">
						<MetricRow
							label="Active in 7 days"
							count={stats.active7d}
							selected={graphHighlightsEqual(highlight, {
								kind: "activity",
								value: "active-7d",
							})}
							onClick={() => toggle({ kind: "activity", value: "active-7d" })}
						/>
						<MetricRow
							label="Stale 30+ days"
							count={stats.stale30d}
							selected={graphHighlightsEqual(highlight, {
								kind: "activity",
								value: "stale-30d",
							})}
							onClick={() => toggle({ kind: "activity", value: "stale-30d" })}
						/>
						<MetricRow
							label="Never logged in"
							count={stats.neverLoggedIn}
							selected={graphHighlightsEqual(highlight, {
								kind: "activity",
								value: "never",
							})}
							onClick={() => toggle({ kind: "activity", value: "never" })}
						/>
						<MetricRow
							label="Assigned this week"
							count={stats.assignedThisWeek}
							selected={graphHighlightsEqual(highlight, {
								kind: "assignment",
								value: "assigned-week",
							})}
							onClick={() => toggle({ kind: "assignment", value: "assigned-week" })}
						/>
						<MetricRow
							label="Assigned this month"
							count={stats.assignedThisMonth}
							selected={graphHighlightsEqual(highlight, {
								kind: "assignment",
								value: "assigned-month",
							})}
							onClick={() =>
								toggle({ kind: "assignment", value: "assigned-month" })
							}
						/>
					</div>
					{showSeats ? (
						<div className="mt-2 px-1.5">
							<p className="text-[10.5px] font-medium uppercase tracking-wide text-slate-500">
								Plan seats
							</p>
							<p className="pt-1 text-lg font-bold tabular-nums text-slate-700">
								{seatsUsed} / {seatsLimit}
							</p>
							<p className="text-xs text-slate-500">{seatsPct}% of staff seats</p>
						</div>
					) : null}
					{pendingInvites ? (
						<div className="mt-2 px-1.5">
							<p className="text-[10.5px] font-medium uppercase tracking-wide text-slate-500">
								Pending invites
							</p>
							<p className="pt-1 text-lg font-bold tabular-nums text-slate-700">
								{pendingInvites.length}
							</p>
							{pendingInvites.length === 0 ? (
								<p className="mt-1 text-xs text-slate-500">No open invitations</p>
							) : (
								<ul className="mt-2 space-y-1">
									{pendingInvites.map((invite) => (
										<li
											key={invite.$id}
											className="truncate text-xs text-slate-700"
										>
											{invite.name.trim() || invite.email}
										</li>
									))}
								</ul>
							)}
						</div>
					) : null}
				</SidebarSection>

				<SidebarSection
					id="distribution"
					title="Distribution"
					open={openSections.distribution}
					onToggle={() => toggleSection("distribution")}
				>
					<GroupRows
						title="Users by role"
						rows={stats.roleRows}
						highlight={highlight}
						kind="role"
						onToggle={toggle}
					/>
					<GroupRows
						title="Users by department"
						rows={stats.departmentRows}
						highlight={highlight}
						kind="department"
						onToggle={toggle}
					/>
					<GroupRows
						title="Users by division"
						rows={stats.divisionRows}
						highlight={highlight}
						kind="division"
						onToggle={toggle}
					/>
					<GroupRows
						title="Users by location"
						rows={stats.locationRows}
						highlight={highlight}
						kind="location"
						onToggle={toggle}
					/>
					<GroupRows
						title="Users by cost center"
						rows={stats.costCenterRows}
						highlight={highlight}
						kind="costCenter"
						onToggle={toggle}
					/>
				</SidebarSection>

				<SidebarSection
					id="diagnostics"
					title="Diagnostics"
					open={openSections.diagnostics}
					onToggle={() => toggleSection("diagnostics")}
				>
					<div className="space-y-0.5">
						<MetricRow
							label="Unknown assigner"
							count={stats.ghostAssigned}
							selected={graphHighlightsEqual(highlight, {
								kind: "assignment",
								value: "ghost",
							})}
							onClick={() => toggle({ kind: "assignment", value: "ghost" })}
						/>
						<MetricRow
							label="Extra roots"
							count={stats.extraRoots}
							selected={graphHighlightsEqual(highlight, {
								kind: "assignment",
								value: "extra-roots",
							})}
							onClick={() => toggle({ kind: "assignment", value: "extra-roots" })}
						/>
						<MetricRow
							label="2FA on"
							count={stats.twoFactorOn}
							selected={graphHighlightsEqual(highlight, {
								kind: "security",
								value: "2fa-on",
							})}
							onClick={() => toggle({ kind: "security", value: "2fa-on" })}
						/>
					</div>
					<div className="mt-2">
						<IssueList
							title="Unknown assigner"
							empty="Every assigner is on this diagram"
							people={stats.ghostUsers}
							focusUserId={focusUserId}
							onFocusUser={onFocusUser}
						/>
						<IssueList
							title="Deactivated with reports"
							empty="No deactivated users have reports"
							people={stats.deactivatedWithReports}
							focusUserId={focusUserId}
							onFocusUser={onFocusUser}
						/>
					</div>
				</SidebarSection>
			</div>

			{selected ? (
				<div className="mt-3 rounded-lg border border-[#0f5384]/25 bg-white/80 p-3.5">
					<p className="text-[10.5px] font-medium uppercase tracking-wide text-slate-500">
						Selected
					</p>
					<p className="pt-1 text-sm font-semibold text-slate-700">
						{selected.fullName}
					</p>
					<dl className="mt-2 space-y-1 text-xs text-slate-600">
						<div className="flex justify-between gap-2">
							<dt>Title</dt>
							<dd className="truncate text-right text-slate-700">
								{selected.jobTitle?.trim() || "Not assigned"}
							</dd>
						</div>
						<div className="flex justify-between gap-2">
							<dt>Role</dt>
							<dd className="truncate text-right text-slate-700">
								{selected.roleName?.trim() || "Unassigned"}
							</dd>
						</div>
						<div className="flex justify-between gap-2">
							<dt>Department</dt>
							<dd className="truncate text-right text-slate-700">
								{selected.department?.trim() || EMPTY_ORG_LABEL}
							</dd>
						</div>
						<div className="flex justify-between gap-2">
							<dt>Division</dt>
							<dd className="truncate text-right text-slate-700">
								{selected.division?.trim() || EMPTY_ORG_LABEL}
							</dd>
						</div>
						<div className="flex justify-between gap-2">
							<dt>Location</dt>
							<dd className="truncate text-right text-slate-700">
								{selected.workLocation?.trim() || EMPTY_ORG_LABEL}
							</dd>
						</div>
						<div className="flex justify-between gap-2">
							<dt>Cost center</dt>
							<dd className="truncate text-right text-slate-700">
								{selected.costCenterName?.trim() ||
									selected.costCenterCode?.trim() ||
									EMPTY_ORG_LABEL}
							</dd>
						</div>
						<div className="flex justify-between gap-2">
							<dt>Skip-level</dt>
							<dd className="truncate text-right text-slate-700">
								{skipLevelName || "None"}
							</dd>
						</div>
						<div className="flex justify-between gap-2">
							<dt>Assigned by</dt>
							<dd className="truncate text-right text-slate-700">
								{selected.assignedByName?.trim() || "System"}
							</dd>
						</div>
						<div className="flex justify-between gap-2">
							<dt>Direct reports</dt>
							<dd className="tabular-nums text-slate-700">{selectedReports}</dd>
						</div>
						<div className="flex justify-between gap-2">
							<dt>Last active</dt>
							<dd className="text-right text-slate-700">
								{formatUserLastActiveLabel(selected.lastActiveAt)}
							</dd>
						</div>
						<div className="flex justify-between gap-2">
							<dt>2FA</dt>
							<dd className="text-slate-700">
								{selected.twoFactorEnabled ? "On" : "Off"}
							</dd>
						</div>
						<div className="flex justify-between gap-2">
							<dt>Last password change</dt>
							<dd className="text-right text-slate-700">
								{formatUserLastActiveLabel(selected.passwordUpdatedAt ?? undefined)}
							</dd>
						</div>
					</dl>
				</div>
			) : null}
		</aside>
	);
}
