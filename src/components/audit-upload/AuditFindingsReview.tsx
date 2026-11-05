"use client";

import {
	AlertTriangle,
	ArrowLeft,
	Check,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Download,
	Eye,
	Loader2,
	type LucideIcon,
	MessageSquareX,
	RotateCcw,
	Scale,
	ShieldAlert,
	Trash2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
	type Dispatch,
	Fragment,
	type ReactNode,
	type SetStateAction,
	useEffect,
	useState,
} from "react";
import {
	clearCapVerificationDraft,
	getCapVerificationDraft,
} from "@/lib/assistant/cap-verification-draft";
import {
	OPEN_CLOSE_CAP_EVENT,
	type OpenCloseCapPayload,
} from "@/lib/assistant/open-close-cap-client";
import useSWR, { mutate } from "swr";
import { AuditFindingCard } from "@/components/audit-upload/AuditFindingCard";
import { CloseCorrectiveActionDialog } from "@/components/audit-upload/CloseCorrectiveActionDialog";
import { FormattedDate } from "@/components/FormattedDateTime";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import {
	CaalmDataTable,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/components/ui/caalm-data-table";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	DropdownMenu,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageIndex } from "@/components/ui/page-index";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import {
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { useUsersByIds } from "@/hooks/useUsersByIds";
import type {
	AuditCapEvidenceAttachment,
	AuditCapRecord,
	AuditCapTask,
	AuditDocumentRecord,
	AuditFeedbackRecord,
	AuditFindingRecord,
} from "@/lib/audit-upload/types";
import { fetcher } from "@/lib/swr-config";
import { caalmToast } from "@/lib/ui/caalm-toast";
import { DIALOG_BACK_LINK_CLASS } from "@/lib/ui/modal-styles";
import { cn } from "@/lib/utils";

type AuditReportSignalType =
	| "contradicts_evidence"
	| "severity_mismatch"
	| "quarantined"
	| "disputed"
	| "blind_spots"
	| "repeat"
	| "predicted";

type AuditReportSignal = {
	type: AuditReportSignalType;
	count: number;
	findingIds: string[];
	detail: Record<string, unknown>[];
};

type AuditReportReconVerdict =
	| "predicted"
	| "blind_spot_untracked"
	| "blind_spot_stale"
	| "contradicts";

type AuditReportReconRow = {
	findingId: string;
	readinessItemId: string | null;
	readinessItemLabel: string | null;
	readinessStatus: "ready" | "gap" | "in_progress" | "unknown" | null;
	lastAssessed: string | null;
	evidenceNote: string | null;
	verdict: AuditReportReconVerdict;
};

/** Shape of AuditFeedbackRecord["report"] as built by generateFeedbackReport(). */
type AuditFeedbackReport = {
	findingCount: number;
	quarantinedCount: number;
	repeatCount: number;
	disputedCount: number;
	auditorErrorCount: number;
	readinessBlindSpots: number;
	readinessPredictedCount: number;
	severityCounts: Record<string, number>;
	capCount: number;
	openCapCount: number;
	recurringThemes: string[];
	notes: string[];
	signals: AuditReportSignal[];
	readinessReconciliation: AuditReportReconRow[];
	questionedCosts: { total: number; findingIds: string[] } | null;
	classificationCounts: Record<string, number>;
	majorProgramCount: number;
	programCount: number;
};

type Payload = {
	document: AuditDocumentRecord;
	findings: AuditFindingRecord[];
	caps: AuditCapRecord[];
	feedback: AuditFeedbackRecord | null;
};

const FINDINGS_PAGE_SIZE = 12;

type ReasonDialog = {
	kind: "dispute" | "accept_risk";
	id: string;
} | null;

type FilterKey =
	| "high"
	| "untracked_gap"
	| "severity_mismatch"
	| "stale_readiness";

function matchesFilter(finding: AuditFindingRecord, key: FilterKey): boolean {
	if (key === "high") {
		return (
			finding.severityComputed === "high" ||
			finding.severityComputed === "critical"
		);
	}
	return finding.reconciliation?.verdict === key;
}

const FRAMEWORK_LABELS: Record<string, string> = {
	SOC2: "SOC 2",
	TSC: "Trust Services Criteria",
	UNIFORM_GUIDANCE: "Uniform Guidance",
};

function frameworkLabel(code: string): string {
	return FRAMEWORK_LABELS[code] ?? code.replaceAll("_", " ");
}

function extractionStatusLabel(status: string): string {
	if (status === "complete") return "Complete";
	if (status === "failed") return "Failed";
	return "Processing";
}

/** Heuristic classification only ever distinguishes qualified vs. not — no adverse/disclaimer signal exists yet. */
function opinionChip(
	raw: unknown,
): { label: string; className: string } | null {
	if (typeof raw !== "string" || !raw.trim()) return null;
	if (raw === "qualified") {
		return {
			label: "Qualified opinion",
			className: "border-orange/20 bg-orange/10 text-orange",
		};
	}
	return {
		label: "Unmodified opinion",
		className: "border-green/20 bg-green/10 text-green",
	};
}

/** Sentence listing only the non-zero reconciliation conditions, e.g. "2 untracked gaps and 1 severity mismatch." */
function reconciliationSupportingLine(counts: {
	untrackedGap: number;
	severityMismatch: number;
	staleReadiness: number;
}): string | null {
	const parts: string[] = [];
	if (counts.untrackedGap > 0) {
		parts.push(
			`${counts.untrackedGap} untracked gap${counts.untrackedGap === 1 ? "" : "s"}`,
		);
	}
	if (counts.severityMismatch > 0) {
		parts.push(
			`${counts.severityMismatch} severity mismatch${counts.severityMismatch === 1 ? "" : "es"}`,
		);
	}
	if (counts.staleReadiness > 0) {
		parts.push(
			`${counts.staleReadiness} stale readiness item${counts.staleReadiness === 1 ? "" : "s"}`,
		);
	}
	if (parts.length === 0) return null;
	if (parts.length === 1) return `${parts[0]}.`;
	if (parts.length === 2) return `${parts[0]} and ${parts[1]}.`;
	return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}.`;
}

/** Decorative ring; the same N/M is always exposed as text via aria-label for screen readers. */
const META_LABEL =
	"text-[10px] font-semibold uppercase tracking-wide text-slate-500";

/** Toggle filter chip — multi-select, never shown with a zero count. */
function FilterChip({
	active,
	onClick,
	dotClassName,
	children,
}: {
	active: boolean;
	onClick: () => void;
	dotClassName: string;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			aria-pressed={active}
			onClick={onClick}
			className={cn(
				"inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
				active
					? "border-[#0f5384] bg-[#0f5384]/10 text-[#0f5384]"
					: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
			)}
		>
			<span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClassName)} />
			{children}
		</button>
	);
}

const SIGNAL_ORDER: AuditReportSignalType[] = [
	"contradicts_evidence",
	"severity_mismatch",
	"quarantined",
	"disputed",
	"blind_spots",
	"repeat",
	"predicted",
];

const SIGNAL_META: Record<
	AuditReportSignalType,
	{ icon: LucideIcon; toneClass: string; title: (count: number) => string }
> = {
	contradicts_evidence: {
		icon: ShieldAlert,
		toneClass: "bg-red/10 text-red",
		title: (n) =>
			`${n} finding${n === 1 ? "" : "s"} contradict${n === 1 ? "s" : ""} evidence already on file`,
	},
	severity_mismatch: {
		icon: Scale,
		toneClass: "bg-orange/10 text-orange",
		title: (n) =>
			`${n} severity disagree${n === 1 ? "s" : ""} with the auditor's own classification`,
	},
	quarantined: {
		icon: AlertTriangle,
		toneClass: "bg-red/10 text-red",
		title: (n) =>
			`${n} finding${n === 1 ? "" : "s"} could not be matched to a source quote`,
	},
	disputed: {
		icon: MessageSquareX,
		toneClass: "bg-orange/10 text-orange",
		title: (n) => `${n} finding${n === 1 ? "" : "s"} disputed by your team`,
	},
	blind_spots: {
		icon: Eye,
		toneClass: "bg-[#e1f3ff] text-[#0f5384]",
		title: (n) =>
			`${n} finding${n === 1 ? "" : "s"} your readiness tracking didn't catch`,
	},
	repeat: {
		icon: RotateCcw,
		toneClass: "bg-purple-50 text-purple-600",
		title: (n) => `${n} repeat${n === 1 ? "" : "s"} of a prior-year finding`,
	},
	predicted: {
		icon: CheckCircle2,
		toneClass: "bg-green/10 text-green",
		title: (n) =>
			`${n} finding${n === 1 ? "" : "s"} your readiness tracking predicted`,
	},
};

/** Splits on **bold** markers (server-generated) and wraps matches in <strong>. */
function renderBold(text: string): ReactNode {
	const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
	return parts.map((part, index) =>
		part.startsWith("**") && part.endsWith("**") ? (
			<strong key={index} className="font-semibold text-slate-700">
				{part.slice(2, -2)}
			</strong>
		) : (
			<Fragment key={index}>{part}</Fragment>
		),
	);
}

/** One specific sentence per member — named evidence, not a restated count. */
function signalDetailLines(
	signal: AuditReportSignal,
	findingsById: Map<string, AuditFindingRecord>,
): string[] {
	const code = (id: unknown) =>
		findingsById.get(String(id))?.findingCode ?? "—";
	switch (signal.type) {
		case "contradicts_evidence":
			return signal.detail.flatMap((d) => {
				const label = d.readinessItemLabel
					? `**${String(d.readinessItemLabel)}**`
					: "the matched readiness item";
				const dated = d.evidenceDate
					? ` with evidence dated **${String(d.evidenceDate)}**`
					: "";
				const lines = [
					`Finding **${code(d.findingId)}**: readiness item ${label} is marked ready${dated}, but the auditor's condition says otherwise.`,
				];
				if (d.managementResponseExcerpt) {
					lines.push(
						`Management responded: "${String(d.managementResponseExcerpt)}" Review before confirming.`,
					);
				} else {
					lines[0] += " Review before confirming.";
				}
				return lines;
			});
		case "quarantined":
			return signal.detail.map(
				(d) =>
					`Finding **${code(d.findingId)}**: the extracted quote didn't match the source document — read the condition manually before confirming.`,
			);
		case "disputed":
			return signal.detail.map((d) =>
				d.disputeReason
					? `Finding **${code(d.findingId)}** disputed: "${String(d.disputeReason)}"`
					: `Finding **${code(d.findingId)}** disputed, with no reason recorded.`,
			);
		case "blind_spots":
			return signal.detail.map((d) => {
				if (d.reason === "untracked") {
					return `Finding **${code(d.findingId)}**: no readiness item covers this topic — create one so the next audit cycle catches it.`;
				}
				const label = d.readinessItemLabel
					? `**${String(d.readinessItemLabel)}**`
					: "the matched readiness item";
				const dated = d.evidenceDate
					? ` (last evidence **${String(d.evidenceDate)}**)`
					: "";
				return `Finding **${code(d.findingId)}**: readiness item ${label} is marked ready but the evidence is stale${dated}.`;
			});
		case "repeat":
			return signal.detail.map((d) => {
				const priorCode = d.priorFindingId
					? findingsById.get(String(d.priorFindingId))?.findingCode
					: null;
				const priorBit = priorCode ? ` **${priorCode}**` : "";
				return `Finding **${code(d.findingId)}** repeats${priorBit} — repeats carry escalated scrutiny.`;
			});
		case "predicted":
			return signal.detail.map((d) => {
				const label = d.readinessItemLabel
					? `**${String(d.readinessItemLabel)}**`
					: "the matched readiness item";
				return `Finding **${code(d.findingId)}** matches readiness item ${label} — link its corrective action there instead of creating a new one.`;
			});
		default:
			return [];
	}
}

/** Monospace finding-code chip; repeats render as a pair with a backward arrow. */
function SignalReferenceChips({
	signal,
	findingsById,
}: {
	signal: AuditReportSignal;
	findingsById: Map<string, AuditFindingRecord>;
}) {
	if (signal.type === "repeat") {
		return (
			<div className="mt-1.5 flex flex-wrap gap-1.5">
				{signal.detail.map((d) => {
					const current = findingsById.get(String(d.findingId));
					const prior = d.priorFindingId
						? findingsById.get(String(d.priorFindingId))
						: null;
					return (
						<span
							key={String(d.findingId)}
							className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-600"
						>
							{current?.findingCode ?? "—"}
							{prior ? (
								<>
									<ArrowLeft className="h-3 w-3 text-slate-400" aria-hidden />
									{prior.findingCode}
								</>
							) : null}
						</span>
					);
				})}
			</div>
		);
	}
	return (
		<div className="mt-1.5 flex flex-wrap gap-1.5">
			{signal.findingIds.map((id) => {
				const finding = findingsById.get(id);
				return (
					<span
						key={id}
						className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-600"
					>
						{finding?.findingCode ?? "—"}
					</span>
				);
			})}
		</div>
	);
}

const SEVERITY_DISPLAY: Record<string, { label: string; accentClass: string }> =
	{
		critical: { label: "Critical", accentClass: "border-l-red" },
		high: { label: "High", accentClass: "border-l-orange" },
		medium: { label: "Medium", accentClass: "border-l-orange" },
		low: { label: "Low", accentClass: "border-l-green" },
		informational: {
			label: "Informational",
			accentClass: "border-l-slate-300",
		},
	};
const SEVERITY_ORDER = ["critical", "high", "medium", "low", "informational"];
const SEVERITY_BAR_CLASS: Record<string, string> = {
	critical: "bg-red",
	high: "bg-red",
	medium: "bg-orange",
	low: "bg-green",
	informational: "bg-slate-300",
};

/** Small stat card — value + micro-label, optional left accent for severity tiles. */
function StatTile({
	label,
	value,
	accentClass,
}: {
	label: string;
	value: number;
	accentClass?: string;
}) {
	return (
		<div
			className={cn(
				"rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2.5",
				accentClass ? cn("border-l-4", accentClass) : null,
			)}
		>
			<p className="text-xl font-bold tabular-nums text-slate-700">{value}</p>
			<p className={META_LABEL}>{label}</p>
		</div>
	);
}

const RECON_VERDICT_DISPLAY: Record<
	AuditReportReconVerdict,
	{ label: string; className: string }
> = {
	predicted: {
		label: "Predicted",
		className: "border-green/20 bg-green/10 text-green",
	},
	blind_spot_untracked: {
		label: "Blind spot — untracked",
		className: "border-[#a0c4db] bg-[#e1f3ff] text-[#0f5384]",
	},
	blind_spot_stale: {
		label: "Blind spot — stale",
		className: "border-[#a0c4db] bg-[#e1f3ff] text-[#0f5384]",
	},
	contradicts: {
		label: "Contradicts finding",
		className: "border-red/20 bg-red/10 text-red",
	},
};

const READINESS_STATUS_DISPLAY: Record<
	string,
	{ label: string; className: string }
> = {
	ready: {
		label: "Ready",
		className: "border-green/20 bg-green/10 text-green",
	},
	gap: { label: "Gap", className: "border-orange/20 bg-orange/10 text-orange" },
	in_progress: {
		label: "In progress",
		className: "border-orange/20 bg-orange/10 text-orange",
	},
	unknown: {
		label: "None",
		className: "border-slate-200 bg-slate-100 text-slate-600",
	},
};

function AuditProgressRing({
	confirmed,
	total,
	indeterminate = false,
}: {
	confirmed: number;
	total: number;
	indeterminate?: boolean;
}) {
	const radius = 24;
	const circumference = 2 * Math.PI * radius;
	const pct = total > 0 ? Math.min(1, confirmed / total) : 0;
	return (
		<div
			role="img"
			className="relative flex h-16 w-16 shrink-0 items-center justify-center"
			aria-label={
				indeterminate
					? "Reading findings"
					: `${confirmed} of ${total} findings confirmed`
			}
		>
			<svg viewBox="0 0 56 56" className="h-16 w-16 -rotate-90" aria-hidden>
				<circle
					cx="28"
					cy="28"
					r={radius}
					fill="none"
					stroke="currentColor"
					className="text-slate-200"
					strokeWidth="5"
				/>
				{!indeterminate ? (
					<circle
						cx="28"
						cy="28"
						r={radius}
						fill="none"
						stroke="currentColor"
						className="text-[#0f5384]"
						strokeWidth="5"
						strokeLinecap="round"
						strokeDasharray={circumference}
						strokeDashoffset={circumference * (1 - pct)}
					/>
				) : (
					<circle
						cx="28"
						cy="28"
						r={radius}
						fill="none"
						stroke="currentColor"
						className="origin-center animate-spin text-[#0f5384]"
						strokeWidth="5"
						strokeLinecap="round"
						strokeDasharray={`${circumference * 0.25} ${circumference}`}
					/>
				)}
			</svg>
			<div className="absolute flex flex-col items-center" aria-hidden>
				<span className="text-xs font-bold text-slate-700">
					{indeterminate ? "…" : `${confirmed}/${total}`}
				</span>
				<span className="text-[8px] font-semibold uppercase tracking-wide text-slate-500">
					Done
				</span>
			</div>
		</div>
	);
}

async function patchFinding(id: string, action: string, reason?: string) {
	const response = await fetch(`/api/audit/findings/${id}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ action, reason }),
	});
	const json = await response.json();
	if (!response.ok) throw new Error(json.error || "Update failed");
	return json;
}

async function patchCap(
	id: string,
	body: {
		status?: string;
		verificationEvidence?: string;
		tasks?: AuditCapTask[];
	},
) {
	const response = await fetch(`/api/audit/caps/${id}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const json = await response.json();
	if (!response.ok) throw new Error(json.error || "Update failed");
	return json;
}

async function createCapForFinding(findingId: string) {
	const response = await fetch("/api/audit/caps", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ findingId }),
	});
	const json = await response.json();
	if (!response.ok) throw new Error(json.error || "Could not create CAP");
	return json;
}

async function regenerateReport(documentId: string) {
	const response = await fetch(`/api/audit/documents/${documentId}/report`, {
		method: "POST",
	});
	const json = await response.json();
	if (!response.ok)
		throw new Error(json.error || "Could not regenerate report");
	return json;
}

export function AuditFindingsReview({ documentId }: { documentId: string }) {
	const router = useRouter();
	const { permissions } = usePermissions();
	const canManageFindings = permissions.includes(
		PERMISSIONS.AUDIT.MANAGE_FINDINGS,
	);
	const canManageCaps = permissions.includes(PERMISSIONS.AUDIT.MANAGE_CAPS);
	const canDelete = permissions.includes(PERMISSIONS.AUDIT.DELETE);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [reasonDialog, setReasonDialog] = useState<ReasonDialog>(null);
	const [closeCapId, setCloseCapId] = useState<string | null>(null);
	const [closeCapPrefill, setCloseCapPrefill] = useState("");
	const [reason, setReason] = useState("");
	const [activeTab, setActiveTab] = useState<"findings" | "report">("findings");
	const [findingsPage, setFindingsPage] = useState(1);
	const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());
	const [headerDetailsOpen, setHeaderDetailsOpen] = useState(false);
	/** Set by clicking a Report signal/reconciliation row — filters Findings to just those ids. */
	const [idFilter, setIdFilter] = useState<string[] | null>(null);
	/** Client-side only — per spec, neither rating is assumed correct until a reviewer picks one. */
	const [severityChoices, setSeverityChoices] = useState<
		Record<string, "auditor" | "caalm">
	>({});
	const toggleFilter = (key: FilterKey) => {
		setActiveFilters((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
		setFindingsPage(1);
	};
	const clearFilters = () => {
		setActiveFilters(new Set());
		setIdFilter(null);
		setFindingsPage(1);
	};
	const viewFindingsFor = (findingIds: string[]) => {
		setIdFilter(findingIds);
		setActiveFilters(new Set());
		setFindingsPage(1);
		setActiveTab("findings");
	};
	const [openFindingIds, setOpenFindingIds] = useState<Set<string>>(new Set());
	/** Passage is shown by default when the drawer is open; ids here hide it. */
	const [hiddenPassageIds, setHiddenPassageIds] = useState<Set<string>>(
		new Set(),
	);

	const toggleInSet = (
		setter: Dispatch<SetStateAction<Set<string>>>,
		id: string,
	) => {
		setter((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const { data, isLoading } = useSWR<{ data?: Payload }>(
		`/api/audit/documents/${documentId}`,
		fetcher,
		{ refreshInterval: 4000 },
	);
	const payload = data?.data;
	const document = payload?.document;
	const findings = payload?.findings ?? [];
	const filteredFindings = findings
		.filter(
			(finding) =>
				activeFilters.size === 0 ||
				[...activeFilters].some((key) => matchesFilter(finding, key)),
		)
		.filter((finding) => !idFilter || idFilter.includes(finding.$id));
	const pagedFindings = filteredFindings.slice(
		(findingsPage - 1) * FINDINGS_PAGE_SIZE,
		findingsPage * FINDINGS_PAGE_SIZE,
	);
	const caps = payload?.caps ?? [];

	useEffect(() => {
		const onOpenCloseCap = (event: Event) => {
			const detail = (event as CustomEvent<OpenCloseCapPayload>).detail;
			if (!detail?.capId) return;
			const cap = caps.find((row) => row.$id === detail.capId);
			if (!cap) return;
			setCloseCapPrefill(detail.verificationNote?.trim() ?? "");
			setCloseCapId(detail.capId);
			setOpenFindingIds((prev) => {
				const next = new Set(prev);
				next.add(detail.findingId);
				return next;
			});
		};
		window.addEventListener(OPEN_CLOSE_CAP_EVENT, onOpenCloseCap);
		return () => window.removeEventListener(OPEN_CLOSE_CAP_EVENT, onOpenCloseCap);
	}, [caps]);

	/** Older records predate signals/reconciliation/etc. — fall back to empty rather than throwing. */
	const rawFeedbackReport = payload?.feedback?.report as
		| Partial<AuditFeedbackReport>
		| undefined;
	const feedbackReport: AuditFeedbackReport | null = rawFeedbackReport
		? {
				findingCount: rawFeedbackReport.findingCount ?? 0,
				quarantinedCount: rawFeedbackReport.quarantinedCount ?? 0,
				repeatCount: rawFeedbackReport.repeatCount ?? 0,
				disputedCount: rawFeedbackReport.disputedCount ?? 0,
				auditorErrorCount: rawFeedbackReport.auditorErrorCount ?? 0,
				readinessBlindSpots: rawFeedbackReport.readinessBlindSpots ?? 0,
				readinessPredictedCount: rawFeedbackReport.readinessPredictedCount ?? 0,
				severityCounts: rawFeedbackReport.severityCounts ?? {},
				capCount: rawFeedbackReport.capCount ?? 0,
				openCapCount: rawFeedbackReport.openCapCount ?? 0,
				recurringThemes: rawFeedbackReport.recurringThemes ?? [],
				notes: rawFeedbackReport.notes ?? [],
				signals: rawFeedbackReport.signals ?? [],
				readinessReconciliation:
					rawFeedbackReport.readinessReconciliation ?? [],
				questionedCosts: rawFeedbackReport.questionedCosts ?? null,
				classificationCounts: rawFeedbackReport.classificationCounts ?? {},
				majorProgramCount: rawFeedbackReport.majorProgramCount ?? 0,
				programCount: rawFeedbackReport.programCount ?? 0,
			}
		: null;
	const findingsById = new Map(findings.map((f) => [f.$id, f]));
	const severityTotal = feedbackReport
		? Object.values(feedbackReport.severityCounts).reduce((a, b) => a + b, 0)
		: 0;
	const classificationEntries = feedbackReport
		? (
				[
					"material_weakness",
					"significant_deficiency",
					"control_deficiency",
				] as const
			)
				.map((key) => ({
					key,
					label: key.replaceAll("_", " "),
					count: feedbackReport.classificationCounts[key] ?? 0,
				}))
				.filter((entry) => entry.count > 0)
		: [];
	const capOwnerIds = caps
		.map((cap) => cap.assigneeId)
		.filter((id): id is string => Boolean(id));
	const capOwnerUsers = useUsersByIds(capOwnerIds);
	const classification = (document?.metadata?.classification ?? {}) as Record<
		string,
		unknown
	>;
	const frameworks = Array.isArray(classification.frameworks)
		? (classification.frameworks as string[])
		: [];
	const sefa = document?.metadata?.sefa as
		| {
				programs?: Array<{
					name: string;
					agency?: string | null;
					assistanceListing: string;
					amountUsd: number;
				}>;
				totalUsd?: number | null;
		  }
		| null
		| undefined;

	const findingsTotal = findings.length;
	const findingsReviewed = findings.filter((f) => f.status !== "draft").length;
	const unreviewed = findingsTotal - findingsReviewed;
	const severityHighCount = findings.filter((f) =>
		matchesFilter(f, "high"),
	).length;
	const untrackedGapCount = findings.filter((f) =>
		matchesFilter(f, "untracked_gap"),
	).length;
	const severityMismatchCount = findings.filter((f) =>
		matchesFilter(f, "severity_mismatch"),
	).length;
	const staleReadinessCount = findings.filter((f) =>
		matchesFilter(f, "stale_readiness"),
	).length;
	const isProcessing =
		document?.status !== "complete" && document?.status !== "failed";
	const isFailed = document?.status === "failed";
	const supportingLine = reconciliationSupportingLine({
		untrackedGap: untrackedGapCount,
		severityMismatch: severityMismatchCount,
		staleReadiness: staleReadinessCount,
	});
	const workHeadline = isProcessing
		? "Reading findings from the report…"
		: isFailed
			? "Findings could not be read from this report"
			: findingsTotal === 0
				? "No findings were read from this report"
				: unreviewed > 0
					? `${unreviewed} finding${unreviewed === 1 ? "" : "s"} still need your review`
					: untrackedGapCount + severityMismatchCount + staleReadinessCount > 0
						? `All findings reviewed — ${untrackedGapCount + severityMismatchCount + staleReadinessCount} reconciliation issue${untrackedGapCount + severityMismatchCount + staleReadinessCount === 1 ? "" : "s"} remain`
						: "All findings reviewed and reconciled";
	const opinion = opinionChip(classification.opinion);
	/** No separate qualifier is extracted — derive the "except for" range from the finding codes we do have. */
	const qualifierLine =
		opinion?.label === "Qualified opinion" && findings.length > 0
			? `Except for ${
					findings.length === 1
						? `Finding ${findings[0].findingCode}`
						: `Findings ${findings[0].findingCode} – ${findings[findings.length - 1].findingCode}`
				}.`
			: null;
	const fileExt = document?.fileName.includes(".")
		? document.fileName.split(".").pop()?.toUpperCase()
		: null;

	const run = async (id: string, work: () => Promise<unknown>) => {
		setBusyId(id);
		try {
			await work();
			await mutate(`/api/audit/documents/${documentId}`);
		} catch (error) {
			caalmToast.base({
				tone: "error",
				title: "Could not save",
				message: error instanceof Error ? error.message : "Try again.",
			});
		} finally {
			setBusyId(null);
		}
	};

	const applyCapAttachments = (
		capId: string,
		attachments: AuditCapEvidenceAttachment[],
	) => {
		void mutate(
			`/api/audit/documents/${documentId}`,
			(current: { data?: Payload } | undefined) => {
				if (!current?.data) return current;
				return {
					...current,
					data: {
						...current.data,
						caps: current.data.caps.map((cap) =>
							cap.$id === capId
								? { ...cap, evidenceAttachments: attachments }
								: cap,
						),
					},
				};
			},
			{ revalidate: false },
		);
	};

	const closingCap = closeCapId
		? (caps.find((cap) => cap.$id === closeCapId) ?? null)
		: null;
	const closingFinding = closingCap
		? (findings.find((finding) => finding.$id === closingCap.findingId) ?? null)
		: null;

	if (isLoading) {
		return (
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
				<h1 className="h1 mb-1 sidebar-gradient-text">Uploaded audit</h1>
				<div className="flex items-center gap-2 text-sm text-slate-500">
					<Loader2 className="h-4 w-4 animate-spin text-[#078fab]" />
					Reading this report…
				</div>
			</div>
		);
	}
	if (!document) {
		return (
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
				<h1 className="h1 mb-1 sidebar-gradient-text">Uploaded audit</h1>
				<p className="mb-3 text-sm text-slate-600">This audit was not found.</p>
				<button
					type="button"
					onClick={() => router.push("/audits/uploads")}
					className={DIALOG_BACK_LINK_CLASS}
				>
					<ChevronLeft className="h-[15px] w-[15px]" aria-hidden />
					Back to uploads
				</button>
			</div>
		);
	}

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			{/* Zone 1 — title row */}
			<div className="flex flex-col gap-3 pb-3 pt-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0 flex-1">
					<div className="flex min-w-0 items-center gap-2">
						<h1 className="h1 truncate sidebar-gradient-text">
							{document.fileName}
						</h1>
						{fileExt ? (
							<span className="shrink-0 rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
								{fileExt}
							</span>
						) : null}
					</div>
					<div className="mt-1 flex flex-wrap items-center gap-2">
						{opinion ? (
							<span
								className={cn(
									"inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
									opinion.className,
								)}
							>
								{opinion.label}
							</span>
						) : null}
						{classification.auditorName || classification.period ? (
							<p className="text-xs text-slate-500">
								{[classification.auditorName, classification.period]
									.filter(
										(part): part is string =>
											typeof part === "string" && part.length > 0,
									)
									.join(" · ")}
							</p>
						) : null}
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<DropdownMenu>
						<DropdownMenuTrigger
							className="shad-no-focus rounded-full transition-colors hover:bg-black/5"
							aria-label="More actions"
						>
							<Image
								src="/assets/icons/dots.svg"
								alt="actions"
								width={34}
								height={34}
							/>
						</DropdownMenuTrigger>
						<AppDropdownMenuContent align="end">
							{canDelete ? (
								<>
									<DropdownMenuSeparator />
									<AppDropdownMenuItem
										icon={Trash2}
										tone="danger"
										onSelect={() => setDeleteOpen(true)}
									>
										Delete
									</AppDropdownMenuItem>
								</>
							) : null}
						</AppDropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{/* Zones 2–4 — merged into one rounded card */}
			<div className="overflow-hidden rounded-lg border border-slate-200/70 bg-white/60">
				{/* Zone 2 — work summary */}
				<div
					aria-live="polite"
					className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6"
				>
					<AuditProgressRing
						confirmed={findingsReviewed}
						total={findingsTotal}
						indeterminate={isProcessing}
					/>
					<div className="min-w-0 flex-1">
						<p className="text-sm font-semibold text-slate-700">
							{workHeadline}
						</p>
						{supportingLine ? (
							<p className="mt-0.5 text-xs text-slate-500">{supportingLine}</p>
						) : null}
						{!isProcessing ? (
							<div
								role="group"
								aria-label="Filter findings"
								className="mt-2 flex flex-wrap items-center gap-1.5"
							>
								{severityHighCount > 0 ? (
									<FilterChip
										active={activeFilters.has("high")}
										onClick={() => toggleFilter("high")}
										dotClassName="bg-red"
									>
										{severityHighCount} high severity
									</FilterChip>
								) : null}
								{untrackedGapCount > 0 ? (
									<FilterChip
										active={activeFilters.has("untracked_gap")}
										onClick={() => toggleFilter("untracked_gap")}
										dotClassName="bg-orange"
									>
										{untrackedGapCount} untracked gap
										{untrackedGapCount === 1 ? "" : "s"}
									</FilterChip>
								) : null}
								{severityMismatchCount > 0 ? (
									<FilterChip
										active={activeFilters.has("severity_mismatch")}
										onClick={() => toggleFilter("severity_mismatch")}
										dotClassName="bg-orange"
									>
										{severityMismatchCount} severity mismatch
										{severityMismatchCount === 1 ? "" : "es"}
									</FilterChip>
								) : null}
								{staleReadinessCount > 0 ? (
									<FilterChip
										active={activeFilters.has("stale_readiness")}
										onClick={() => toggleFilter("stale_readiness")}
										dotClassName="bg-slate-400"
									>
										{staleReadinessCount} stale readiness
									</FilterChip>
								) : null}
								{activeFilters.size > 0 || idFilter ? (
									<button
										type="button"
										className="cursor-pointer px-1.5 py-1 text-xs font-semibold text-[#0f5384] hover:underline"
										onClick={clearFilters}
									>
										Clear
									</button>
								) : null}
							</div>
						) : null}
					</div>
				</div>

				{/* Zone 4 — details disclosure */}
				<div className="border-t border-slate-200/70 px-4 py-2 sm:px-6">
					<button
						type="button"
						aria-expanded={headerDetailsOpen}
						aria-controls="audit-details-panel"
						onClick={() => setHeaderDetailsOpen((open) => !open)}
						className="flex cursor-pointer items-center gap-1.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
					>
						<ChevronRight
							className={cn(
								"h-3.5 w-3.5 transition-transform",
								headerDetailsOpen && "rotate-90",
							)}
							aria-hidden
						/>
						Audit details, framework
						{sefa?.programs?.length ? " and schedule of federal awards" : ""}
					</button>
					<div
						id="audit-details-panel"
						hidden={!headerDetailsOpen}
						className="space-y-4 pb-2 pt-1"
					>
						<dl className="flex flex-wrap gap-x-6 gap-y-2">
							{opinion ? (
								<div>
									<dt className={META_LABEL}>Opinion</dt>
									<dd className="text-xs text-slate-700">{opinion.label}</dd>
								</div>
							) : null}
							{classification.period ? (
								<div>
									<dt className={META_LABEL}>Fiscal year</dt>
									<dd className="text-xs text-slate-700">
										{String(classification.period)}
									</dd>
								</div>
							) : null}
							{frameworks.length > 0 ? (
								<div>
									<dt className={META_LABEL}>Framework</dt>
									<dd className="text-xs text-slate-700">
										{frameworks.map(frameworkLabel).join(", ")}
									</dd>
								</div>
							) : null}
							{classification.reportNumber ? (
								<div>
									<dt className={META_LABEL}>Reference</dt>
									<dd className="font-mono text-xs text-slate-700">
										{String(classification.reportNumber)}
									</dd>
								</div>
							) : null}
							{document.$createdAt ? (
								<div>
									<dt className={META_LABEL}>Uploaded</dt>
									<dd className="text-xs text-slate-700">
										<FormattedDate
											date={document.$createdAt}
											className="text-xs"
										/>
									</dd>
								</div>
							) : null}
							<div>
								<dt className={META_LABEL}>Extraction</dt>
								<dd className="text-xs text-slate-700">
									{extractionStatusLabel(document.status)}
								</dd>
							</div>
						</dl>

						{sefa?.programs?.length ? (
							<table className="w-full overflow-hidden rounded-lg border border-slate-200 text-sm">
								<caption className="sr-only">
									Schedule of federal awards
								</caption>
								<thead>
									<tr className="border-b border-slate-200 bg-slate-50">
										<th
											scope="col"
											className="px-3 py-2 text-left text-xs font-semibold text-slate-600"
										>
											Federal award
										</th>
										<th
											scope="col"
											className="px-3 py-2 text-left text-xs font-semibold text-slate-600"
										>
											Assistance listing
										</th>
										<th
											scope="col"
											className="px-3 py-2 text-right text-xs font-semibold text-slate-600"
										>
											Expenditures
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-200 text-xs text-slate-600">
									{sefa.programs.map((program) => (
										<tr key={`${program.assistanceListing}-${program.name}`}>
											<td className="px-3 py-1.5 text-left">
												{program.name}
												{program.agency ? (
													<span className="ml-1.5 text-slate-400">
														{program.agency}
													</span>
												) : null}
											</td>
											<td className="px-3 py-1.5 text-left font-mono">
												{program.assistanceListing}
											</td>
											<td className="px-3 py-1.5 text-right tabular-nums">
												${program.amountUsd.toLocaleString()}
											</td>
										</tr>
									))}
								</tbody>
								<tfoot>
									<tr className="border-t-2 border-slate-300 bg-slate-50">
										<th
											scope="row"
											colSpan={2}
											className="px-3 py-1.5 text-left"
										>
											Total
										</th>
										<td className="px-3 py-1.5 text-right tabular-nums">
											$
											{(
												sefa.totalUsd ??
												sefa.programs.reduce((sum, p) => sum + p.amountUsd, 0)
											).toLocaleString()}
										</td>
									</tr>
								</tfoot>
							</table>
						) : null}
					</div>
				</div>
			</div>

			<div className="w-full py-6 sm:py-7">
				<div className="mb-4 flex items-center justify-between gap-3">
					<SegmentedToggle
						value={activeTab}
						onChange={setActiveTab}
						ariaLabel="Switch between findings and report view"
						className="max-w-xs"
						tabs={[
							{ value: "findings", label: "Findings", count: findingsTotal },
							{ value: "report", label: "Report" },
						]}
					/>
					{activeTab === "report" ? (
						<div className="flex shrink-0 items-center gap-2">
							{/* <Button
								type="button"
								variant="outline"
								className="border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-50"
								disabled={busyId === "regenerate-report"}
								onClick={() =>
									void run("regenerate-report", () =>
										regenerateReport(documentId),
									)
								}
							>
								{busyId === "regenerate-report" ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<RotateCcw className="h-4 w-4" />
								)}
								Regenerate
							</Button> */}
							<Button
								type="button"
								className="btn-primary shrink-0 px-3 sm:px-4"
								onClick={() =>
									window.open(
										`/api/audit/documents/${documentId}/download`,
										"_blank",
									)
								}
							>
								<Download className="h-4 w-4" />
								Download Report
							</Button>
						</div>
					) : null}
				</div>
				{activeTab === "report" ? (
					<div id="audit-tabpanel-report" role="tabpanel">
						<section className="mb-8" aria-label="Report">
							<Card className="glass-card overflow-hidden">
								<div className="glass-card-cap" />
								<CardContent className="p-4 sm:p-6">
									<h2 className="h5 sidebar-gradient-text mb-3">Report</h2>
									{isProcessing ? (
										<div className="rounded-lg border border-slate-200 bg-white/60 px-4 py-6 text-sm text-slate-500">
											The report will be ready once extraction finishes.
										</div>
									) : !feedbackReport ? (
										<div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
											No analysis has been generated for this audit yet.
										</div>
									) : feedbackReport.findingCount === 0 ? (
										<div className="rounded-lg border border-slate-200/80 bg-white/80 p-4">
											{opinion ? (
												<span
													className={cn(
														"inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
														opinion.className,
													)}
												>
													{opinion.label}
												</span>
											) : null}
											<p className="mt-2 text-sm text-slate-600">
												No findings were extracted from this report.
											</p>
										</div>
									) : (
										<div className="space-y-4">
											{/* Zone 1 — verdict band */}
											<div className="flex flex-col gap-4 rounded-lg border border-slate-200/80 bg-white/80 p-4 lg:flex-row lg:items-start">
												<div className="shrink-0 lg:w-48">
													<p className={META_LABEL}>Compliance opinion</p>
													{opinion ? (
														<span
															className={cn(
																"mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
																opinion.className,
															)}
														>
															{opinion.label}
														</span>
													) : (
														<span className="text-xs text-slate-400">—</span>
													)}
													{qualifierLine ? (
														<p className="mt-1.5 text-xs text-slate-500">
															{qualifierLine}
														</p>
													) : null}
												</div>

												<div className="min-w-0 flex-1">
													<p className="text-lg font-bold text-slate-700">
														{feedbackReport.findingCount} finding
														{feedbackReport.findingCount === 1 ? "" : "s"}
														{feedbackReport.majorProgramCount > 0
															? ` across ${feedbackReport.majorProgramCount} major program${feedbackReport.majorProgramCount === 1 ? "" : "s"}`
															: ""}
													</p>
													<div
														className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-slate-100"
														aria-hidden
													>
														{SEVERITY_ORDER.map((severity) => {
															const count =
																feedbackReport.severityCounts[severity] ?? 0;
															if (!count) return null;
															return (
																<div
																	key={severity}
																	className={SEVERITY_BAR_CLASS[severity]}
																	style={{
																		width: `${(count / (severityTotal || 1)) * 100}%`,
																	}}
																/>
															);
														})}
													</div>
													<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
														{SEVERITY_ORDER.map((severity) => {
															const count =
																feedbackReport.severityCounts[severity] ?? 0;
															if (!count) return null;
															return (
																<span
																	key={severity}
																	className="inline-flex items-center gap-1"
																>
																	<span
																		className={cn(
																			"h-1.5 w-1.5 rounded-full",
																			SEVERITY_BAR_CLASS[severity],
																		)}
																	/>
																	{count}{" "}
																	{SEVERITY_DISPLAY[
																		severity
																	].label.toLowerCase()}
																</span>
															);
														})}
														{classificationEntries.length > 0 ? (
															<span className="text-slate-400">
																·{" "}
																{classificationEntries
																	.map((e) => `${e.count} ${e.label}`)
																	.join(" · ")}
															</span>
														) : null}
													</div>
												</div>

												{feedbackReport.questionedCosts ? (
													<div className="shrink-0 rounded-lg border border-red/20 bg-red/10 px-3 py-2 lg:w-40">
														<p className="text-[10px] font-semibold uppercase tracking-wide text-red">
															Questioned costs
														</p>
														<p className="mt-1 text-lg font-bold tabular-nums text-red">
															$
															{feedbackReport.questionedCosts.total.toLocaleString()}
														</p>
														<p className="mt-0.5 text-xs text-red/80">
															{feedbackReport.questionedCosts.findingIds
																.length === 1
																? `Finding ${
																		findingsById.get(
																			feedbackReport.questionedCosts
																				.findingIds[0],
																		)?.findingCode ?? ""
																	}`
																: `${feedbackReport.questionedCosts.findingIds.length} findings`}
														</p>
													</div>
												) : null}
											</div>

											{/* Zone 2 — narrative */}
											{feedbackReport.notes.filter(Boolean).length > 0 ? (
												<div className="space-y-2 rounded-lg border border-slate-200/80 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-600">
													{feedbackReport.notes.filter(Boolean).map((note) => (
														<p key={note}>{renderBold(note)}</p>
													))}
												</div>
											) : null}

											{/* Zone 3 — signals */}
											<div className="border-t border-slate-200/70 pt-4">
												<p className="text-sm font-semibold text-slate-700">
													Needs attention
													{feedbackReport.signals.length > 0 ? (
														<span className="ml-1.5 font-normal text-slate-400">
															· {feedbackReport.signals.length} signal
															{feedbackReport.signals.length === 1 ? "" : "s"}
														</span>
													) : null}
												</p>
												<div
													role="group"
													aria-label="Signals"
													aria-live="polite"
													className="mt-2 divide-y divide-slate-200/80 rounded-lg border border-slate-200/80 bg-white/80"
												>
													{feedbackReport.signals.length === 0 ? (
														<div className="flex items-center gap-2 p-3 text-sm text-green">
															<CheckCircle2
																className="h-4 w-4 shrink-0"
																aria-hidden
															/>
															Nothing flagged for review — all{" "}
															{feedbackReport.findingCount} findings extracted
															cleanly and matched your readiness tracking.
														</div>
													) : (
														SIGNAL_ORDER.map((type) => {
															const signal = feedbackReport.signals.find(
																(s) => s.type === type,
															);
															if (!signal) return null;
															const meta = SIGNAL_META[type];
															const Icon = meta.icon;

															if (type === "severity_mismatch") {
																return (
																	<div key={type} className="p-3">
																		<div className="flex items-start gap-2.5">
																			<div
																				className={cn(
																					"flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
																					meta.toneClass,
																				)}
																				aria-hidden
																			>
																				<Icon className="h-4 w-4" />
																			</div>
																			<div className="min-w-0 flex-1">
																				<p className="text-sm font-semibold text-slate-700">
																					{meta.title(signal.count)}
																				</p>
																				<div className="mt-2 space-y-2">
																					{signal.detail.map((d) => {
																						const findingId = String(
																							d.findingId,
																						);
																						const finding =
																							findingsById.get(findingId);
																						const choice =
																							severityChoices[findingId];
																						return (
																							<div
																								key={findingId}
																								className="rounded-md border border-slate-200/80 bg-slate-50/60 p-2"
																							>
																								<p className="font-mono text-[11px] text-slate-500">
																									{finding?.findingCode}
																								</p>
																								<div className="mt-1 flex flex-wrap items-center gap-2">
																									<button
																										type="button"
																										onClick={() =>
																											setSeverityChoices(
																												(prev) => ({
																													...prev,
																													[findingId]:
																														"auditor",
																												}),
																											)
																										}
																										className={cn(
																											"cursor-pointer rounded-full border px-2 py-0.5 text-xs font-semibold",
																											choice === "auditor"
																												? "border-[#0f5384] bg-[#0f5384]/10 text-[#0f5384]"
																												: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
																										)}
																									>
																										Auditor:{" "}
																										{String(
																											d.severityReported ?? "—",
																										)}
																									</button>
																									<button
																										type="button"
																										onClick={() =>
																											setSeverityChoices(
																												(prev) => ({
																													...prev,
																													[findingId]: "caalm",
																												}),
																											)
																										}
																										className={cn(
																											"cursor-pointer rounded-full border px-2 py-0.5 text-xs font-semibold",
																											choice === "caalm"
																												? "border-[#0f5384] bg-[#0f5384]/10 text-[#0f5384]"
																												: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
																										)}
																									>
																										CAALM:{" "}
																										{String(
																											d.severityComputed ?? "—",
																										)}
																									</button>
																									{d.questionedCostsUsd ? (
																										<span className="text-xs text-red">
																											$
																											{Number(
																												d.questionedCostsUsd,
																											).toLocaleString()}{" "}
																											questioned
																										</span>
																									) : null}
																								</div>
																							</div>
																						);
																					})}
																				</div>
																				<button
																					type="button"
																					className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[#0f5384] hover:underline"
																					onClick={() =>
																						viewFindingsFor(signal.findingIds)
																					}
																				>
																					View in Findings
																					<ChevronRight
																						className="h-3 w-3"
																						aria-hidden
																					/>
																				</button>
																			</div>
																		</div>
																	</div>
																);
															}

															return (
																<div
																	key={type}
																	className="flex w-full items-start gap-2.5 p-3 text-left transition-colors hover:bg-[#0f5384]/5"
																>
																	<div
																		className={cn(
																			"flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
																			meta.toneClass,
																		)}
																		aria-hidden
																	>
																		<Icon className="h-4 w-4" />
																	</div>
																	<div className="min-w-0 flex-1">
																		<p className="text-sm font-semibold text-slate-700">
																			{meta.title(signal.count)}
																		</p>
																		<div className="mt-1 space-y-1 text-xs leading-relaxed text-slate-600">
																			{signalDetailLines(
																				signal,
																				findingsById,
																			).map((line) => (
																				<p key={line}>{renderBold(line)}</p>
																			))}
																		</div>
																		<SignalReferenceChips
																			signal={signal}
																			findingsById={findingsById}
																		/>
																	</div>
																</div>
															);
														})
													)}
												</div>
											</div>

											{/* Zone 4 — readiness reconciliation */}
											{feedbackReport.readinessReconciliation.length > 0 ? (
												<div className="border-t border-slate-200/70 pt-4">
													<p className={META_LABEL}>
														Readiness reconciliation{" "}
														<span className="normal-case text-slate-400">
															· how your tracking performed against this audit
														</span>
													</p>
													<table className="mt-2 w-full overflow-hidden rounded-lg border border-slate-200 text-sm">
														<caption className="sr-only">
															Readiness reconciliation
														</caption>
														<thead>
															<tr className="border-b border-slate-200 bg-slate-50">
																<th
																	scope="col"
																	className="px-3 py-2 text-left text-xs font-semibold text-slate-600"
																>
																	Readiness item
																</th>
																<th
																	scope="col"
																	className="px-3 py-2 text-left text-xs font-semibold text-slate-600"
																>
																	Your status
																</th>
																<th
																	scope="col"
																	className="px-3 py-2 text-left text-xs font-semibold text-slate-600"
																>
																	Finding
																</th>
																<th
																	scope="col"
																	className="px-3 py-2 text-left text-xs font-semibold text-slate-600"
																>
																	Verdict
																</th>
															</tr>
														</thead>
														<tbody className="divide-y divide-slate-200 text-xs text-slate-600">
															{feedbackReport.readinessReconciliation.map(
																(row) => {
																	const finding = findingsById.get(
																		row.findingId,
																	);
																	const status = row.readinessStatus
																		? (READINESS_STATUS_DISPLAY[
																				row.readinessStatus
																			] ?? READINESS_STATUS_DISPLAY.unknown)
																		: READINESS_STATUS_DISPLAY.unknown;
																	const verdict =
																		RECON_VERDICT_DISPLAY[row.verdict];
																	return (
																		<tr key={row.findingId}>
																			<td className="px-3 py-2 text-left">
																				{row.readinessItemLabel ? (
																					<>
																						<p className="text-slate-700">
																							{row.readinessItemLabel}
																						</p>
																						{row.evidenceNote ||
																						row.lastAssessed ? (
																							<p className="mt-0.5 text-[11px] text-slate-400">
																								{row.evidenceNote ??
																									(row.lastAssessed
																										? `Assessed ${row.lastAssessed}`
																										: "")}
																							</p>
																						) : null}
																					</>
																				) : (
																					<p className="italic text-slate-400">
																						No readiness item covers this topic
																					</p>
																				)}
																			</td>
																			<td className="px-3 py-2 text-left">
																				<span
																					className={cn(
																						"inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
																						status.className,
																					)}
																				>
																					{status.label}
																				</span>
																			</td>
																			<td className="px-3 py-2 text-left font-mono">
																				{finding?.findingCode ?? "—"}
																			</td>
																			<td className="px-3 py-2 text-left">
																				<span
																					className={cn(
																						"inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
																						verdict.className,
																					)}
																				>
																					{verdict.label}
																				</span>
																			</td>
																		</tr>
																	);
																},
															)}
														</tbody>
													</table>
												</div>
											) : null}

											{/* Zone 5 — corrective action coverage */}
											<div className="space-y-2 border-t border-slate-200/70 pt-4">
												<p className={META_LABEL}>Corrective action coverage</p>
												{feedbackReport.capCount === 0 &&
												feedbackReport.findingCount > 0 ? (
													<div className="flex flex-wrap items-center gap-3 rounded-lg border border-orange/40 bg-orange/5 p-3">
														<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange/10 text-orange">
															<AlertTriangle className="h-4 w-4" aria-hidden />
														</span>
														<div className="min-w-0 flex-1">
															<p className="text-sm font-semibold text-slate-700">
																No corrective actions created yet
															</p>
															<p className="text-xs text-slate-500">
																{feedbackReport.findingCount} finding
																{feedbackReport.findingCount === 1 ? "" : "s"}{" "}
																need a plan.
															</p>
														</div>
													</div>
												) : feedbackReport.capCount > 0 ? (
													<p className="text-sm text-slate-600">
														{feedbackReport.capCount} of{" "}
														{feedbackReport.findingCount} findings have a
														corrective action · {feedbackReport.openCapCount}{" "}
														open
													</p>
												) : null}
												{(() => {
													const clean: Array<{
														key: string;
														count: number;
														noun: string;
														rest: string;
													}> = [];
													if (feedbackReport.quarantinedCount === 0) {
														clean.push({
															key: "quarantine",
															count: feedbackReport.findingCount,
															noun: `finding${feedbackReport.findingCount === 1 ? "" : "s"}`,
															rest: "matched a verified source quote — none quarantined",
														});
													}
													if (
														feedbackReport.programCount > 0 &&
														feedbackReport.majorProgramCount ===
															feedbackReport.programCount
													) {
														clean.push({
															key: "programs",
															count: feedbackReport.programCount,
															noun: `program${feedbackReport.programCount === 1 ? "" : "s"}`,
															rest: "audited as major programs",
														});
													}
													if (clean.length === 0) return null;
													return (
														<div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 rounded-lg border border-green/20 bg-green/5 px-4 py-2.5">
															{clean.map((c) => (
																<p
																	key={c.key}
																	className="flex items-center gap-1.5 text-xs text-green"
																>
																	<CheckCircle2
																		className="h-3.5 w-3.5 shrink-0"
																		aria-hidden
																	/>
																	<span className="rounded-md border border-green/20 bg-green/10 px-1.5 py-0.5 font-semibold">
																		All {c.count} {c.noun}
																	</span>
																	{c.rest}
																</p>
															))}
														</div>
													);
												})()}
											</div>
										</div>
									)}
								</CardContent>
								{/* Footer cap — mirrors the top glass-card-cap, pinned to the bottom of the card */}
								{!isProcessing &&
								feedbackReport &&
								feedbackReport.findingCount > 0 &&
								(classification.auditorName ||
									classification.period ||
									classification.reportDate ||
									classification.reportNumber ||
									sefa?.totalUsd) ? (
									<div className="border-t border-slate-200/70 bg-slate-50/80 px-4 py-3 sm:px-6">
										<div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-xs text-slate-500">
											{classification.auditorName ? (
												<span>
													<strong className="font-semibold text-slate-700">
														{String(classification.auditorName)}
													</strong>
													{classification.auditorLocation
														? ` · ${String(classification.auditorLocation)}`
														: ""}
												</span>
											) : null}
											{classification.period ? (
												<span>FY {String(classification.period)}</span>
											) : null}
											{classification.reportDate ? (
												<span>
													Report dated {String(classification.reportDate)}
												</span>
											) : null}
											{classification.reportNumber ? (
												<span className="font-mono">
													{String(classification.reportNumber)}
												</span>
											) : null}
											{sefa?.totalUsd ? (
												<span>
													${sefa.totalUsd.toLocaleString()} federal expenditures
												</span>
											) : null}
										</div>
									</div>
								) : null}
							</Card>
						</section>
					</div>
				) : (
					<div id="audit-tabpanel-findings" role="tabpanel">
						<section className="mb-8" aria-label="Findings">
							<Card className="glass-card overflow-hidden">
								<div className="glass-card-cap" />
								<CardContent className="p-4 sm:p-6">
									<h2 className="h5 sidebar-gradient-text mb-3">Findings</h2>
									{idFilter ? (
										<div className="mb-3 flex items-center gap-2 rounded-md border border-[#a0c4db]/60 bg-[#e1f3ff]/30 px-3 py-1.5 text-xs text-[#0f5384]">
											<span>
												Showing {idFilter.length} finding
												{idFilter.length === 1 ? "" : "s"} from the Report
											</span>
											<button
												type="button"
												className="ml-auto cursor-pointer font-semibold hover:underline"
												onClick={clearFilters}
											>
												Clear
											</button>
										</div>
									) : null}
									{findings.length === 0 ? (
										<p className="text-sm text-slate-500">
											{document.status === "complete"
												? "No findings were extracted."
												: "Still reading the file…"}
										</p>
									) : (
										<CaalmDataTable className="pb-0">
											<TableHeader className="[&_tr]:border-b-0">
												<TableRow className={DATA_TABLE_HEADER_ROW}>
													<TableHead
														className={cn(DATA_TABLE_HEADER_CELL, "pl-4")}
													>
														Id
													</TableHead>
													<TableHead className={DATA_TABLE_HEADER_CELL}>
														Severity
													</TableHead>
													<TableHead className={DATA_TABLE_HEADER_CELL}>
														Risk
													</TableHead>
													<TableHead className={DATA_TABLE_HEADER_CELL}>
														History
													</TableHead>
													<TableHead className={DATA_TABLE_HEADER_CELL}>
														Classification
													</TableHead>
													<TableHead className={DATA_TABLE_HEADER_CELL}>
														Status
													</TableHead>
													<TableHead className={DATA_TABLE_HEADER_CELL}>
														Progress
													</TableHead>
													<TableHead className={DATA_TABLE_HEADER_CELL}>
														Due
													</TableHead>
													<TableHead
														className={cn(
															DATA_TABLE_HEADER_CELL,
															"pr-4 text-right",
														)}
													>
														Corrective Actions
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody className="[&_tr:last-child>td]:border-b-0">
												{pagedFindings.map((finding) => {
													const detailsOpen = openFindingIds.has(finding.$id);
													const passageOpen = !hiddenPassageIds.has(
														finding.$id,
													);
													const repeatOfCode = finding.repeatOfFindingId
														? (findings.find(
																(f) => f.$id === finding.repeatOfFindingId,
															)?.findingCode ?? null)
														: null;
													const findingCap =
														caps.find((row) => row.findingId === finding.$id) ??
														null;
													return (
														<AuditFindingCard
															key={finding.$id}
															finding={finding}
															cap={findingCap}
															repeatOfCode={repeatOfCode}
															detailsOpen={detailsOpen}
															passageOpen={passageOpen}
															busy={
																busyId === finding.$id ||
																(findingCap ? busyId === findingCap.$id : false)
															}
															canManageFindings={canManageFindings}
															canManageCaps={canManageCaps}
															onToggleDetails={() =>
																toggleInSet(setOpenFindingIds, finding.$id)
															}
															onTogglePassage={() =>
																toggleInSet(setHiddenPassageIds, finding.$id)
															}
															onConfirm={() =>
																void run(finding.$id, () =>
																	patchFinding(finding.$id, "confirm"),
																)
															}
															onDispute={() => {
																setReason("");
																setReasonDialog({
																	kind: "dispute",
																	id: finding.$id,
																});
															}}
															onRectify={() =>
																void run(finding.$id, () =>
																	patchFinding(finding.$id, "rectify"),
																)
															}
															onAcceptRisk={() => {
																setReason("");
																setReasonDialog({
																	kind: "accept_risk",
																	id: finding.$id,
																});
															}}
															onStartCap={
																findingCap
																	? () =>
																			void run(findingCap.$id, () =>
																				patchCap(findingCap.$id, {
																					status: "in_progress",
																				}),
																			)
																	: undefined
															}
															onCloseCap={
																findingCap
																	? () => {
																			setCloseCapPrefill(
																				getCapVerificationDraft(
																					findingCap.$id,
																				) ?? "",
																			);
																			setCloseCapId(findingCap.$id);
																		}
																	: undefined
															}
															onCreateCap={() =>
																void run(finding.$id, () =>
																	createCapForFinding(finding.$id),
																)
															}
															onEvidenceUploaded={(attachments) => {
																if (!findingCap) return;
																applyCapAttachments(
																	findingCap.$id,
																	attachments,
																);
															}}
															ownerUser={
																findingCap?.assigneeId
																	? (capOwnerUsers.get(findingCap.assigneeId) ??
																		null)
																	: null
															}
															onToggleTask={
																findingCap
																	? (taskId) => {
																			const nextTasks = findingCap.tasks.map(
																				(task) =>
																					task.id === taskId
																						? { ...task, done: !task.done }
																						: task,
																			);
																			void run(findingCap.$id, () =>
																				patchCap(findingCap.$id, {
																					tasks: nextTasks,
																				}),
																			);
																		}
																	: undefined
															}
														/>
													);
												})}
											</TableBody>
										</CaalmDataTable>
									)}
									<PageIndex
										page={findingsPage}
										totalItems={findings.length}
										pageSize={FINDINGS_PAGE_SIZE}
										onPageChange={setFindingsPage}
										hideWhenSinglePage
										showRange
										itemLabel="findings"
										className="mx-0 mt-4"
									/>
								</CardContent>
							</Card>
						</section>
					</div>
				)}
			</div>

			<ConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				variant="destructive"
				icon={<Trash2 className="h-5 w-5" />}
				title="Delete this audit?"
				description="The report leaves Active Uploaded Audits. Someone with delete permission can restore it from the Removed list. Findings and corrective actions get closed and stay closed after restore."
				confirmLabel="Delete"
				onConfirm={async () => {
					const response = await fetch(`/api/audit/documents/${documentId}`, {
						method: "DELETE",
					});
					if (!response.ok) throw new Error("Delete failed");
					router.push("/audits/uploads");
				}}
			/>

			<AppDialog
				open={Boolean(reasonDialog)}
				onOpenChange={(next) => {
					if (!next) setReasonDialog(null);
				}}
				size="form"
				icon={<AlertTriangle className="h-5 w-5" />}
				title={
					reasonDialog?.kind === "dispute"
						? "Dispute this finding"
						: "Accept this risk"
				}
				description="Write a short reason so the audit trail stays clear."
				footer={
					<>
						<Button
							type="button"
							variant="ghost"
							className="h-[1.65rem] justify-center rounded-full px-3 py-1.5 text-slate-400 hover:bg-black/[.04] hover:text-slate-600"
							onClick={() => setReasonDialog(null)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							className="btn-primary px-3 sm:px-4"
							disabled={busyId === reasonDialog?.id || !reason.trim()}
							onClick={() => {
								if (!reasonDialog) return;
								void run(reasonDialog.id, () =>
									patchFinding(
										reasonDialog.id,
										reasonDialog.kind,
										reason.trim(),
									),
								).then(() => setReasonDialog(null));
							}}
						>
							<Check className="h-4 w-4" />
							Save
						</Button>
					</>
				}
			>
				<div className="py-4">
					<Textarea
						value={reason}
						onChange={(event) => setReason(event.target.value)}
						placeholder="Reason"
					/>
				</div>
			</AppDialog>

			<CloseCorrectiveActionDialog
				open={Boolean(closingCap)}
				onOpenChange={(next) => {
					if (!next) {
						setCloseCapId(null);
						setCloseCapPrefill("");
					}
				}}
				cap={closingCap}
				severity={closingFinding?.severityComputed ?? "medium"}
				initialNotes={closeCapPrefill}
				busy={busyId === closeCapId}
				onAttachmentsChange={(attachments) => {
					if (!closeCapId) return;
					applyCapAttachments(closeCapId, attachments);
				}}
				onViewAllAttachments={() => {
					const findingId = closingCap?.findingId;
					if (!findingId) return;
					const sectionId = `finding-cap-${findingId}`;
					setOpenFindingIds((prev) => {
						const next = new Set(prev);
						next.add(findingId);
						return next;
					});
					// Wait for close-dialog exit + details drawer paint, then scroll to CAP.
					// Use window.document — `document` here is the audit file record.
					window.requestAnimationFrame(() => {
						window.setTimeout(() => {
							const el = window.document.getElementById(sectionId);
							if (!el) return;
							el.scrollIntoView({ behavior: "smooth", block: "start" });
							el.focus({ preventScroll: true });
						}, 280);
					});
				}}
				onSubmit={async (notes) => {
					if (!closeCapId) return;
					await run(closeCapId, () =>
						patchCap(closeCapId, {
							status: "closed",
							verificationEvidence: notes,
						}),
					);
					clearCapVerificationDraft(closeCapId);
					setCloseCapId(null);
					setCloseCapPrefill("");
				}}
			/>
		</div>
	);
}
