"use client";

import { motion } from "framer-motion";
import {
	Ban,
	Calendar,
	CalendarClock,
	CalendarRange,
	CheckCircle,
	ChevronDown,
	ClipboardList,
	Clock,
	Download,
	Filter,
	FunnelX,
	Globe,
	ListChecks,
	Loader2,
	Plus,
	Sprout,
	Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
	Fragment,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import CountUp from "react-countup";
import {
	Area,
	AreaChart,
	Tooltip as ChartTooltip,
	ResponsiveContainer,
	XAxis,
} from "recharts";
import useSWR from "swr";
import { AuditLabShell } from "@/components/audit-lab/AuditLabShell";
import {
	type AuditLabSurface,
	SURFACE_COPY,
} from "@/components/audit-lab/audit-lab-surfaces";
import { CoverageChart } from "@/components/audit-lab/CoverageChart";
import { InterviewScriptCanvas } from "@/components/audit-lab/InterviewScriptCanvas";
import { NewSessionDialog } from "@/components/audit-lab/NewSessionDialog";
import { PracticeRoundPanel } from "@/components/audit-lab/PracticeRoundPanel";
import { RescheduleSessionDialog } from "@/components/audit-lab/RescheduleSessionDialog";
import {
	profilesFromUsers,
	SimulationDetailSheet,
} from "@/components/audit-lab/SimulationDetailSheet";
import { TrendChart } from "@/components/audit-lab/TrendChart";
import { VoiceInterviewPanel } from "@/components/audit-lab/VoiceInterviewPanel";
import { LoadError } from "@/components/LoadError";
import {
	fadeLeft,
	fadeRight,
	fadeUp,
	scaleIn,
	staggerFast,
	viewportOnce,
} from "@/components/landing/motion";
import Avatar from "@/components/ui/avatar";
import { BulkActionDock } from "@/components/ui/bulk-action-dock";
import { Button } from "@/components/ui/button";
import {
	CaalmDataTable,
	CaalmDataTableEmpty,
	CaalmDataTableSkeleton,
	DATA_TABLE_BODY_ROW_CLICKABLE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
	SortableDataTableHead,
} from "@/components/ui/caalm-data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	DropdownMenu,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FILTER_PILL_TRIGGER } from "@/components/ui/filter-pill";
import {
	MetricProgressRing,
	MetricSegmentBar,
	MetricStatCard,
} from "@/components/ui/metric-stat-card";
import { PageIndex, pageCountFromItems } from "@/components/ui/page-index";
import { SearchField } from "@/components/ui/search-field";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityItemSkeleton } from "@/components/ui/skeletons";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import type { LabCapabilities } from "@/lib/audit-lab/access";
import type { EvidenceLinkSummary } from "@/lib/audit-lab/evidence-link-summary";
import type {
	OverviewActivity,
	OverviewSuggestion,
} from "@/lib/audit-lab/overview";
import {
	type EvidenceRequest,
	type EvidenceTestResult,
	parseParticipants,
	type ReviewQuestion,
	type ReviewSession,
} from "@/lib/audit-lab/types";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { fetcher } from "@/lib/swr-config";
import { cn, resolveAvatarDisplayUrl } from "@/lib/utils";

/** Table cells: `Nov 24, 02:00 PM`. */
function formatSessionDateTime(iso: string | null | undefined): string {
	if (!iso) return "—";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	});
}

function evidenceTestResultLabel(
	value: EvidenceTestResult | undefined,
): string {
	switch (value) {
		case "no_exception":
			return "No exception";
		case "exception":
			return "Exception";
		case "deficiency":
			return "Deficiency";
		case "not_tested":
		case undefined:
			return "Not tested";
		default: {
			const _exhaustive: never = value;
			return _exhaustive;
		}
	}
}

type OverviewPayload = {
	stats?: {
		readinessScore: number;
		readinessTrend?: number;
		openGaps: number;
		openGapsTrendLabel?: string;
		evidenceCoverage: number;
		sessionsThisQuarter: number;
	};
	suggestions?: OverviewSuggestion[];
	upcoming?: ReviewSession[];
	sessions?: ReviewSession[];
	evidence?: EvidenceRequest[];
	gaps?: Array<{
		$id: string;
		sessionId?: string;
		description: string;
		status: string;
	}>;
	reports?: Array<{ $id: string; kind: string }>;
	activity?: OverviewActivity[];
};

/** Same stops as `.sidebar-gradient-text`, used as a bar fill (text-clip won't paint bars). */
const SIDEBAR_BAR_FILL = "linear-gradient(135deg, #12477d 0%, #03afbf 100%)";

/** Slow enough to read after the overview skeleton clears. */
const STAT_CHART_DURATION_SEC = 2.4;
const STAT_CHART_DURATION_MS = 2400;
const STAT_STAGGER_SEC = 0.12;

const SUGGESTION_TAG_CLASS: Record<OverviewSuggestion["tagTone"], string> = {
	danger: "bg-red/10 text-red border-red/20",
	warning: "bg-orange/10 text-orange border-orange/20",
	info: "bg-purple-100 text-purple-700 border-purple-200",
};

const ACTIVITY_DOT_CLASS: Record<OverviewActivity["tone"], string> = {
	success: "bg-green",
	warning: "bg-orange",
	danger: "bg-red",
	info: "bg-[#0f5384]",
};

const SESSION_STATUS_BADGE: Record<string, string> = {
	draft: "bg-slate-100 text-slate-600 border-slate-200",
	scheduled: "bg-blue/10 text-[#0f5384] border-blue/20",
	prep: "bg-orange/10 text-orange border-orange/20",
	in_progress: "bg-blue/10 text-[#0f5384] border-blue/20",
	completed: "bg-green/10 text-green border-green/20",
	report_ready: "bg-green/10 text-green border-green/20",
	archived: "bg-slate-100 text-slate-600 border-slate-200",
	cancelled: "bg-red/10 text-red border-red/20",
};

/** Sessions in these states are done; Reschedule/Cancel/Mark complete no longer apply. */
const SESSION_TERMINAL_STATUSES = [
	"completed",
	"report_ready",
	"archived",
	"cancelled",
];

function sessionStatusLabel(status: string): string {
	return status
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

// Fallback when practiceReadinessPct is unset: static per-status placeholder.
const SESSION_READINESS_BY_STATUS: Record<
	string,
	{ pct: number; colorClass: string; faded?: boolean }
> = {
	draft: { pct: 20, colorClass: "bg-[#0f5384]" },
	scheduled: { pct: 38, colorClass: "bg-[#0f5384]" },
	prep: { pct: 48, colorClass: "bg-orange" },
	in_progress: { pct: 66, colorClass: "bg-[#078fab]" },
	completed: { pct: 92, colorClass: "bg-green" },
	report_ready: { pct: 96, colorClass: "bg-green" },
	archived: { pct: 78, colorClass: "bg-green", faded: true },
	cancelled: { pct: 0, colorClass: "bg-slate-300" },
};

function sessionReadinessDisplay(session: ReviewSession): {
	pct: number;
	colorClass: string;
	faded?: boolean;
	fromPractice: boolean;
} {
	const practicePct = session.practiceReadinessPct;
	if (typeof practicePct === "number" && Number.isFinite(practicePct)) {
		const pct = Math.max(0, Math.min(100, Math.round(practicePct)));
		const colorClass =
			pct >= 80 ? "bg-green" : pct >= 50 ? "bg-[#078fab]" : "bg-orange";
		return { pct, colorClass, fromPractice: true };
	}
	const fallback = SESSION_READINESS_BY_STATUS[session.status] ?? {
		pct: 0,
		colorClass: "bg-slate-300",
	};
	return { ...fallback, fromPractice: false };
}

type SessionSortKey = "scheduled" | "title" | "readiness";
type SessionSort = { key: SessionSortKey; direction: "asc" | "desc" };

function compareSessions(
	a: ReviewSession,
	b: ReviewSession,
	sort: SessionSort,
): number {
	const dir = sort.direction === "asc" ? 1 : -1;
	switch (sort.key) {
		case "title":
			return a.title.localeCompare(b.title) * dir;
		case "readiness": {
			const ra = sessionReadinessDisplay(a).pct;
			const rb = sessionReadinessDisplay(b).pct;
			return (ra - rb) * dir;
		}
		case "scheduled": {
			const da = a.scheduledAt
				? Date.parse(a.scheduledAt)
				: Number.POSITIVE_INFINITY;
			const db = b.scheduledAt
				? Date.parse(b.scheduledAt)
				: Number.POSITIVE_INFINITY;
			return (da - db) * dir;
		}
		default: {
			const _exhaustive: never = sort.key;
			return _exhaustive;
		}
	}
}

/** Nudge, not a gate: tells "Mark complete" whether to warn, never blocks it. */
function sessionReadinessGate(
	session: ReviewSession,
	evidence: EvidenceRequest[],
	gaps: Array<{ sessionId?: string; status: string }>,
) {
	const openEvidence = evidence.filter(
		(e) =>
			e.sessionId === session.$id &&
			e.status !== "accepted" &&
			e.status !== "not_applicable",
	).length;
	const openGaps = gaps.filter(
		(g) => g.sessionId === session.$id && g.status === "open",
	).length;
	return {
		openEvidence,
		openGaps,
		isReady: openEvidence === 0 && openGaps === 0,
	};
}

const SESSION_STATUS_FILTER_OPTIONS = [
	"draft",
	"scheduled",
	"prep",
	"in_progress",
	"completed",
	"report_ready",
	"archived",
	"cancelled",
] as const;

/** Status filter pill (FILTER_PILL_TRIGGER) with a checkbox list, matching Contracts/Licenses. */
function SessionFilterMenu({
	value,
	onChange,
}: {
	value: string[];
	onChange: (next: string[]) => void;
}) {
	const toggle = (status: string, checked: boolean) => {
		onChange(checked ? [...value, status] : value.filter((s) => s !== status));
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label="Filter simulations by status"
					className={FILTER_PILL_TRIGGER}
				>
					<Filter className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
					<span className="truncate">
						{value.length > 0 ? `Filter (${value.length})` : "All statuses"}
					</span>
					<ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
				</button>
			</DropdownMenuTrigger>
			<AppDropdownMenuContent align="end" className="w-64 p-1">
				<DropdownMenuLabel className="sidebar-gradient-text">
					Filter by status
				</DropdownMenuLabel>
				<SessionFilterRow
					checked={value.length === 0}
					label="All statuses"
					onCheckedChange={() => onChange([])}
				/>
				{SESSION_STATUS_FILTER_OPTIONS.map((status) => (
					<SessionFilterRow
						key={status}
						checked={value.includes(status)}
						label={sessionStatusLabel(status)}
						onCheckedChange={(checked) => toggle(status, checked)}
					/>
				))}
				{value.length > 0 ? (
					<>
						<DropdownMenuSeparator />
						<AppDropdownMenuItem
							icon={FunnelX}
							onSelect={(event) => {
								event.preventDefault();
								onChange([]);
							}}
						>
							Clear filters
						</AppDropdownMenuItem>
					</>
				) : null}
			</AppDropdownMenuContent>
		</DropdownMenu>
	);
}

function SessionFilterRow({
	checked,
	label,
	onCheckedChange,
}: {
	checked: boolean;
	label: string;
	onCheckedChange: (checked: boolean) => void;
}) {
	return (
		<div
			role="menuitemcheckbox"
			aria-checked={checked}
			tabIndex={0}
			className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-slate-700 transition-colors duration-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
			onPointerDown={(event) => {
				event.preventDefault();
				event.stopPropagation();
			}}
			onClick={() => onCheckedChange(!checked)}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onCheckedChange(!checked);
				}
			}}
		>
			<Checkbox
				checked={checked}
				tabIndex={-1}
				className="pointer-events-none"
			/>
			<span>{label}</span>
		</div>
	);
}

/** Renders `**bold**` spans from mock/activity text as <strong>. */
function BoldText({ text }: { text: string }) {
	const parts = text.split(/(\*\*[^*]+\*\*)/g);
	return (
		<>
			{parts.map((part, index) =>
				part.startsWith("**") && part.endsWith("**") ? (
					<strong key={index}>{part.slice(2, -2)}</strong>
				) : (
					<Fragment key={index}>{part}</Fragment>
				),
			)}
		</>
	);
}

/** Loading placeholder for the Overview surface, shaped like the real layout. */
function AuditLabOverviewSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
				{Array.from({ length: 4 }, (_, i) => (
					<Card key={i} className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="space-y-3 p-4 pt-6 sm:p-6 sm:pt-6">
							<div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
								<Skeleton className="h-8 w-8 rounded-lg" />
								<Skeleton className="h-4 w-24" />
							</div>
							<Skeleton className="h-8 w-16" />
							<Skeleton className="h-1.5 w-full rounded-full" />
						</CardContent>
					</Card>
				))}
			</div>

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4">
						<Skeleton className="h-4 w-36" />
						<Skeleton className="h-3 w-28" />
					</div>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						{Array.from({ length: 3 }, (_, i) => (
							<div
								key={i}
								className="space-y-3 rounded-lg border border-slate-200 bg-white/80 p-4"
							>
								<Skeleton className="h-5 w-28 rounded-full" />
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-3 w-3/4" />
								<Skeleton className="h-8 w-full rounded-full" />
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.62fr_1fr]">
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-3 w-14" />
						</div>
						<div className="divide-y divide-slate-200">
							{Array.from({ length: 4 }, (_, i) => (
								<div key={i} className="flex items-center gap-4 py-3">
									<div className="min-w-0 flex-1 space-y-1.5">
										<Skeleton className="h-4 w-40" />
										<Skeleton className="h-3 w-24" />
									</div>
									<Skeleton className="h-6 w-20 rounded-full" />
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="space-y-3 p-4 sm:p-6">
						<div className="mb-1 border-b border-slate-200 pb-4">
							<Skeleton className="h-4 w-28" />
						</div>
						{Array.from({ length: 4 }, (_, i) => (
							<ActivityItemSkeleton key={i} />
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

/** Loading placeholder for Simulations, shaped like search + filter + table. */
function AuditLabSessionsSkeleton() {
	return (
		<Card className="glass-card" aria-hidden>
			<div className="glass-card-cap" />
			<CardContent className="space-y-3 p-4 sm:p-6">
				<div className="flex flex-wrap items-center justify-between gap-3 pb-1">
					<Skeleton className="h-9 w-full max-w-xl rounded-lg" />
					<Skeleton className="h-[1.55rem] w-28 rounded-full" />
				</div>
				<CaalmDataTableSkeleton columns={9} rows={6} className="pt-0" />
			</CardContent>
		</Card>
	);
}

/** Generic loading placeholder for other non-overview surfaces. */
function AuditLabSurfaceSkeleton() {
	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center gap-3">
				<Skeleton className="h-[1.55rem] w-56 rounded-full" />
				<Skeleton className="h-[1.55rem] w-32 rounded-full" />
				<Skeleton className="ml-auto h-8 w-32 rounded-full" />
			</div>
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="space-y-3 p-4 sm:p-6">
					{Array.from({ length: 5 }, (_, i) => (
						<div key={i} className="flex items-center gap-3">
							<Skeleton className="h-9 w-9 shrink-0 rounded-full" />
							<div className="flex-1 space-y-1.5">
								<Skeleton className="h-3.5 w-1/3" />
								<Skeleton className="h-3 w-1/2" />
							</div>
							<Skeleton className="h-5 w-20 rounded-full" />
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}

export function AuditLabClient({
	surface,
	capabilities: initialCapabilities,
}: {
	surface: AuditLabSurface;
	capabilities: LabCapabilities;
}) {
	const copy = SURFACE_COPY[surface];
	const { data: capsData } = useSWR<{
		data?: { capabilities: LabCapabilities };
	}>("/api/audit-lab/capabilities", fetcher, { refreshInterval: 30_000 });
	const capabilities = capsData?.data?.capabilities ?? initialCapabilities;
	const canManageSessions = capabilities.canCreateSession;
	const canManageEvidence = capabilities.canManageEvidence;
	const canPractice = capabilities.canRunPractice;
	const canScore = capabilities.canScorePractice;
	const canViewPracticePii = capabilities.canViewPracticePii;

	const { toast } = useToast();
	const searchParams = useSearchParams();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [cancelOpen, setCancelOpen] = useState(false);
	const [cancelIsBulk, setCancelIsBulk] = useState(false);
	const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(
		new Set(),
	);
	const [rescheduleOpen, setRescheduleOpen] = useState(false);
	const [completeOpen, setCompleteOpen] = useState(false);
	const [newOpen, setNewOpen] = useState(false);
	const [detailOpen, setDetailOpen] = useState(false);
	const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
	const [busyAction, setBusyAction] = useState<string | null>(null);
	const [practiceMode, setPracticeMode] = useState<"voice" | "text">("voice");
	const [evidenceGroup, setEvidenceGroup] = useState<
		"department" | "owner" | "assignee"
	>("department");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [upcomingPage, setUpcomingPage] = useState(1);
	const [sessionSort, setSessionSort] = useState<SessionSort>({
		key: "scheduled",
		direction: "asc",
	});
	const [sessionStatusFilter, setSessionStatusFilter] = useState<string[]>([]);
	const [sessionQuery, setSessionQuery] = useState("");
	const [sessionsPage, setSessionsPage] = useState(1);

	const toggleSessionSort = (key: SessionSortKey) => {
		setSessionSort((prev) =>
			prev.key === key
				? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
				: { key, direction: "asc" },
		);
	};

	const overviewUrl =
		surface === "overview"
			? "/api/audit-lab/overview"
			: "/api/audit-lab/sessions";

	const { data, error, isLoading, mutate } = useSWR<{ data?: OverviewPayload }>(
		overviewUrl,
		fetcher,
		{ refreshInterval: detailOpen ? 8_000 : 0 },
	);

	const payload = data?.data;
	const sessions = payload?.sessions ?? payload?.upcoming ?? [];
	const evidence = payload?.evidence ?? [];
	const gaps = payload?.gaps ?? [];
	const selected = sessions.find((s) => s.$id === selectedId) ?? sessions[0];

	const UPCOMING_PAGE_SIZE = 6;
	const upcomingItems = payload?.upcoming ?? [];
	const upcomingTotalPages = pageCountFromItems(
		upcomingItems.length,
		UPCOMING_PAGE_SIZE,
	);
	const upcomingPageSafe = Math.min(upcomingPage, upcomingTotalPages);
	const pagedUpcoming = upcomingItems.slice(
		(upcomingPageSafe - 1) * UPCOMING_PAGE_SIZE,
		upcomingPageSafe * UPCOMING_PAGE_SIZE,
	);

	// Sessions surface has no separate "upcoming" list — its avatars come
	// straight from the full session list instead.
	const avatarSourceSessions =
		surface === "simulations" ? sessions : upcomingItems;

	const upcomingParticipantIds = useMemo(() => {
		const ids = new Set<string>();
		for (const session of avatarSourceSessions) {
			for (const person of parseParticipants(session.participantsJson)) {
				if (person.userId && !person.userId.startsWith("mock-")) {
					ids.add(person.userId);
				}
			}
		}
		return [...ids].sort();
	}, [avatarSourceSessions]);

	const { data: participantProfiles } = useSWR(
		(surface === "overview" || surface === "simulations") &&
			upcomingParticipantIds.length > 0
			? ["audit-lab-upcoming-avatars", upcomingParticipantIds.join(",")]
			: null,
		async () => {
			const res = await fetch("/api/users/get-by-ids", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userIds: upcomingParticipantIds }),
			});
			if (!res.ok) return [];
			const users = (await res.json()) as Array<{
				$id?: string;
				accountId?: string;
				fullName?: string;
				avatar?: string | null;
				profileImageId?: string | null;
				department?: string | null;
				division?: string | null;
			}>;
			return Array.isArray(users) ? users : [];
		},
	);

	const upcomingAvatarByUserId = useMemo(() => {
		const map = new Map<string, { name: string; imageUrl: string | null }>();
		for (const user of participantProfiles ?? []) {
			if (!user?.$id) continue;
			const entry = {
				name: user.fullName?.trim() || "",
				imageUrl: resolveAvatarDisplayUrl(user),
			};
			map.set(user.$id, entry);
			if (user.accountId) map.set(user.accountId, entry);
		}
		return map;
	}, [participantProfiles]);

	const sheetProfilesByUserId = useMemo(
		() => profilesFromUsers(participantProfiles ?? []),
		[participantProfiles],
	);

	const detailSession =
		sessions.find((s) => s.$id === detailSessionId) ??
		upcomingItems.find((s) => s.$id === detailSessionId) ??
		null;

	function openSimulationDetail(sessionId: string) {
		setDetailSessionId(sessionId);
		setDetailOpen(true);
	}

	// Open builder deep-link: /audit-lab/interview?sessionId=…
	useEffect(() => {
		if (surface !== "interview") return;
		const fromQuery = searchParams.get("sessionId");
		if (fromQuery) setSelectedId(fromQuery);
	}, [surface, searchParams]);

	const { data: bankData, mutate: mutateBank } = useSWR<{
		data?: {
			questions: ReviewQuestion[];
			script?: { itemsJson?: string; version?: number } | null;
			version?: number;
		};
	}>(
		surface === "interview" && selected
			? `/api/audit-lab/interview/bank?sessionId=${selected.$id}`
			: null,
		fetcher,
	);

	const coverageByDept = useMemo(() => {
		const map: Record<string, { total: number; accepted: number }> = {};
		for (const item of evidence) {
			const name = item.department || "Unassigned";
			map[name] ??= { total: 0, accepted: 0 };
			map[name].total += 1;
			if (item.status === "accepted") map[name].accepted += 1;
		}
		return Object.entries(map).map(([name, stats]) => ({
			name,
			acceptedPct:
				stats.total === 0
					? 0
					: Math.round((stats.accepted / stats.total) * 100),
		}));
	}, [evidence]);

	// shortcut: demo department split for orgs with no real evidence yet.
	// List is intentionally long so the capped hover-scroll + bottom blur show.
	const readinessDeptBreakdown =
		coverageByDept.length > 0
			? coverageByDept
			: [
					{ name: "HR", acceptedPct: 91 },
					{ name: "Finance", acceptedPct: 82 },
					{ name: "Legal", acceptedPct: 76 },
					{ name: "IT", acceptedPct: 58 },
					{ name: "Operations", acceptedPct: 71 },
					{ name: "Marketing", acceptedPct: 64 },
					{ name: "Sales", acceptedPct: 69 },
					{ name: "Customer Success", acceptedPct: 73 },
					{ name: "Facilities", acceptedPct: 55 },
					{ name: "R&D", acceptedPct: 67 },
				];

	const filteredSessions = useMemo(() => {
		const q = sessionQuery.trim().toLowerCase();
		const matching = sessions.filter((session) => {
			if (
				sessionStatusFilter.length > 0 &&
				!sessionStatusFilter.includes(session.status)
			) {
				return false;
			}
			if (!q) return true;
			return (
				session.title.toLowerCase().includes(q) ||
				session.department.toLowerCase().includes(q)
			);
		});
		return matching.sort((a, b) => compareSessions(a, b, sessionSort));
	}, [sessions, sessionStatusFilter, sessionSort, sessionQuery]);

	const SESSIONS_PAGE_SIZE = 12;
	const sessionsTotalPages = pageCountFromItems(
		filteredSessions.length,
		SESSIONS_PAGE_SIZE,
	);
	const sessionsPageSafe = Math.min(sessionsPage, sessionsTotalPages);
	const pagedSessions = filteredSessions.slice(
		(sessionsPageSafe - 1) * SESSIONS_PAGE_SIZE,
		sessionsPageSafe * SESSIONS_PAGE_SIZE,
	);

	// A new search, status filter or sort starts back on the first page and
	// drops any selection, since the rows behind it just changed.
	useEffect(() => {
		setSessionsPage(1);
		setSelectedSessionIds(new Set());
	}, [sessionStatusFilter, sessionSort, sessionQuery]);

	const pagedSessionIds = useMemo(
		() => pagedSessions.map((s) => s.$id),
		[pagedSessions],
	);
	const allPagedSelected =
		pagedSessionIds.length > 0 &&
		pagedSessionIds.every((id) => selectedSessionIds.has(id));
	const somePagedSelected =
		!allPagedSelected &&
		pagedSessionIds.some((id) => selectedSessionIds.has(id));

	const toggleSessionSelect = (id: string, checked: boolean) => {
		setSelectedSessionIds((prev) => {
			const next = new Set(prev);
			if (checked) next.add(id);
			else next.delete(id);
			return next;
		});
	};

	const toggleAllPagedSessions = (checked: boolean) => {
		setSelectedSessionIds((prev) => {
			const next = new Set(prev);
			for (const id of pagedSessionIds) {
				if (checked) next.add(id);
				else next.delete(id);
			}
			return next;
		});
	};

	const { data: evidenceMatrixData } = useSWR<{
		data?: { linkSummaries?: Record<string, EvidenceLinkSummary> };
	}>(
		surface === "evidence" && selected
			? `/api/audit-lab/evidence?sessionId=${selected.$id}`
			: null,
		fetcher,
	);
	const linkSummaries = evidenceMatrixData?.data?.linkSummaries ?? {};

	const filteredEvidence = useMemo(() => {
		return evidence.filter((item) => {
			if (selected && item.sessionId !== selected.$id) return false;
			if (statusFilter !== "all" && item.status !== statusFilter) {
				return false;
			}
			return true;
		});
	}, [evidence, statusFilter, selected]);

	const trendSeries = useMemo(() => {
		return coverageByDept.map((row) => ({
			label: row.name,
			readiness: row.acceptedPct,
			practice: Math.max(0, row.acceptedPct - 8),
		}));
	}, [coverageByDept]);

	const stats = useMemo(() => {
		if (payload?.stats) return payload.stats;
		const upcoming = sessions.filter(
			(s) => s.status === "scheduled" || s.status === "draft",
		).length;
		const missing = evidence.filter((e) => e.status !== "accepted").length;
		return {
			readinessScore: 0,
			readinessTrend: undefined as number | undefined,
			openGaps: payload?.gaps?.length ?? 0,
			openGapsTrendLabel: undefined as string | undefined,
			evidenceCoverage: 0,
			sessionsThisQuarter: upcoming,
			upcoming,
			missing,
		};
	}, [sessions, evidence, payload]);

	// shortcut: no historical snapshot of last quarter's score is stored yet,
	// so "last quarter" is simply backed out from today's score and trend.
	const lastQuarterReadiness =
		typeof stats.readinessTrend === "number"
			? (stats.readinessScore ?? 0) - stats.readinessTrend
			: null;

	// shortcut: ReviewGap has no category field in the schema, so the
	// Evidence/Owner/Policy split is always a proportional estimate off the
	// headline total, never a real per-gap category lookup.
	const gapSegments = useMemo(() => {
		const total = stats.openGaps ?? 0;
		if (total === 0) return [];
		const evidenceCount = Math.round(total * (5 / 12));
		const ownerCount = Math.round(total * (3 / 12));
		const policyCount = Math.max(0, total - evidenceCount - ownerCount);
		return [
			{
				key: "evidence",
				label: "Evidence",
				count: evidenceCount,
				colorClass: "bg-red",
				textClass: "text-red",
			},
			{
				key: "owner",
				label: "Owner",
				count: ownerCount,
				colorClass: "bg-[#7c5cff]",
				textClass: "text-[#7c5cff]",
			},
			{
				key: "policy",
				label: "Policy",
				count: policyCount,
				colorClass: "bg-orange",
				textClass: "text-orange",
			},
		];
	}, [stats.openGaps]);

	// shortcut: no weekly gap-count history is tracked yet, so the 7-week
	// trend is a static illustrative shape, not real week-over-week data.
	const gapWeeklyTrend = useMemo(
		() =>
			[40, 55, 35, 60, 45, 70, 100].map((value, index) => ({
				week: `wk ${String(index + 1).padStart(2, "0")}`,
				value,
			})),
		[],
	);
	const oldestGapDays = 14;

	const evidenceSegments = useMemo(() => {
		if (evidence.length === 0) {
			const pct = stats.evidenceCoverage ?? 0;
			if (pct === 0) return { segments: [], accepted: 0, total: 0 };
			// shortcut: demo numbers chosen so accepted/total matches the pct.
			const total = 500;
			const accepted = Math.round((pct / 100) * total);
			const overdue = 18;
			const notStarted = 71;
			const other = Math.max(0, total - accepted - overdue - notStarted);
			return {
				segments: [
					{
						key: "accepted",
						label: "Accepted",
						count: accepted,
						colorClass: "bg-green",
						textClass: "text-green",
					},
					{
						key: "overdue",
						label: "Overdue",
						count: overdue,
						colorClass: "bg-red",
						textClass: "text-red",
					},
					{
						key: "not_started",
						label: "Not started",
						count: notStarted,
						colorClass: "bg-slate-300",
						textClass: "text-slate-500",
					},
					{
						key: "other",
						label: "Other",
						count: other,
						colorClass: "bg-slate-200",
						textClass: "text-slate-400",
					},
				],
				accepted,
				total,
			};
		}
		const now = Date.now();
		let accepted = 0;
		let notStarted = 0;
		let overdue = 0;
		let other = 0;
		for (const e of evidence) {
			if (e.status === "accepted") accepted++;
			else if (e.status === "not_applicable" || e.status === "not_started")
				notStarted++;
			else if (e.dueAt && new Date(e.dueAt).getTime() < now) overdue++;
			else other++;
		}
		return {
			segments: [
				{
					key: "accepted",
					label: "Accepted",
					count: accepted,
					colorClass: "bg-green",
					textClass: "text-green",
				},
				{
					key: "overdue",
					label: "Overdue",
					count: overdue,
					colorClass: "bg-red",
					textClass: "text-red",
				},
				{
					key: "not_started",
					label: "Not started",
					count: notStarted,
					colorClass: "bg-slate-300",
					textClass: "text-slate-500",
				},
				{
					key: "other",
					label: "In progress",
					count: other,
					colorClass: "bg-orange",
					textClass: "text-orange",
				},
			],
			accepted,
			total: evidence.length,
		};
	}, [evidence, stats.evidenceCoverage]);

	const SESSION_STATUS_SEGMENT: Record<
		string,
		{ label: string; colorClass: string; textClass: string }
	> = {
		scheduled: {
			label: "Scheduled",
			colorClass: "bg-[#0f5384]",
			textClass: "text-[#0f5384]",
		},
		draft: {
			label: "Scheduled",
			colorClass: "bg-[#0f5384]",
			textClass: "text-[#0f5384]",
		},
		prep: { label: "Prep", colorClass: "bg-orange", textClass: "text-orange" },
		in_progress: {
			label: "In progress",
			colorClass: "bg-[#078fab]",
			textClass: "text-[#078fab]",
		},
		completed: {
			label: "Done",
			colorClass: "bg-green",
			textClass: "text-green",
		},
		report_ready: {
			label: "Done",
			colorClass: "bg-green",
			textClass: "text-green",
		},
		archived: {
			label: "Done",
			colorClass: "bg-green",
			textClass: "text-green",
		},
	};

	const sessionSegments = useMemo(() => {
		const total = stats.sessionsThisQuarter ?? 0;
		if (total === 0) return [];
		const realSessions = sessions.filter((s) => s.status !== "cancelled");
		if (realSessions.length === 0) {
			// shortcut: demo breakdown sized to match the mock headline count (5).
			return [
				{
					key: "scheduled",
					label: "Scheduled",
					count: 2,
					colorClass: "bg-[#0f5384]",
					textClass: "text-[#0f5384]",
				},
				{
					key: "prep",
					label: "Prep",
					count: 1,
					colorClass: "bg-orange",
					textClass: "text-orange",
				},
				{
					key: "in_progress",
					label: "In progress",
					count: 1,
					colorClass: "bg-[#078fab]",
					textClass: "text-[#078fab]",
				},
				{
					key: "done",
					label: "Done",
					count: 1,
					colorClass: "bg-green",
					textClass: "text-green",
				},
			];
		}
		const counts: Record<string, number> = {};
		for (const s of realSessions) {
			const visual = SESSION_STATUS_SEGMENT[s.status];
			const label = visual?.label ?? "Scheduled";
			counts[label] = (counts[label] ?? 0) + 1;
		}
		const order = ["Scheduled", "Prep", "In progress", "Done"];
		const byLabel = Object.fromEntries(
			Object.values(SESSION_STATUS_SEGMENT).map((v) => [v.label, v]),
		);
		const realBreakdown = order
			.filter((label) => counts[label] > 0)
			.map((label) => ({
				key: label,
				label,
				count: counts[label],
				colorClass: byLabel[label]?.colorClass ?? "bg-slate-300",
				textClass: byLabel[label]?.textClass ?? "text-slate-500",
			}));
		const realTotal = realBreakdown.reduce((sum, seg) => sum + seg.count, 0);
		// The headline count can come from the mock stats fallback even when a
		// handful of real (incomplete) sessions exist — if the real breakdown
		// doesn't actually account for the full headline number, it's not a
		// trustworthy breakdown of it, so fall back to the demo split instead.
		if (realTotal !== total) {
			return [
				{
					key: "scheduled",
					label: "Scheduled",
					count: 2,
					colorClass: "bg-[#0f5384]",
					textClass: "text-[#0f5384]",
				},
				{
					key: "prep",
					label: "Prep",
					count: 1,
					colorClass: "bg-orange",
					textClass: "text-orange",
				},
				{
					key: "in_progress",
					label: "In progress",
					count: 1,
					colorClass: "bg-[#078fab]",
					textClass: "text-[#078fab]",
				},
				{
					key: "done",
					label: "Done",
					count: 1,
					colorClass: "bg-green",
					textClass: "text-green",
				},
			];
		}
		return realBreakdown;
	}, [sessions, stats.sessionsThisQuarter]);

	// Prefer a session that actually has a scheduled time to show as "next
	// up" — a real but still-draft session with no date isn't useful there.
	const nextUpSession =
		upcomingItems.find((s) => s.scheduledAt) ?? upcomingItems[0];
	const prepDeadlineLabel = useMemo(() => {
		if (!nextUpSession) return null;
		if (!nextUpSession.prepDeadlineAt) {
			// shortcut: mock sessions carry a display string, not a real ISO
			// date, so the demo countdown is a fixed label rather than a diff.
			return nextUpSession.$id.startsWith("mock-")
				? "prep deadline in 2 days"
				: null;
		}
		const days = Math.ceil(
			(new Date(nextUpSession.prepDeadlineAt).getTime() - Date.now()) /
				86_400_000,
		);
		if (days < 0) return "prep deadline passed";
		if (days === 0) return "prep deadline today";
		return `prep deadline in ${days} day${days === 1 ? "" : "s"}`;
	}, [nextUpSession]);

	const statGridRef = useRef<HTMLDivElement>(null);
	const readinessCardRef = useRef<HTMLDivElement>(null);

	// Spec: Readiness score is the only stat card allowed to set height; the
	// other three follow it via this CSS var instead of default grid stretch.
	// Re-run after loading so refs exist once the overview grid mounts.
	useLayoutEffect(() => {
		const reference = readinessCardRef.current;
		const grid = statGridRef.current;
		if (!reference || !grid) return;
		const syncHeight = () => {
			grid.style.setProperty(
				"--stat-card-height",
				`${reference.getBoundingClientRect().height}px`,
			);
		};
		syncHeight();
		const observer = new ResizeObserver(syncHeight);
		observer.observe(reference);
		return () => observer.disconnect();
	}, [isLoading, surface]);

	async function postJson(url: string, body: unknown) {
		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		const json = (await res.json()) as { error?: string; data?: unknown };
		if (!res.ok) throw new Error(json.error || "Request failed");
		return json;
	}

	async function patchSession(id: string, body: unknown) {
		const res = await fetch(`/api/audit-lab/sessions/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		const json = (await res.json()) as { error?: string };
		if (!res.ok) throw new Error(json.error || "Request failed");
	}

	const onError = (err: unknown, fallback: string) => {
		toast({
			title: "Audit Lab",
			description: toUserFacingErrorMessage(err, fallback),
			variant: "destructive",
		});
	};

	const primaryAction =
		surface === "simulations" && canManageSessions ? (
			<Button
				type="button"
				className="btn-primary px-3 sm:px-4"
				onClick={() => setNewOpen(true)}
			>
				<Plus className="h-4 w-4" />
				New simulation
			</Button>
		) : null;

	return (
		<AuditLabShell
			title={copy.title}
			description={copy.description}
			capabilities={capabilities}
			primaryAction={primaryAction}
		>
			{error ? (
				<LoadError
					scale="section"
					title="Audit Lab didn't load"
					elementKey="audit-lab-client"
					error={{ requestPath: overviewUrl }}
					onRetry={() => void mutate()}
				/>
			) : isLoading ? (
				surface === "overview" ? (
					<AuditLabOverviewSkeleton />
				) : surface === "simulations" ? (
					<AuditLabSessionsSkeleton />
				) : (
					<AuditLabSurfaceSkeleton />
				)
			) : (
				<>
					{surface === "overview" ? (
						<div className="space-y-6">
							<motion.div
								ref={statGridRef}
								className="grid grid-cols-1 items-start gap-4 md:grid-cols-4"
								variants={staggerFast}
								initial="hidden"
								whileInView="visible"
								viewport={viewportOnce}
							>
								<motion.div
									ref={readinessCardRef}
									data-stat-card="readiness-score"
									variants={fadeUp}
								>
									<MetricStatCard
										title="Readiness score"
										value={`${stats.readinessScore ?? 0}%`}
										icon={Star}
										valueAside={
											typeof stats.readinessTrend === "number" ? (
												<span className="text-sm font-semibold text-green">
													▲ {stats.readinessTrend}
												</span>
											) : undefined
										}
										footer={
											<div>
												<div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
													<motion.div
														className="h-full origin-left rounded-full"
														initial={{ scaleX: 0 }}
														whileInView={{ scaleX: 1 }}
														viewport={viewportOnce}
														transition={{
															duration: STAT_CHART_DURATION_SEC,
															ease: "easeOut",
														}}
														style={{
															width: `${Math.min(100, Math.max(0, stats.readinessScore ?? 0))}%`,
															background: SIDEBAR_BAR_FILL,
														}}
													/>
												</div>
												<div className="mt-3 flex items-center justify-between">
													<p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
														By department
													</p>
													<p className="text-[10px] font-semibold text-[#0f5384]">
														hover to scroll ↓
													</p>
												</div>
												<ul
													className="review-hover-scroll mt-1.5 max-h-24 space-y-1.5 pr-1"
													style={{
														// Keep the last full row solid; fade only a short strip at the bottom edge.
														maskImage:
															"linear-gradient(to bottom, #000 0%, #000 86%, transparent 100%)",
														WebkitMaskImage:
															"linear-gradient(to bottom, #000 0%, #000 86%, transparent 100%)",
													}}
												>
													{readinessDeptBreakdown.map((dept, index) => (
														<li
															key={dept.name}
															className={cn(
																"flex items-center gap-2 text-xs text-slate-600",
																index === readinessDeptBreakdown.length - 1 &&
																	"pb-1",
															)}
														>
															<span className="w-[4.5rem] shrink-0 truncate">
																{dept.name}
															</span>
															<span className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
																<motion.span
																	className="block h-full origin-left rounded-full"
																	initial={{ scaleX: 0 }}
																	whileInView={{ scaleX: 1 }}
																	viewport={viewportOnce}
																	transition={{
																		duration: STAT_CHART_DURATION_SEC,
																		ease: "easeOut",
																		delay: STAT_STAGGER_SEC * index,
																	}}
																	style={{
																		width: `${dept.acceptedPct}%`,
																		background: SIDEBAR_BAR_FILL,
																	}}
																/>
															</span>
															<span className="w-8 shrink-0 text-right tabular-nums text-slate-500">
																{dept.acceptedPct}%
															</span>
														</li>
													))}
												</ul>
												<p className="mt-2 border-t border-slate-200 pt-2 text-[11px] text-slate-500">
													vs. {lastQuarterReadiness ?? 74}% last quarter ·{" "}
													{readinessDeptBreakdown.length} departments in scope
												</p>
											</div>
										}
									/>
								</motion.div>
								<motion.div
									data-stat-card="open-gaps"
									className="overflow-hidden"
									style={{ height: "var(--stat-card-height, auto)" }}
									variants={fadeUp}
								>
									<MetricStatCard
										title="Open rehearsal gaps"
										value={stats.openGaps ?? 0}
										icon={ClipboardList}
										valueAside={
											stats.openGapsTrendLabel ? (
												<span className="text-sm font-semibold text-red">
													▼ {stats.openGapsTrendLabel.replace(/^-/, "")}
												</span>
											) : undefined
										}
										pinFooter
										footer={
											gapSegments.length > 0 ? (
												<>
													<div className="flex flex-1 items-center py-1">
														<MetricSegmentBar
															className="w-full"
															segments={gapSegments}
															legendMuted
															immediate
															durationMs={STAT_CHART_DURATION_MS}
														/>
													</div>
													<div className="mt-auto w-full shrink-0 space-y-2">
														{/* Fixed px height: % height inside equal-height overflow cards collapses to 0. */}
														<div className="relative h-[7rem] w-full min-w-0 outline-none **:outline-none">
															<ResponsiveContainer width="100%" height={112}>
																<AreaChart
																	data={gapWeeklyTrend}
																	margin={{
																		top: 6,
																		right: 4,
																		left: 4,
																		bottom: 2,
																	}}
																>
																	<defs>
																		<linearGradient
																			id="auditLabGapsWaveFill"
																			x1="0"
																			y1="0"
																			x2="0"
																			y2="1"
																		>
																			<stop
																				offset="0%"
																				stopColor="#03AFBF"
																				stopOpacity={0.28}
																			/>
																			<stop
																				offset="100%"
																				stopColor="#0f5384"
																				stopOpacity={0.02}
																			/>
																		</linearGradient>
																	</defs>
																	<XAxis
																		dataKey="week"
																		interval={0}
																		tick={{ fill: "#64748b", fontSize: 9 }}
																		tickLine={false}
																		axisLine={{ stroke: "#cbd5e1" }}
																		height={18}
																	/>
																	<ChartTooltip
																		cursor={{
																			stroke: "#0f5384",
																			strokeDasharray: "3 3",
																		}}
																		content={({ active, payload }) => {
																			if (!active || !payload?.[0]) return null;
																			const point = payload[0].payload as {
																				week: string;
																				value: number;
																			};
																			return (
																				<div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-md">
																					<p className="text-xs font-medium text-slate-700">
																						{point.week}
																					</p>
																					<p className="mt-1 text-xs tabular-nums text-slate-600">
																						<span className="font-semibold text-slate-700">
																							{point.value}
																						</span>{" "}
																						gap index
																					</p>
																				</div>
																			);
																		}}
																	/>
																	<Area
																		type="monotone"
																		dataKey="value"
																		stroke="#0f5384"
																		strokeWidth={2}
																		fill="url(#auditLabGapsWaveFill)"
																		dot={false}
																		activeDot={{
																			r: 5,
																			fill: "rgba(255, 255, 255, 0.55)",
																			stroke: "#0f5384",
																			strokeWidth: 2,
																		}}
																		isAnimationActive
																		animationDuration={STAT_CHART_DURATION_MS}
																		animationEasing="ease-out"
																	/>
																</AreaChart>
															</ResponsiveContainer>
														</div>
														<p className="text-[11px] text-slate-500">
															7-week trend · oldest gap:{" "}
															<span className="font-semibold text-slate-700">
																{oldestGapDays}d
															</span>
														</p>
													</div>
												</>
											) : undefined
										}
									/>
								</motion.div>
								<motion.div
									data-stat-card="evidence-coverage"
									className="overflow-hidden"
									style={{ height: "var(--stat-card-height, auto)" }}
									variants={fadeUp}
								>
									<MetricStatCard
										title="Evidence coverage"
										value={`${stats.evidenceCoverage ?? 0}%`}
										icon={Globe}
										pinFooter
										footer={
											evidenceSegments.segments.length > 0 ? (
												<>
													{/* Sit under the headline %; leftover height stays between caption and KPI bar. */}
													<div className="flex w-full flex-col items-center gap-2">
														<div className="relative inline-flex items-center justify-center">
															<MetricProgressRing
																percent={stats.evidenceCoverage ?? 0}
																size={88}
																stroke={7}
																tone="default"
																sidebarGradient
																immediate
																durationSec={STAT_CHART_DURATION_SEC}
															/>
															{/* Gradient class must live on CountUp's own span — a parent
															    with sidebar-gradient-text makes nested text invisible. */}
															<CountUp
																key={`evidence-donut-${stats.evidenceCoverage ?? 0}`}
																className="pointer-events-none absolute text-sm font-bold tabular-nums sidebar-gradient-text"
																start={0}
																end={stats.evidenceCoverage ?? 0}
																duration={STAT_CHART_DURATION_SEC}
																suffix="%"
																preserveValue
															/>
														</div>
														<p className="text-center text-[11px] leading-snug text-slate-500">
															<span className="font-semibold text-slate-700">
																{evidenceSegments.accepted}
															</span>{" "}
															of {evidenceSegments.total} items accepted
														</p>
													</div>
													<div className="mt-auto w-full pt-6">
														<MetricSegmentBar
															segments={evidenceSegments.segments}
															legendMuted
															immediate
															durationMs={STAT_CHART_DURATION_MS}
														/>
													</div>
												</>
											) : undefined
										}
									/>
								</motion.div>
								<motion.div
									data-stat-card="sessions-this-quarter"
									className="overflow-hidden"
									style={{ height: "var(--stat-card-height, auto)" }}
									variants={fadeUp}
								>
									<MetricStatCard
										title="Simulations this quarter"
										value={stats.sessionsThisQuarter ?? 0}
										icon={CalendarRange}
										pinFooter
										footer={
											<>
												<div className="flex flex-1 flex-col justify-center gap-2 py-1">
													{/* Sized to leave room for legend + Next up inside equal-height cards */}
													<div className="flex flex-wrap items-center gap-1.5">
														{sessionSegments.flatMap((seg) =>
															Array.from({ length: seg.count }, (_, i) => (
																<motion.span
																	key={`${seg.key}-${i}`}
																	className={cn(
																		"size-7 rounded-sm",
																		seg.colorClass,
																	)}
																	initial={{ scale: 0, opacity: 0 }}
																	whileInView={{ scale: 1, opacity: 1 }}
																	viewport={viewportOnce}
																	transition={{
																		type: "spring",
																		stiffness: 160,
																		damping: 18,
																		delay: STAT_STAGGER_SEC * i,
																	}}
																/>
															)),
														)}
													</div>
													{sessionSegments.length > 0 ? (
														<div className="flex flex-wrap gap-x-3 gap-y-1">
															{sessionSegments.map((seg) => (
																<span
																	key={seg.key}
																	className={cn(
																		"inline-flex items-center gap-1.5 text-[11px] tabular-nums",
																		seg.textClass,
																	)}
																>
																	<span
																		className={cn(
																			"h-1.5 w-1.5 shrink-0 rounded-full",
																			seg.colorClass,
																		)}
																		aria-hidden
																	/>
																	{seg.label} — {seg.count}
																</span>
															))}
														</div>
													) : null}
												</div>
												{nextUpSession ? (
													<p className="mt-auto border-t border-slate-200 pt-2 text-[11px] text-slate-500">
														Next up:{" "}
														<span className="font-semibold text-slate-700">
															{nextUpSession.title}
														</span>
														<br />
														{nextUpSession.scheduledAt ?? "—"}
														{prepDeadlineLabel ? ` · ${prepDeadlineLabel}` : ""}
													</p>
												) : null}
											</>
										}
									/>
								</motion.div>
							</motion.div>

							<motion.div
								variants={scaleIn}
								initial="hidden"
								whileInView="visible"
								viewport={viewportOnce}
							>
								<Card className="glass-card">
									<div className="glass-card-cap" />
									<CardContent className="p-4 sm:p-6">
										<div className="mb-4 border-b border-slate-200 pb-4">
											<div className="flex items-center justify-between gap-3">
												<p className="text-sm font-semibold sidebar-gradient-text">
													Suggested for review
												</p>
												<p className="text-xs text-slate-500">
													Risk-based, refreshed daily
												</p>
											</div>
											<p className="mt-1 text-xs text-slate-500">
												Findings most likely to resurface in your next audit.
												Schedule a rehearsal before they do.
											</p>
										</div>
										{(payload?.suggestions?.length ?? 0) > 0 ? (
											<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
												{payload?.suggestions?.map((s) => (
													<div
														key={s.id}
														className="flex h-full flex-col rounded-lg border border-slate-200 bg-white/80 p-4"
													>
														<span
															className={cn(
																"inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
																SUGGESTION_TAG_CLASS[s.tagTone],
															)}
														>
															{s.tag}
														</span>
														<p className="mt-3 text-sm font-semibold text-slate-800">
															{s.title}
														</p>
														<p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
															<Clock className="h-3.5 w-3.5" aria-hidden />
															{s.reason}
														</p>
														{canManageSessions ? (
															<div className="mt-auto pt-3">
																<Button
																	type="button"
																	size="sm"
																	className="btn-primary w-full!"
																	onClick={() => setNewOpen(true)}
																>
																	<CalendarClock className="h-3.5 w-3.5" />
																	Schedule
																</Button>
															</div>
														) : null}
													</div>
												))}
											</div>
										) : (
											<p className="text-sm text-slate-500">
												No suggestions yet. Import audit findings to seed drill
												material.
											</p>
										)}
									</CardContent>
								</Card>
							</motion.div>

							<div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.62fr_1fr]">
								<motion.div
									variants={fadeLeft}
									initial="hidden"
									whileInView="visible"
									viewport={viewportOnce}
								>
									<Card className="glass-card flex max-h-[521px] flex-col">
										<div className="glass-card-cap" />
										<CardContent className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
											<div className="mb-4 shrink-0 border-b border-slate-200 pb-4">
												<div className="flex items-center justify-between gap-3">
													<p className="text-sm font-semibold sidebar-gradient-text">
														Upcoming simulations
													</p>
													<Link
														href="/audit-lab/simulations"
														className="text-xs font-semibold text-[#0f5384] hover:underline"
													>
														View all
													</Link>
												</div>
												<p className="mt-1 text-xs text-slate-500">
													Rehearsals scheduled across departments this quarter.
												</p>
											</div>
											<div className="min-h-0 flex-1 overflow-y-auto">
												{upcomingItems.length > 0 ? (
													<ul className="divide-y divide-slate-200">
														{pagedUpcoming.map((session) => {
															const participants = parseParticipants(
																session.participantsJson,
															);
															return (
																<li
																	key={session.$id}
																	className="grid grid-cols-[minmax(0,calc(50%-2.5rem))_4rem_6rem_1fr] items-center gap-2 py-3 first:pt-0 last:pb-0"
																>
																	<div className="min-w-0 pr-2">
																		<button
																			type="button"
																			className="block w-full cursor-pointer truncate text-left text-sm font-semibold text-slate-800 hover:text-[#0f5384]"
																			onClick={() =>
																				openSimulationDetail(session.$id)
																			}
																		>
																			{session.title}
																		</button>
																		<p className="truncate text-xs text-slate-500">
																			{session.department}
																			{session.framework
																				? ` · ${session.framework}`
																				: ""}
																		</p>
																	</div>
																	<div className="flex items-center justify-self-start">
																		<TooltipProvider delayDuration={200}>
																			{participants
																				.slice(0, 3)
																				.map((p, index) => {
																					const profile =
																						upcomingAvatarByUserId.get(
																							p.userId,
																						);
																					const fullName =
																						profile?.name ||
																						p.name?.trim() ||
																						"Participant";
																					return (
																						<Tooltip
																							key={`${p.userId}-${index}`}
																						>
																							<TooltipTrigger asChild>
																								<span className="-ml-2 inline-flex rounded-full border-2 border-white first:ml-0">
																									<Avatar
																										userId={p.userId}
																										name={fullName}
																										size="xs"
																										imageUrl={profile?.imageUrl}
																									/>
																								</span>
																							</TooltipTrigger>
																							<TooltipContent>
																								<p>{fullName}</p>
																							</TooltipContent>
																						</Tooltip>
																					);
																				})}
																			{participants.length > 3 ? (
																				<Tooltip>
																					<TooltipTrigger asChild>
																						<span className="-ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[11px] font-medium text-slate-600">
																							+{participants.length - 3}
																						</span>
																					</TooltipTrigger>
																					<TooltipContent>
																						<div className="space-y-1">
																							{participants
																								.slice(3)
																								.map((p, index) => {
																									const profile =
																										upcomingAvatarByUserId.get(
																											p.userId,
																										);
																									return (
																										<p
																											key={`${p.userId}-${index}`}
																										>
																											{profile?.name ||
																												p.name?.trim() ||
																												"Participant"}
																										</p>
																									);
																								})}
																						</div>
																					</TooltipContent>
																				</Tooltip>
																			) : null}
																		</TooltipProvider>
																	</div>
																	<p className="translate-x-[90px] truncate text-left text-xs text-slate-600">
																		{session.scheduledAt ?? "—"}
																	</p>
																	<span
																		className={cn(
																			"w-fit shrink-0 justify-self-end whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
																			SESSION_STATUS_BADGE[session.status] ??
																				"bg-slate-100 text-slate-600 border-slate-200",
																		)}
																	>
																		{sessionStatusLabel(session.status)}
																	</span>
																</li>
															);
														})}
													</ul>
												) : (
													<p className="text-sm text-slate-500">
														No simulations scheduled yet.
													</p>
												)}
											</div>
										</CardContent>
										{upcomingTotalPages > 1 ? (
											<div className="shrink-0 rounded-b-lg border-t border-slate-200/80 bg-slate-50/60 px-4 sm:px-6">
												<PageIndex
													page={upcomingPageSafe}
													totalItems={upcomingItems.length}
													pageSize={UPCOMING_PAGE_SIZE}
													onPageChange={setUpcomingPage}
													hideWhenSinglePage
													className="mx-0 my-3 justify-between px-0"
												/>
											</div>
										) : null}
									</Card>
								</motion.div>

								<motion.div
									variants={fadeRight}
									initial="hidden"
									whileInView="visible"
									viewport={viewportOnce}
								>
									<Card className="glass-card flex max-h-[521px] flex-col">
										<div className="glass-card-cap" />
										<CardContent className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
											<div className="mb-4 shrink-0 border-b border-slate-200 pb-4">
												<p className="text-sm font-semibold sidebar-gradient-text">
													Recent activity
												</p>
												<p className="mt-1 text-xs text-slate-500">
													What changed across simulations, evidence, and gaps.
												</p>
											</div>
											{(payload?.activity?.length ?? 0) > 0 ? (
												<ul className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
													{payload?.activity?.map((item) => (
														<li
															key={item.id}
															className="rounded-lg border border-white/30 bg-white/20 p-3 shadow-sm backdrop-blur-md"
														>
															<div className="flex items-start gap-3">
																<span
																	className={cn(
																		"mt-1.5 h-2 w-2 shrink-0 rounded-full",
																		ACTIVITY_DOT_CLASS[item.tone],
																	)}
																	aria-hidden
																/>
																<div className="min-w-0 flex-1">
																	<p className="text-sm font-medium text-slate-700">
																		<BoldText text={item.text} />
																	</p>
																</div>
																<span className="shrink-0 pt-0.5 text-xs tabular-nums text-slate-500">
																	{item.timestamp}
																</span>
															</div>
														</li>
													))}
												</ul>
											) : (
												<p className="text-sm text-slate-500">
													No recent activity.
												</p>
											)}
										</CardContent>
									</Card>
								</motion.div>
							</div>
						</div>
					) : null}

					{surface === "simulations" ? (
						<motion.div
							variants={staggerFast}
							initial="hidden"
							animate="visible"
						>
							<motion.div variants={fadeUp}>
								<Card className="glass-card">
									<div className="glass-card-cap" />
									<CardContent className="p-4 sm:p-6">
										<div className="flex flex-wrap items-center justify-between gap-3 pb-3">
											<SearchField
												value={sessionQuery}
												onChange={(e) => setSessionQuery(e.target.value)}
												placeholder="Search simulations…"
												aria-label="Search simulations"
												containerClassName="w-full min-w-0 max-w-xl"
											/>
											<SessionFilterMenu
												value={sessionStatusFilter}
												onChange={setSessionStatusFilter}
											/>
										</div>
										{filteredSessions.length === 0 ? (
											<CaalmDataTableEmpty
												title="No simulations found"
												description={
													sessions.length === 0
														? "Schedule your first review."
														: "Try a different status or search term."
												}
											/>
										) : (
											<CaalmDataTable className="pt-2">
												<TableHeader className="[&_tr]:border-b-0">
													<TableRow className={DATA_TABLE_HEADER_ROW}>
														<TableHead
															className={cn(
																DATA_TABLE_HEADER_CELL,
																"w-10 pl-4 pr-2",
															)}
														>
															<Checkbox
																checked={
																	allPagedSelected
																		? true
																		: somePagedSelected
																			? "indeterminate"
																			: false
																}
																onCheckedChange={(checked) =>
																	toggleAllPagedSessions(checked === true)
																}
																aria-label="Select all simulations on this page"
																className="cursor-pointer"
															/>
														</TableHead>
														<SortableDataTableHead
															label="Simulation"
															active={sessionSort.key === "title"}
															onClick={() => toggleSessionSort("title")}
														/>
														<TableHead
															className={cn(DATA_TABLE_HEADER_CELL, "px-5")}
														>
															Framework
														</TableHead>
														<TableHead
															className={cn(DATA_TABLE_HEADER_CELL, "px-5")}
														>
															Participants
														</TableHead>
														<SortableDataTableHead
															label="Scheduled"
															active={sessionSort.key === "scheduled"}
															onClick={() => toggleSessionSort("scheduled")}
														/>
														<TableHead
															className={cn(DATA_TABLE_HEADER_CELL, "px-5")}
														>
															Prep deadline
														</TableHead>
														<SortableDataTableHead
															label="Readiness"
															active={sessionSort.key === "readiness"}
															onClick={() => toggleSessionSort("readiness")}
														/>
														<TableHead
															className={cn(DATA_TABLE_HEADER_CELL, "px-5")}
														>
															Status
														</TableHead>
														<TableHead
															className={cn(
																DATA_TABLE_HEADER_CELL,
																"w-16 pr-4",
															)}
														/>
													</TableRow>
												</TableHeader>
												<TableBody className="[&_tr:last-child>td]:border-b-0">
													{pagedSessions.map((session) => {
														const participants = parseParticipants(
															session.participantsJson,
														);
														const readiness = sessionReadinessDisplay(session);
														const isSelected = selectedSessionIds.has(
															session.$id,
														);
														return (
															<TableRow
																key={session.$id}
																className={cn(
																	DATA_TABLE_BODY_ROW_CLICKABLE,
																	"group bg-transparent",
																	isSelected && "bg-blue/10 hover:bg-blue/10",
																)}
																onClick={() =>
																	openSimulationDetail(session.$id)
																}
															>
																<TableCell
																	className="px-4 py-3 pl-4 pr-2 align-middle"
																	onClick={(e) => e.stopPropagation()}
																>
																	<Checkbox
																		checked={isSelected}
																		onCheckedChange={(checked) =>
																			toggleSessionSelect(
																				session.$id,
																				checked === true,
																			)
																		}
																		aria-label={`Select ${session.title}`}
																		className="cursor-pointer"
																	/>
																</TableCell>
																<TableCell className="px-5 py-3 align-middle">
																	<span className="font-medium text-sm text-slate-800">
																		{session.title}
																	</span>
																	<p className="text-xs text-slate-500">
																		{session.department}
																	</p>
																</TableCell>
																<TableCell className="px-5 py-3 align-middle">
																	{session.framework ? (
																		<span className="inline-flex items-center rounded-full border border-blue/20 bg-blue/10 px-2.5 py-0.5 text-xs font-medium text-[#0f5384]">
																			{session.framework}
																		</span>
																	) : (
																		<span className="text-sm text-slate-400">
																			—
																		</span>
																	)}
																</TableCell>
																<TableCell className="px-5 py-3 align-middle">
																	{participants.length > 0 ? (
																		<TooltipProvider delayDuration={200}>
																			<div className="flex items-center">
																				{participants
																					.slice(0, 3)
																					.map((p, index) => {
																						const profile =
																							upcomingAvatarByUserId.get(
																								p.userId,
																							);
																						const fullName =
																							profile?.name ||
																							p.name?.trim() ||
																							"Participant";
																						return (
																							<Tooltip
																								key={`${p.userId}-${index}`}
																							>
																								<TooltipTrigger asChild>
																									<span className="-ml-2 inline-flex rounded-full border-2 border-white first:ml-0">
																										<Avatar
																											userId={p.userId}
																											name={fullName}
																											size="xs"
																											imageUrl={
																												profile?.imageUrl
																											}
																										/>
																									</span>
																								</TooltipTrigger>
																								<TooltipContent>
																									<p>{fullName}</p>
																								</TooltipContent>
																							</Tooltip>
																						);
																					})}
																				{participants.length > 3 ? (
																					<Tooltip>
																						<TooltipTrigger asChild>
																							<span className="-ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[11px] font-medium text-slate-600">
																								+{participants.length - 3}
																							</span>
																						</TooltipTrigger>
																						<TooltipContent>
																							<div className="space-y-1">
																								{participants
																									.slice(3)
																									.map((p, index) => {
																										const profile =
																											upcomingAvatarByUserId.get(
																												p.userId,
																											);
																										return (
																											<p
																												key={`${p.userId}-${index}`}
																											>
																												{profile?.name ||
																													p.name?.trim() ||
																													"Participant"}
																											</p>
																										);
																									})}
																							</div>
																						</TooltipContent>
																					</Tooltip>
																				) : null}
																			</div>
																		</TooltipProvider>
																	) : (
																		<span className="text-sm text-slate-400">
																			—
																		</span>
																	)}
																</TableCell>
																<TableCell className="px-5 py-3 align-middle text-sm text-slate-600">
																	{formatSessionDateTime(session.scheduledAt)}
																</TableCell>
																<TableCell className="px-5 py-3 align-middle text-sm text-slate-600">
																	{formatSessionDateTime(
																		session.prepDeadlineAt,
																	)}
																</TableCell>
																<TableCell className="px-5 py-3 align-middle">
																	<div
																		className={cn(
																			"h-1.5 w-24 overflow-hidden rounded-full bg-slate-200",
																			readiness.faded && "opacity-50",
																		)}
																	>
																		<div
																			className={cn(
																				"h-full rounded-full",
																				readiness.colorClass,
																			)}
																			style={{ width: `${readiness.pct}%` }}
																		/>
																	</div>
																</TableCell>
																<TableCell className="px-5 py-3 align-middle">
																	<span
																		className={cn(
																			"w-fit shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
																			SESSION_STATUS_BADGE[session.status] ??
																				"bg-slate-100 text-slate-600 border-slate-200",
																		)}
																	>
																		{sessionStatusLabel(session.status)}
																	</span>
																</TableCell>
																<TableCell className="px-5 py-3 pr-4 align-middle text-right">
																	{canManageSessions ? (
																		<DropdownMenu>
																			<DropdownMenuTrigger
																				className="shad-no-focus inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full opacity-0 transition-all duration-200 hover:bg-white/30 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
																				aria-label={`Actions for ${session.title}`}
																				onClick={(e) => e.stopPropagation()}
																			>
																				<Image
																					src="/assets/icons/dots.svg"
																					alt="dots"
																					width={34}
																					height={34}
																					className="h-[34px] w-[34px] max-h-[34px] max-w-[34px] shrink-0"
																					unoptimized
																				/>
																			</DropdownMenuTrigger>
																			<AppDropdownMenuContent
																				align="end"
																				onClick={(e) => e.stopPropagation()}
																			>
																				{!SESSION_TERMINAL_STATUSES.includes(
																					session.status,
																				) ? (
																					<AppDropdownMenuItem
																						icon={CalendarClock}
																						onSelect={() => {
																							setSelectedId(session.$id);
																							setRescheduleOpen(true);
																						}}
																					>
																						Reschedule
																					</AppDropdownMenuItem>
																				) : null}
																				{!SESSION_TERMINAL_STATUSES.includes(
																					session.status,
																				) ? (
																					<AppDropdownMenuItem
																						icon={CheckCircle}
																						onSelect={() => {
																							setSelectedId(session.$id);
																							setCompleteOpen(true);
																						}}
																					>
																						Mark complete
																					</AppDropdownMenuItem>
																				) : null}
																				{!SESSION_TERMINAL_STATUSES.includes(
																					session.status,
																				) ? (
																					<AppDropdownMenuItem
																						icon={Ban}
																						tone="danger"
																						onSelect={() => {
																							setSelectedId(session.$id);
																							setCancelOpen(true);
																						}}
																					>
																						Cancel
																					</AppDropdownMenuItem>
																				) : null}
																			</AppDropdownMenuContent>
																		</DropdownMenu>
																	) : null}
																</TableCell>
															</TableRow>
														);
													})}
												</TableBody>
											</CaalmDataTable>
										)}
									</CardContent>
									{sessionsTotalPages > 1 ? (
										<div className="shrink-0 rounded-b-lg border-t border-slate-200/80 bg-slate-50/60 px-4 sm:px-6">
											<PageIndex
												page={sessionsPageSafe}
												totalItems={filteredSessions.length}
												pageSize={SESSIONS_PAGE_SIZE}
												onPageChange={setSessionsPage}
												hideWhenSinglePage
												className="mx-0 my-3 justify-between px-0"
											/>
										</div>
									) : null}
								</Card>
							</motion.div>
							<BulkActionDock
								count={selectedSessionIds.size}
								noun="simulation"
								onClear={() => setSelectedSessionIds(new Set())}
							>
								<button
									type="button"
									onClick={() => {
										setCancelIsBulk(true);
										setCancelOpen(true);
									}}
									className="delete-btn cursor-pointer text-sm"
								>
									<Ban className="h-4 w-4" aria-hidden />
									Cancel
								</button>
							</BulkActionDock>
						</motion.div>
					) : null}

					{surface === "interview" ? (
						<div className="space-y-4">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<button
											type="button"
											aria-label="Simulation for interview"
											className={FILTER_PILL_TRIGGER}
										>
											<span className="max-w-[200px] truncate">
												{selected?.title ?? "Choose a simulation"}
											</span>
											<ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
										</button>
									</DropdownMenuTrigger>
									<AppDropdownMenuContent align="start" className="w-64 p-1">
										<DropdownMenuLabel className="sidebar-gradient-text">
											Simulations
										</DropdownMenuLabel>
										{sessions.map((s) => (
											<DropdownMenuItem
												key={s.$id}
												onSelect={() => setSelectedId(s.$id)}
											>
												{s.title}
											</DropdownMenuItem>
										))}
									</AppDropdownMenuContent>
								</DropdownMenu>
								{canManageSessions && selected ? (
									<div className="flex flex-wrap items-center gap-2">
										<Button
											type="button"
											className="btn-primary"
											disabled={busyAction !== null}
											onClick={async () => {
												setBusyAction("generate_bank");
												try {
													const json = await postJson(
														"/api/audit-lab/interview",
														{
															action: "generate_bank",
															sessionId: selected.$id,
														},
													);
													await mutateBank();
													const count = ((
														json.data as { questions?: unknown[] } | undefined
													)?.questions?.length ?? 0) as number;
													toast({
														title: "Question bank",
														description:
															count > 0
																? `Added ${count} new question${count === 1 ? "" : "s"}.`
																: "No new template questions to add.",
													});
												} catch (err) {
													onError(err, "I couldn't generate questions.");
												} finally {
													setBusyAction(null);
												}
											}}
										>
											{busyAction === "generate_bank" ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<ClipboardList className="h-4 w-4" />
											)}
											{busyAction === "generate_bank"
												? "Generating questions…"
												: "Generate questions"}
										</Button>
										<Button
											type="button"
											className="btn-primary"
											disabled={busyAction !== null}
											title="One question per Evidence Readiness Matrix requirement, so every requirement gets asked about."
											onClick={async () => {
												setBusyAction("generate_from_matrix");
												try {
													const json = await postJson(
														"/api/audit-lab/interview",
														{
															action: "generate_bank",
															sessionId: selected.$id,
															source: "matrix",
														},
													);
													await mutateBank();
													const count = ((
														json.data as { questions?: unknown[] } | undefined
													)?.questions?.length ?? 0) as number;
													toast({
														title: "Evidence Matrix questions",
														description:
															count > 0
																? `Added ${count} question${count === 1 ? "" : "s"} from the Evidence Readiness Matrix.`
																: "No new matrix requirements to add.",
													});
												} catch (err) {
													onError(err, "I couldn't generate questions from the matrix.");
												} finally {
													setBusyAction(null);
												}
											}}
										>
											{busyAction === "generate_from_matrix" ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<ListChecks className="h-4 w-4" />
											)}
											{busyAction === "generate_from_matrix"
												? "Generating…"
												: "Generate from Evidence Matrix"}
										</Button>
										<Button
											type="button"
											className="btn-primary"
											disabled={busyAction !== null}
											onClick={async () => {
												setBusyAction("import_findings");
												try {
													const json = await postJson(
														"/api/audit-lab/interview",
														{
															action: "import_findings",
															sessionId: selected.$id,
														},
													);
													await mutateBank();
													const count = ((
														json.data as { questions?: unknown[] } | undefined
													)?.questions?.length ?? 0) as number;
													toast({
														title: "Findings",
														description:
															count > 0
																? `Imported ${count} question${count === 1 ? "" : "s"} from findings.`
																: "No new findings to import.",
													});
												} catch (err) {
													onError(err, "I couldn't import findings.");
												} finally {
													setBusyAction(null);
												}
											}}
										>
											{busyAction === "import_findings" ? (
												<Loader2
													className="h-3.5 w-3.5 animate-spin"
													aria-hidden
												/>
											) : (
												<Download className="h-3.5 w-3.5" aria-hidden />
											)}
											{busyAction === "import_findings"
												? "Importing findings…"
												: "Import findings"}
										</Button>
										<Button
											type="button"
											className="btn-primary"
											disabled={busyAction !== null}
											onClick={async () => {
												setBusyAction("script");
												try {
													await postJson("/api/audit-lab/interview", {
														action: "script",
														sessionId: selected.$id,
													});
													await mutateBank();
													toast({
														title: "Script",
														description: "Seeded a new script version.",
													});
												} catch (err) {
													onError(err, "I couldn't build the script.");
												} finally {
													setBusyAction(null);
												}
											}}
										>
											{busyAction === "script" ? (
												<Loader2
													className="h-3.5 w-3.5 animate-spin"
													aria-hidden
												/>
											) : (
												<Sprout className="h-3.5 w-3.5" aria-hidden />
											)}
											{busyAction === "script"
												? "Seeding script…"
												: "Seed script"}
										</Button>
									</div>
								) : null}
							</div>
							{selected ? (
								<InterviewScriptCanvas
									key={`${selected.$id}-${bankData?.data?.version ?? 0}-${bankData?.data?.questions?.length ?? 0}`}
									sessionId={selected.$id}
									questions={bankData?.data?.questions ?? []}
									initialItemsJson={bankData?.data?.script?.itemsJson}
									initialVersion={
										bankData?.data?.version ??
										bankData?.data?.script?.version ??
										0
									}
									canEdit={canManageSessions}
									isLoadingBank={!bankData}
									initialAiBannerDismissedSignature={
										selected.aiBannerDismissedSignature
									}
									onDismissAiBanner={() => void mutate()}
									onQuestionsChanged={() => void mutateBank()}
								/>
							) : (
								<p className="text-sm text-slate-500">
									Schedule a simulation before building an interview script.
								</p>
							)}
						</div>
					) : null}

					{surface === "evidence" ? (
						<div className="space-y-4">
							{coverageByDept.length > 0 ? (
								<CoverageChart byDepartment={coverageByDept} />
							) : null}
							<div className="flex flex-wrap items-center gap-3">
								{canManageEvidence && selected ? (
									<Button
										type="button"
										className="btn-primary px-3 sm:px-4"
										disabled={busyAction !== null}
										onClick={async () => {
											setBusyAction("generate_evidence");
											try {
												const json = await postJson("/api/audit-lab/evidence", {
													action: "generate",
													sessionId: selected.$id,
												});
												await mutate();
												const count = ((
													json.data as { created?: unknown[] } | undefined
												)?.created?.length ?? 0) as number;
												toast({
													title: "Evidence list",
													description:
														count > 0
															? `Added ${count} evidence request${count === 1 ? "" : "s"}.`
															: "Evidence list is already up to date.",
												});
											} catch (err) {
												onError(err, "I couldn't generate the evidence list.");
											} finally {
												setBusyAction(null);
											}
										}}
									>
										{busyAction === "generate_evidence" ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<ListChecks className="h-4 w-4" />
										)}
										{busyAction === "generate_evidence"
											? "Generating evidence list…"
											: "Generate evidence list"}
									</Button>
								) : null}
								<SegmentedToggle
									value={evidenceGroup}
									onChange={setEvidenceGroup}
									ariaLabel="Group evidence by"
									tabs={[
										{ value: "department", label: "Department" },
										{ value: "owner", label: "Owner" },
										{ value: "assignee", label: "Assignee" },
									]}
								/>
								<select
									className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
									value={statusFilter}
									onChange={(e) => setStatusFilter(e.target.value)}
									aria-label="Status filter"
								>
									<option value="all">All statuses</option>
									<option value="not_started">Not started</option>
									<option value="in_progress">In progress</option>
									<option value="internal_review">Internal review</option>
									<option value="submitted">Submitted</option>
									<option value="follow_up_requested">Follow-up</option>
									<option value="accepted">Accepted</option>
									<option value="rejected_resubmit">Rejected</option>
								</select>
							</div>
							{filteredEvidence.length === 0 ? (
								<CaalmDataTableEmpty
									title="No evidence requests"
									description={
										selected
											? "Generate a list from the simulation scope."
											: "Select a simulation to view its evidence matrix."
									}
								/>
							) : (
								<CaalmDataTable className="pt-2">
									<TableHeader>
										<TableRow className={DATA_TABLE_HEADER_ROW}>
											<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
												Ref / title
											</TableHead>
											<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
												{evidenceGroup === "department"
													? "Department"
													: evidenceGroup === "owner"
														? "Owner"
														: "Assignee"}
											</TableHead>
											<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
												Statement
											</TableHead>
											<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
												Document
											</TableHead>
											<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
												Due
											</TableHead>
											<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
												Status
											</TableHead>
											<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
												Test result
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredEvidence.map((item) => {
											const groupValue =
												evidenceGroup === "department"
													? item.department
													: evidenceGroup === "owner"
														? item.ownerUserId
														: item.assigneeUserId;
											const summary = item.controlRef
												? linkSummaries[item.controlRef]
												: undefined;
											const testLabel = evidenceTestResultLabel(
												item.testResult,
											);
											return (
												<TableRow
													key={item.$id}
													className={DATA_TABLE_BODY_ROW_CLICKABLE}
												>
													<TableCell className="px-3 py-3 align-middle">
														<Link
															href={`/audit-lab/evidence/${item.$id}`}
															className="font-semibold text-[#0f5384]"
														>
															{item.title}
														</Link>
														<p className="caption text-slate-500">
															{item.controlRef ?? "—"}
															{item.ownerUserId &&
															item.assigneeUserId &&
															item.ownerUserId === item.assigneeUserId
																? " · single-person"
																: ""}
														</p>
														{summary?.statementOnly ? (
															<span className="mt-1 inline-block rounded-full border border-orange/20 bg-orange/10 px-2 py-0.5 text-xs text-orange">
																Statement only
															</span>
														) : null}
													</TableCell>
													<TableCell className="px-3 py-3 align-middle text-sm text-slate-600">
														{groupValue ?? "—"}
													</TableCell>
													<TableCell className="px-3 py-3 align-middle text-sm text-slate-600">
														{summary?.hasTestimonial ? "Yes" : "—"}
													</TableCell>
													<TableCell className="px-3 py-3 align-middle text-sm text-slate-600">
														{summary?.hasDocumentary ? "Yes" : "—"}
													</TableCell>
													<TableCell className="px-3 py-3 align-middle text-sm text-slate-600">
														{item.dueAt ?? "—"}
													</TableCell>
													<TableCell className="px-3 py-3 align-middle text-sm">
														<span className="inline-block whitespace-nowrap rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
															{item.status.replaceAll("_", " ")}
														</span>
													</TableCell>
													<TableCell className="px-3 py-3 align-middle text-sm text-slate-600">
														{testLabel}
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</CaalmDataTable>
							)}
						</div>
					) : null}

					{surface === "practice" ? (
						<div className="space-y-4">
							<SegmentedToggle
								value={practiceMode}
								onChange={setPracticeMode}
								ariaLabel="Practice mode"
								className="max-w-xs"
								tabs={[
									{ value: "voice", label: "Voice interview" },
									{ value: "text", label: "Text practice" },
								]}
							/>
							{practiceMode === "voice" ? (
								<VoiceInterviewPanel
									sessions={sessions}
									canPractice={canPractice}
									canViewPracticePii={canViewPracticePii}
								/>
							) : (
								<PracticeRoundPanel
									sessions={sessions}
									canPractice={canPractice}
									canScore={canScore}
								/>
							)}
						</div>
					) : null}

					{surface === "reports" ? (
						<div className="space-y-4">
							{trendSeries.length > 0 ? (
								<TrendChart series={trendSeries} />
							) : null}
							<div className="flex flex-wrap gap-3">
								<a
									href="/api/audit-lab/reports/export"
									className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
								>
									Download CSV
								</a>
							</div>
							<ul className="space-y-1 text-sm text-slate-600">
								{(payload?.reports ?? []).map((r) => (
									<li key={r.$id}>
										{r.kind} report{" "}
										<span className="text-slate-400">{r.$id}</span>
									</li>
								))}
							</ul>
							{(payload?.reports?.length ?? 0) === 0 ? (
								<p className="text-sm text-slate-500">
									No published reports yet. Complete a simulation to generate
									one.
								</p>
							) : null}
						</div>
					) : null}
				</>
			)}

			<NewSessionDialog
				open={newOpen}
				onOpenChange={setNewOpen}
				existingSessions={sessions}
				onSubmit={async (body) => {
					const json = await postJson("/api/audit-lab/sessions", body);
					const created = json.data as ReviewSession | undefined;
					await mutate(
						(current) => {
							if (!created) return current;
							const rows = current?.data?.sessions ?? sessions;
							return {
								data: {
									...current?.data,
									sessions: [
										created,
										...rows.filter((s) => s.$id !== created.$id),
									],
								},
							};
						},
						{ revalidate: true },
					);
				}}
			/>

			<ConfirmDialog
				open={cancelOpen}
				onOpenChange={(next) => {
					setCancelOpen(next);
					if (!next) setCancelIsBulk(false);
				}}
				icon={<Calendar className="h-5 w-5" />}
				title={
					cancelIsBulk
						? `Cancel ${selectedSessionIds.size} simulation${selectedSessionIds.size === 1 ? "" : "s"}?`
						: "Cancel this simulation?"
				}
				description="Invitees will keep the record, but the simulation will no longer run."
				confirmLabel={cancelIsBulk ? "Cancel simulations" : "Cancel simulation"}
				onConfirm={async () => {
					try {
						if (cancelIsBulk) {
							const ids = [...selectedSessionIds];
							await Promise.all(
								ids.map((id) => patchSession(id, { action: "cancel" })),
							);
							setSelectedSessionIds(new Set());
						} else {
							if (!selectedId) return;
							await patchSession(selectedId, { action: "cancel" });
						}
						await mutate();
					} catch (err) {
						onError(
							err,
							cancelIsBulk
								? "I couldn't cancel those simulations."
								: "I couldn't cancel that simulation.",
						);
					}
				}}
			/>

			<RescheduleSessionDialog
				open={rescheduleOpen}
				onOpenChange={setRescheduleOpen}
				sessionTitle={selected?.title ?? ""}
				currentScheduledAt={selected?.scheduledAt}
				onSubmit={async (scheduledAt) => {
					if (!selectedId) return;
					try {
						await patchSession(selectedId, {
							action: "reschedule",
							scheduledAt,
						});
						await mutate();
					} catch (err) {
						onError(err, "I couldn't reschedule that simulation.");
					}
				}}
			/>

			<ConfirmDialog
				open={completeOpen}
				onOpenChange={setCompleteOpen}
				icon={<CheckCircle className="h-5 w-5" />}
				title="Mark this simulation complete?"
				description={(() => {
					if (!selected) return "";
					const gate = sessionReadinessGate(selected, evidence, gaps);
					return gate.isReady
						? "This builds the session report and notifies participants."
						: `${gate.openEvidence} evidence item${gate.openEvidence === 1 ? "" : "s"} still open and ${gate.openGaps} gap${gate.openGaps === 1 ? "" : "s"} unresolved. You can still complete — this builds the report and notifies participants.`;
				})()}
				confirmLabel="Mark complete"
				onConfirm={async () => {
					if (!selectedId) return;
					try {
						await patchSession(selectedId, { action: "complete" });
						await mutate();
					} catch (err) {
						onError(err, "I couldn't mark that simulation complete.");
					}
				}}
			/>

			<SimulationDetailSheet
				session={detailSession}
				open={detailOpen}
				onOpenChange={setDetailOpen}
				profilesByUserId={sheetProfilesByUserId}
				canManage={canManageSessions}
				onReschedule={() => {
					if (!detailSession) return;
					setSelectedId(detailSession.$id);
					setDetailOpen(false);
					setRescheduleOpen(true);
				}}
			/>
		</AuditLabShell>
	);
}
