"use client";

import {
	AlertTriangle,
	Clock,
	FileText,
	Lock,
	Send,
	Toolbox,
	Unlink,
	Upload,
	X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	type FormEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import ProfilePicture from "@/components/ProfilePicture";
import { ProblemPageUrlField } from "@/components/tickets/ProblemPageUrlField";
import {
	createSubmitProgressTicker,
	SubmitProgressIndicator,
} from "@/components/tickets/SubmitProgressIndicator";
import { TicketSubmittedConfirmDialog } from "@/components/tickets/TicketSubmittedConfirmDialog";
import TicketVideoRecorder from "@/components/tickets/TicketVideoRecorder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useTicketRecording } from "@/contexts/TicketRecordingContext";
import {
	getEnterpriseFormatHint,
	getEnterpriseInputAccept,
	validateEnterpriseFile,
} from "@/lib/files/enterprise-file-formats";
import {
	BUG_CONFIRM_IS_BUG,
	BUG_CONFIRM_SEARCHED,
	BUG_REPORT_ENVIRONMENTS,
	BUG_REPORT_OS,
	type BugReportEnvironment,
	type BugReportOs,
	detectBugReportEnvironment,
	detectBugReportOs,
} from "@/lib/tickets/bug-report-body";
import {
	defaultProblemPageUrl,
	parseProblemPageUrl,
} from "@/lib/tickets/problem-page-url";
import {
	resolveSubmitterDepartmentLabel,
	type SubmitterPlacementInput,
} from "@/lib/tickets/submitter-placement";
import type {
	Ticket,
	TicketLane,
	TicketSeverity,
} from "@/lib/tickets/ticket.types";
import {
	clearTicketFormDraft,
	loadTicketFormDraft,
	saveTicketFormDraft,
	type TicketFormDraft,
	ticketFormDraftHasContent,
} from "@/lib/tickets/ticket-form-draft";
import {
	categoriesForLane,
	deriveSeverityFromMatrix,
	getSeverityBadgeTitle,
	TICKET_IMPACT_LEVELS,
	TICKET_LANE_OPTIONS,
	TICKET_MODULES,
	TICKET_URGENCY_LEVELS,
} from "@/lib/tickets/ticket-intake.constants";
import { displayTicketNumber } from "@/lib/tickets/ticket-number.utils";
import { ticketRecordingToFile } from "@/lib/tickets/ticket-recording";
import { cn } from "@/lib/utils";

const TICKET_FIELD_CLASS =
	"bg-white !border-[0.25px] !border-solid !border-slate-200 focus-visible:!border-[#078FAB] focus-visible:ring-1 focus-visible:ring-[#078FAB]";

const SEVERITY_BANNER: Record<TicketSeverity, string> = {
	low: "border-[#a7e9d5] bg-[#edfaf6] text-[#0e8a63]",
	medium: "border-[#bfdbfe] bg-[#eff6ff] text-[#1d6fb8]",
	high: "border-[#fcd9bd] bg-[#fff8f3] text-[#b45309]",
	critical: "border-[#fecaca] bg-[#fff0f0] text-[#b80000]",
};

const CONFIRM_CARD =
	"flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition-colors duration-200";
const CONFIRM_CARD_CHECKED = "border-[#078FAB] bg-[#078FAB]/5";

const URGENCY_PILL_ACTIVE: Record<string, string> = {
	low: "border-green/20 bg-green/10 text-green",
	medium: "border-blue/20 bg-blue/10 text-blue",
	high: "border-orange/20 bg-orange/10 text-orange",
	critical: "border-red/20 bg-red/10 text-red",
};

const HELP_PRIORITY_HINTS: Record<string, string> = {
	low: "We'll respond within 5 business days.",
	medium: "We'll respond within 2 business days.",
	high: "We'll respond within 4 hours during business hours.",
	critical: "We'll respond within 1 hour. Use this only for urgent outages.",
};

const MAX_DESC = 2000;
const MAX_STEPS = 10;
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const DRAFT_AUTOSAVE_MS = 300;

type AttachmentEntry = { id: string; file: File };
type TouchedFields = Partial<
	Record<
		| "lane"
		| "title"
		| "category"
		| "impact"
		| "urgency"
		| "description"
		| "steps"
		| "expected"
		| "actual"
		| "os"
		| "environment"
		| "confirmations"
		| "problemPageUrl",
		boolean
	>
>;

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function RequiredMark() {
	return <span className="text-red">*</span>;
}

function FormField({
	label,
	htmlFor,
	required,
	hint,
	error,
	trailing,
	children,
	className,
}: {
	label: string;
	htmlFor?: string;
	required?: boolean;
	hint?: string;
	error?: string | null;
	trailing?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("flex flex-col", className)}>
			<div className="mb-1.5 flex items-baseline justify-between gap-2">
				<Label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
					{label}
					{required ? (
						<>
							{" "}
							<RequiredMark />
						</>
					) : null}
					{hint ? (
						<span className="ml-1 font-normal text-slate-500">({hint})</span>
					) : null}
				</Label>
				{trailing}
			</div>
			<div className="min-h-0 flex-1">{children}</div>
			{error ? <p className="mt-1 text-xs text-red">{error}</p> : null}
		</div>
	);
}

function SelectField({
	id,
	value,
	onChange,
	onBlur,
	options,
	placeholder,
	error,
	disabled,
}: {
	id: string;
	value: string;
	onChange: (value: string) => void;
	onBlur?: () => void;
	options: readonly string[];
	placeholder: string;
	error?: boolean;
	disabled?: boolean;
}) {
	return (
		<Select
			value={value || undefined}
			onValueChange={onChange}
			disabled={disabled}
			onOpenChange={(open) => {
				if (!open) onBlur?.();
			}}
		>
			<SelectTrigger
				id={id}
				className={cn(
					"cursor-pointer text-slate-700 shadow-sm",
					TICKET_FIELD_CLASS,
					!value && "text-slate-500",
					error && "border-red/60!",
				)}
			>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option} value={option}>
						{option}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function PillGroup({
	label,
	value,
	onChange,
	options,
	error,
	activeClasses,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: readonly { value: string; label: string }[];
	error?: string | null;
	activeClasses?: Record<string, string>;
}) {
	return (
		<div>
			<p className="mb-1.5 text-xs text-slate-600">{label}</p>
			<div
				role="radiogroup"
				aria-label={label}
				className="flex flex-wrap gap-1.5"
			>
				{options.map((option) => {
					const active = value === option.value;
					return (
						<button
							key={option.value}
							type="button"
							role="radio"
							aria-checked={active}
							onClick={() => onChange(option.value)}
							className={cn(
								"cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
								active
									? (activeClasses?.[option.value] ??
											"border-blue/20 bg-blue/10 text-[#0f5384]")
									: "border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue/5",
							)}
						>
							{option.label}
						</button>
					);
				})}
			</div>
			{error ? <p className="mt-1 text-xs text-red">{error}</p> : null}
		</div>
	);
}

export function TicketSubmitForm() {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const router = useRouter();
	const { user } = useAuth();
	const { draftRecording } = useTicketRecording();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const formRef = useRef<HTMLFormElement>(null);

	const [lane, setLane] = useState<TicketLane | "">(() => {
		const raw = searchParams?.get("lane");
		return raw === "engineering" ? "engineering" : "help";
	});
	const [title, setTitle] = useState(() => searchParams?.get("title") ?? "");
	const [category, setCategory] = useState(
		() => searchParams?.get("category") ?? "",
	);
	const [affectedModule, setAffectedModule] = useState(
		() => searchParams?.get("module") ?? "",
	);
	const [impact, setImpact] = useState("");
	const [urgency, setUrgency] = useState("");
	const [helpPriority, setHelpPriority] = useState("medium");
	const [description, setDescription] = useState("");
	const [reproSteps, setReproSteps] = useState<string[]>(["", ""]);
	const [expected, setExpected] = useState("");
	const [actual, setActual] = useState("");
	const [os, setOs] = useState<BugReportOs | "">("");
	const [environment, setEnvironment] = useState<BugReportEnvironment | "">("");
	const [searchedExisting, setSearchedExisting] = useState(false);
	const [isBug, setIsBug] = useState(false);
	const [attachments, setAttachments] = useState<AttachmentEntry[]>([]);
	const [problemPageUrl, setProblemPageUrl] = useState(
		() => searchParams?.get("pageUrl")?.trim() ?? "",
	);
	// What recording, the saved draft and submit use; typing only changes the box
	// until "Update page" is pressed.
	const [confirmedPageUrl, setConfirmedPageUrl] = useState(
		() => searchParams?.get("pageUrl")?.trim() ?? "",
	);
	const [pageJustUpdated, setPageJustUpdated] = useState(false);
	const [draftRestored, setDraftRestored] = useState(false);
	// Set when the user submits or cancels, so a pending autosave can't resurrect the draft.
	const leavingRef = useRef(false);
	const [dragOver, setDragOver] = useState(false);
	const [touched, setTouched] = useState<TouchedFields>({});
	const [submitting, setSubmitting] = useState(false);
	const [submitProgress, setSubmitProgress] = useState(0);
	const [showSubmitProgress, setShowSubmitProgress] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [fileError, setFileError] = useState<string | null>(null);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [submittedTicket, setSubmittedTicket] = useState<Ticket | null>(null);

	const userName = user?.name ?? "Signed-in user";
	const placement = user as SubmitterPlacementInput | null;
	const departmentLabel = resolveSubmitterDepartmentLabel({
		departmentLabel: placement?.departmentLabel,
		department: placement?.department,
		divisionLabel: placement?.divisionLabel,
		division: placement?.division,
	});

	useEffect(() => {
		setOs(
			(prev) =>
				prev || detectBugReportOs(navigator.userAgent, navigator.platform),
		);
		setEnvironment(
			(prev) => prev || detectBugReportEnvironment(window.location.hostname),
		);
	}, []);

	useEffect(() => {
		if (pathname !== "/tickets/new") return;

		const draft = loadTicketFormDraft();
		if (!draft) {
			const fallback = defaultProblemPageUrl(pathname);
			setProblemPageUrl((prev) => (prev.trim() ? prev : fallback));
			setConfirmedPageUrl((prev) => (prev.trim() ? prev : fallback));
			return;
		}

		// Explicit links (?lane=, ?title=, ...) beat the saved draft, field by field.
		const fromLink = (key: string) => Boolean(searchParams?.get(key)?.trim());
		const laneFromLink = fromLink("lane");
		if (
			!laneFromLink &&
			(draft.lane === "engineering" || draft.lane === "help")
		) {
			setLane(draft.lane);
		}
		if (draft.title && !fromLink("title")) setTitle(draft.title);
		if (draft.category && !fromLink("category") && !laneFromLink) {
			setCategory(draft.category);
		}
		if (draft.affectedModule && !fromLink("module")) {
			setAffectedModule(draft.affectedModule);
		}
		if (draft.description) setDescription(draft.description);
		if (draft.impact) setImpact(draft.impact);
		if (draft.urgency) setUrgency(draft.urgency);
		if (draft.helpPriority) setHelpPriority(draft.helpPriority);
		if (draft.reproSteps?.some((step) => step.trim())) {
			setReproSteps(
				draft.reproSteps.length >= 2
					? draft.reproSteps
					: [...draft.reproSteps, ""],
			);
		}
		if (draft.expected) setExpected(draft.expected);
		if (draft.actual) setActual(draft.actual);
		if (draft.os) setOs(draft.os as BugReportOs);
		if (draft.environment) {
			setEnvironment(draft.environment as BugReportEnvironment);
		}
		if (draft.searchedExisting) setSearchedExisting(true);
		if (draft.isBug) setIsBug(true);
		// An explicit ?pageUrl= link beats the saved draft's address.
		const restored =
			searchParams?.get("pageUrl")?.trim() ||
			draft.problemPageUrl?.trim() ||
			defaultProblemPageUrl(pathname);
		setProblemPageUrl(restored);
		setConfirmedPageUrl(restored);
		if (ticketFormDraftHasContent(draft)) setDraftRestored(true);
	}, [pathname, searchParams]);

	const pageUrlDirty = problemPageUrl.trim() !== confirmedPageUrl.trim();

	const updateProblemPage = useCallback(() => {
		setTouched((prev) => ({ ...prev, problemPageUrl: true }));
		const parsed = parseProblemPageUrl(problemPageUrl);
		if (!parsed.ok) return;
		setProblemPageUrl(parsed.href);
		setConfirmedPageUrl(parsed.href);
		setPageJustUpdated(true);
	}, [problemPageUrl]);

	useEffect(() => {
		if (!pageJustUpdated) return;
		const timer = setTimeout(() => setPageJustUpdated(false), 1800);
		return () => clearTimeout(timer);
	}, [pageJustUpdated]);

	const draftSnapshot = useMemo(
		(): TicketFormDraft => ({
			lane: lane || undefined,
			title,
			category,
			affectedModule,
			description,
			problemPageUrl: confirmedPageUrl,
			impact,
			urgency,
			helpPriority,
			reproSteps,
			expected,
			actual,
			os,
			environment,
			searchedExisting,
			isBug,
		}),
		[
			actual,
			affectedModule,
			category,
			confirmedPageUrl,
			description,
			environment,
			expected,
			helpPriority,
			impact,
			isBug,
			lane,
			os,
			reproSteps,
			searchedExisting,
			title,
			urgency,
		],
	);

	// Recording navigates away right after this call, so it saves immediately.
	const persistFormDraft = useCallback(() => {
		saveTicketFormDraft(draftSnapshot);
	}, [draftSnapshot]);

	// Autosave shortly after the last change so leaving by any route keeps the work.
	useEffect(() => {
		if (!ticketFormDraftHasContent(draftSnapshot)) return;
		const timer = setTimeout(() => {
			if (leavingRef.current) return;
			saveTicketFormDraft(draftSnapshot);
		}, DRAFT_AUTOSAVE_MS);
		return () => clearTimeout(timer);
	}, [draftSnapshot]);

	const cancelForm = useCallback(() => {
		leavingRef.current = true;
		clearTicketFormDraft();
		router.back();
	}, [router]);

	const startFresh = useCallback(() => {
		leavingRef.current = false;
		clearTicketFormDraft();
		const fallback = defaultProblemPageUrl(pathname || "/tickets/new");
		const raw = searchParams?.get("lane");
		setLane(raw === "engineering" ? "engineering" : "help");
		setTitle(searchParams?.get("title") ?? "");
		setCategory(searchParams?.get("category") ?? "");
		setAffectedModule(searchParams?.get("module") ?? "");
		setImpact("");
		setUrgency("");
		setHelpPriority("medium");
		setDescription("");
		setReproSteps(["", ""]);
		setExpected("");
		setActual("");
		setSearchedExisting(false);
		setIsBug(false);
		const fromQuery = searchParams?.get("pageUrl")?.trim() || fallback;
		setProblemPageUrl(fromQuery);
		setConfirmedPageUrl(fromQuery);
		setTouched({});
		setError(null);
		setDraftRestored(false);
	}, [pathname, searchParams]);

	const categoryOptions = useMemo(
		() => (lane ? categoriesForLane(lane) : []),
		[lane],
	);

	// Help requests have no "who's affected" step; treat them as "Just me" so
	// the priority pill alone decides the tier.
	const effectiveImpact = lane === "help" ? "low" : impact;
	const effectiveUrgency = lane === "help" ? helpPriority : urgency;
	const selectedLane = TICKET_LANE_OPTIONS.find(
		(option) => option.value === lane,
	);
	const helpPriorityLabel = TICKET_URGENCY_LEVELS.find(
		(item) => item.value === helpPriority,
	)?.label;

	const derived = useMemo(() => {
		if (!effectiveImpact || !effectiveUrgency) return null;
		try {
			const result = deriveSeverityFromMatrix(
				effectiveImpact as TicketSeverity,
				effectiveUrgency as TicketSeverity,
			);
			return {
				severity: result.severity,
				badgeTitle: getSeverityBadgeTitle(result.severity),
				slaLabel: result.responseSlaLabel,
			};
		} catch {
			return null;
		}
	}, [effectiveImpact, effectiveUrgency]);

	const errors = useMemo(
		() => ({
			lane: lane === "" ? "Choose Help or Engineering." : null,
			title:
				title.trim().length < 3 ? "Title must be at least 3 characters." : null,
			category: category === "" ? "Choose a category." : null,
			impact:
				lane === "help"
					? helpPriority === ""
						? "Select a priority."
						: null
					: impact === ""
						? "Select how many people are affected."
						: null,
			urgency:
				lane === "help"
					? null
					: urgency === ""
						? "Select how urgent this is."
						: null,
			description:
				lane === "engineering"
					? null
					: description.trim().length < 8
						? "Description must be at least 8 characters."
						: null,
			steps:
				lane === "engineering" &&
				reproSteps.filter((step) => step.trim()).length < 2
					? "Add at least 2 reproduction steps."
					: null,
			expected:
				lane === "engineering" && expected.trim().length < 8
					? "Expected behavior must be at least 8 characters."
					: null,
			actual:
				lane === "engineering" && actual.trim().length < 8
					? "Actual behavior must be at least 8 characters."
					: null,
			os:
				lane === "engineering" && os === ""
					? "Select an operating system."
					: null,
			environment:
				lane === "engineering" && environment === ""
					? "Select where you saw this."
					: null,
			confirmations:
				lane === "engineering" && (!searchedExisting || !isBug)
					? "Confirm you searched existing issues and that this is a bug."
					: null,
			problemPageUrl: (() => {
				const typed = parseProblemPageUrl(problemPageUrl);
				if (!typed.ok) return typed.reason;
				if (pageUrlDirty) return "Press “Update page” to use this address.";
				const confirmed = parseProblemPageUrl(confirmedPageUrl);
				return confirmed.ok ? null : confirmed.reason;
			})(),
		}),
		[
			lane,
			title,
			category,
			impact,
			urgency,
			helpPriority,
			description,
			reproSteps,
			expected,
			actual,
			os,
			environment,
			searchedExisting,
			isBug,
			problemPageUrl,
			confirmedPageUrl,
			pageUrlDirty,
		],
	);

	const isValid = Object.values(errors).every((item) => !item);
	const showValidationBanner = !isValid && Object.values(touched).some(Boolean);

	const addFiles = useCallback((fileList: FileList | File[]) => {
		const incoming = Array.from(fileList);
		if (incoming.length === 0) return;

		setFileError(null);
		setAttachments((prev) => {
			const next = [...prev];
			for (const file of incoming) {
				if (next.length >= MAX_FILES) {
					setFileError(`You can attach up to ${MAX_FILES} files.`);
					break;
				}
				const validation = validateEnterpriseFile(file, "ticketAttachment");
				if (!validation.ok) {
					setFileError(validation.reason);
					continue;
				}
				if (file.size > MAX_FILE_BYTES) {
					setFileError(`${file.name} exceeds the 10 MB limit.`);
					continue;
				}
				next.push({
					id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
					file,
				});
			}
			return next;
		});
	}, []);

	const removeFile = useCallback((id: string) => {
		setAttachments((prev) => prev.filter((entry) => entry.id !== id));
		setFileError(null);
	}, []);

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setTouched({
			lane: true,
			title: true,
			category: true,
			impact: true,
			urgency: true,
			description: true,
			steps: true,
			expected: true,
			actual: true,
			os: true,
			environment: true,
			confirmations: true,
			problemPageUrl: true,
		});
		if (!isValid || !derived || !lane) {
			setTimeout(() => {
				formRef.current
					?.querySelector('[class*="border-red"], [aria-invalid="true"]')
					?.scrollIntoView({ behavior: "smooth", block: "center" });
			}, 0);
			return;
		}

		setSubmitting(true);
		setError(null);
		setShowSubmitProgress(true);
		setSubmitProgress(0);

		// Simulated progress while the API runs; completes at 100% on success
		const stopProgress = createSubmitProgressTicker(setSubmitProgress);

		try {
			const form = new FormData();
			form.set("title", title.trim());
			form.set("lane", lane);
			form.set("category", category);
			if (affectedModule) form.set("affectedModule", affectedModule);
			form.set("impact", effectiveImpact);
			form.set("urgency", effectiveUrgency);
			if (lane === "engineering") {
				form.set(
					"steps",
					reproSteps
						.map((step) => step.trim())
						.filter(Boolean)
						.map((step, index) => `${index + 1}. ${step}`)
						.join("\n"),
				);
				form.set("expected", expected.trim());
				form.set("actual", actual.trim());
				form.set("os", os);
				form.set("environment", environment);
				form.set("searchedExisting", searchedExisting ? "true" : "false");
				form.set("isBug", isBug ? "true" : "false");
			} else {
				form.set("description", description.trim());
			}

			const parsedPage = parseProblemPageUrl(confirmedPageUrl);
			if (!parsedPage.ok) {
				setError(parsedPage.reason);
				stopProgress();
				setShowSubmitProgress(false);
				setSubmitting(false);
				return;
			}
			form.set("problemPageUrl", parsedPage.href);

			const filesToUpload = attachments.slice(0, MAX_FILES).map((e) => e.file);
			if (draftRecording) {
				if (filesToUpload.length >= MAX_FILES) {
					setFileError(
						`You can attach up to ${MAX_FILES} files (including a screen recording).`,
					);
					stopProgress();
					setShowSubmitProgress(false);
					setSubmitting(false);
					return;
				}
				const videoFile = ticketRecordingToFile(draftRecording);
				if (videoFile.size > MAX_FILE_BYTES) {
					setFileError("Screen recording exceeds the 10 MB limit.");
					stopProgress();
					setShowSubmitProgress(false);
					setSubmitting(false);
					return;
				}
				filesToUpload.push(videoFile);
			}

			for (const file of filesToUpload) {
				form.append("attachments", file);
			}

			const res = await fetch("/api/tickets", { method: "POST", body: form });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to submit ticket");

			stopProgress();
			setSubmitProgress(100);
			// Let the bar fill and success check animate before the confirm modal
			await new Promise((resolve) => setTimeout(resolve, 1200));
			setShowSubmitProgress(false);
			setSubmitting(false);
			leavingRef.current = true;
			clearTicketFormDraft();
			setSubmittedTicket(data.ticket as Ticket);
			setConfirmOpen(true);
		} catch (err) {
			stopProgress();
			setShowSubmitProgress(false);
			setSubmitProgress(0);
			setError(err instanceof Error ? err.message : "Failed to submit ticket");
			setSubmitting(false);
		}
	};

	return (
		<div className="w-full space-y-6">
			<div className="space-y-1 text-sm text-slate-600">
				<p>Your submission is logged and tracked end to end.</p>
				<p>Fields marked with an asterisk are required.</p>
			</div>

			<div className="glass-card-inner flex items-center gap-3 rounded-lg border border-slate-200/60 p-3 sm:p-4">
				<ProfilePicture user={user} size="md" editable={false} />
				<div className="min-w-0">
					<p className="truncate text-sm font-medium text-slate-700">
						{userName}
					</p>
					<p className="truncate text-xs text-slate-600">{departmentLabel}</p>
				</div>
				<span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-slate-500">
					<Lock className="h-3 w-3" aria-hidden />
					Locked to your account
				</span>
			</div>

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<form
						ref={formRef}
						onSubmit={onSubmit}
						noValidate
						className="space-y-6"
					>
						{draftRestored ? (
							<div
								role="status"
								className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-3 py-2 text-xs text-[#1d6fb8]"
							>
								<span>We restored your unsent draft from earlier.</span>
								<button
									type="button"
									onClick={startFresh}
									className="cursor-pointer rounded-sm font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB] focus-visible:ring-offset-2"
								>
									Start fresh
								</button>
							</div>
						) : null}
						<div>
							<p className="mb-1 text-sm font-medium text-slate-700">
								What kind of request is this? <RequiredMark />
							</p>
							<p className="mb-3 text-xs text-slate-600">
								Pick the closest match — you can escalate Help to Engineering
								later if needed.
							</p>
							<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
								<SegmentedToggle<TicketLane | "">
									ariaLabel="Request type"
									value={lane}
									onChange={(value) => {
										if (!value) return;
										setLane(value);
										setCategory("");
										setTouched((prev) => ({ ...prev, lane: true }));
									}}
									tabs={TICKET_LANE_OPTIONS.map((option) => ({
										value: option.value,
										label: option.label,
										icon: option.value === "help" ? Toolbox : Unlink,
									}))}
									className="min-w-80"
								/>
								{selectedLane ? (
									<p
										key={selectedLane.value}
										className="animate-in fade-in slide-in-from-left-1 text-xs text-slate-600 duration-200"
									>
										{selectedLane.helper}
									</p>
								) : null}
							</div>
							{touched.lane && errors.lane ? (
								<p className="mt-2 text-xs text-red">{errors.lane}</p>
							) : null}
						</div>

						<Separator className="bg-slate-200/70" />

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<FormField
								label="Title"
								htmlFor="ticket-title"
								required
								error={touched.title ? errors.title : null}
							>
								<Input
									id="ticket-title"
									value={title}
									onChange={(event) => setTitle(event.target.value)}
									onBlur={() =>
										setTouched((prev) => ({ ...prev, title: true }))
									}
									placeholder="Summary of the problem"
									maxLength={120}
									className={cn(
										TICKET_FIELD_CLASS,
										touched.title && errors.title && "border-red/60!",
									)}
								/>
							</FormField>
							<FormField
								label="Category"
								htmlFor="ticket-category"
								required
								error={touched.category ? errors.category : null}
							>
								<SelectField
									id="ticket-category"
									value={category}
									onChange={setCategory}
									onBlur={() =>
										setTouched((prev) => ({ ...prev, category: true }))
									}
									options={categoryOptions}
									placeholder={
										lane ? "Choose a category" : "Pick a request type first"
									}
									error={Boolean(touched.category && errors.category)}
									disabled={!lane}
								/>
							</FormField>
						</div>

						{lane === "engineering" ? (
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<FormField
									label="Affected service"
									htmlFor="ticket-module"
									hint="optional"
								>
									<SelectField
										id="ticket-module"
										value={affectedModule}
										onChange={setAffectedModule}
										options={TICKET_MODULES}
										placeholder="Where does this happen?"
									/>
								</FormField>
							</div>
						) : null}

						<Separator className="bg-slate-200/70" />

						{lane === "help" ? (
							<div>
								<p className="mb-1 text-sm font-medium text-slate-700">
									Priority <RequiredMark />
								</p>
								<p className="mb-3 text-xs text-slate-600">
									How soon do you need this handled?
								</p>
								<PillGroup
									label="Priority"
									value={helpPriority}
									onChange={(value) => {
										setHelpPriority(value);
										setTouched((prev) => ({ ...prev, impact: true }));
									}}
									options={TICKET_URGENCY_LEVELS}
									activeClasses={URGENCY_PILL_ACTIVE}
									error={touched.impact ? errors.impact : null}
								/>
								<p
									className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600"
									aria-live="polite"
								>
									{helpPriorityLabel ? (
										<>
											<strong className="font-semibold text-[#0f5384]">
												{helpPriorityLabel}
											</strong>{" "}
											— {HELP_PRIORITY_HINTS[helpPriority]}
										</>
									) : null}
								</p>
							</div>
						) : lane === "engineering" ? (
							<div>
								<p className="mb-1 text-sm font-medium text-slate-700">
									How much is this affecting people? <RequiredMark />
								</p>
								<p className="mb-3 text-xs text-slate-600">
									We use this to set severity and response time; no need to
									guess a priority level yourself.
								</p>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<PillGroup
										label="Who's affected"
										value={impact}
										onChange={(value) => {
											setImpact(value);
											setTouched((prev) => ({ ...prev, impact: true }));
										}}
										options={TICKET_IMPACT_LEVELS}
										error={touched.impact ? errors.impact : null}
									/>
									<PillGroup
										label="How urgent"
										value={urgency}
										onChange={(value) => {
											setUrgency(value);
											setTouched((prev) => ({ ...prev, urgency: true }));
										}}
										options={TICKET_URGENCY_LEVELS}
										activeClasses={URGENCY_PILL_ACTIVE}
										error={touched.urgency ? errors.urgency : null}
									/>
								</div>
								<div aria-live="polite">
									{derived ? (
										<p
											className={cn(
												"mt-4 flex items-center gap-2 rounded-md border px-3 py-2 text-xs",
												SEVERITY_BANNER[derived.severity],
											)}
										>
											<Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
											<span>
												<strong className="font-semibold">
													{derived.badgeTitle}
												</strong>{" "}
												— Engineering will respond within {derived.slaLabel}.
											</span>
										</p>
									) : null}
								</div>
							</div>
						) : null}

						<Separator className="bg-slate-200/70" />

						{lane === "engineering" ? (
							<div className="space-y-6">
								<FormField
									label="Reproduction steps"
									htmlFor="ticket-steps"
									required
									hint="at least 2"
									error={touched.steps ? errors.steps : null}
								>
									<div className="space-y-2">
										{reproSteps.map((step, index) => (
											<div
												key={index}
												className="group flex items-center gap-2"
											>
												<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue/10 text-xs font-semibold text-[#0f5384]">
													{index + 1}
												</span>
												<Input
													id={index === 0 ? "ticket-steps" : undefined}
													aria-label={`Step ${index + 1}`}
													value={step}
													onChange={(event) =>
														setReproSteps((prev) =>
															prev.map((item, i) =>
																i === index ? event.target.value : item,
															),
														)
													}
													onBlur={() =>
														setTouched((prev) => ({ ...prev, steps: true }))
													}
													placeholder={
														index === 0
															? "First step…"
															: index === 1
																? "Second step…"
																: "Next step (optional)"
													}
													maxLength={500}
													className={cn(
														TICKET_FIELD_CLASS,
														touched.steps &&
															errors.steps &&
															index < 2 &&
															!step.trim() &&
															"border-red/60!",
													)}
												/>
												{reproSteps.length > 2 ? (
													<button
														type="button"
														onClick={() =>
															setReproSteps((prev) =>
																prev.filter((_, i) => i !== index),
															)
														}
														className="shrink-0 cursor-pointer rounded p-0.5 text-slate-500 opacity-0 transition-opacity duration-200 hover:text-slate-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 group-hover:opacity-100"
														aria-label={`Remove step ${index + 1}`}
													>
														<X className="h-4 w-4" aria-hidden />
													</button>
												) : null}
											</div>
										))}
										{reproSteps.length < MAX_STEPS ? (
											<button
												type="button"
												onClick={() => setReproSteps((prev) => [...prev, ""])}
												className="cursor-pointer text-xs font-medium text-[#078FAB] hover:text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
											>
												+ Add step
											</button>
										) : null}
									</div>
								</FormField>

								<FormField
									label="Expected behavior"
									htmlFor="ticket-expected"
									required
									error={touched.expected ? errors.expected : null}
									trailing={
										<span className="text-xs text-slate-500">
											{expected.length}/{MAX_DESC}
										</span>
									}
								>
									<Textarea
										id="ticket-expected"
										value={expected}
										onChange={(event) =>
											setExpected(event.target.value.slice(0, MAX_DESC))
										}
										onBlur={() =>
											setTouched((prev) => ({ ...prev, expected: true }))
										}
										placeholder="What should have happened?"
										rows={3}
										className={cn(
											"min-h-24 resize-y",
											TICKET_FIELD_CLASS,
											touched.expected && errors.expected && "border-red/60!",
										)}
									/>
								</FormField>

								<FormField
									label="Actual behavior"
									htmlFor="ticket-actual"
									required
									error={touched.actual ? errors.actual : null}
									trailing={
										<span className="text-xs text-slate-500">
											{actual.length}/{MAX_DESC}
										</span>
									}
								>
									<Textarea
										id="ticket-actual"
										value={actual}
										onChange={(event) =>
											setActual(event.target.value.slice(0, MAX_DESC))
										}
										onBlur={() =>
											setTouched((prev) => ({ ...prev, actual: true }))
										}
										placeholder="What happened instead?"
										rows={3}
										className={cn(
											"min-h-24 resize-y",
											TICKET_FIELD_CLASS,
											touched.actual && errors.actual && "border-red/60!",
										)}
									/>
								</FormField>

								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<FormField
										label="OS"
										htmlFor="ticket-os"
										required
										error={touched.os ? errors.os : null}
									>
										<SelectField
											id="ticket-os"
											value={os}
											onChange={(value) => setOs(value as BugReportOs)}
											onBlur={() =>
												setTouched((prev) => ({ ...prev, os: true }))
											}
											options={BUG_REPORT_OS}
											placeholder="Choose an operating system"
											error={Boolean(touched.os && errors.os)}
										/>
									</FormField>
									<FormField
										label="Environment"
										htmlFor="ticket-environment"
										required
										error={touched.environment ? errors.environment : null}
									>
										<SelectField
											id="ticket-environment"
											value={environment}
											onChange={(value) =>
												setEnvironment(value as BugReportEnvironment)
											}
											onBlur={() =>
												setTouched((prev) => ({ ...prev, environment: true }))
											}
											options={BUG_REPORT_ENVIRONMENTS}
											placeholder="Where did you see this?"
											error={Boolean(touched.environment && errors.environment)}
										/>
									</FormField>
								</div>

								<div>
									<p className="mb-2 text-sm font-medium text-slate-700">
										Confirmations <RequiredMark />
									</p>
									<div className="space-y-2">
										<label
											className={cn(
												CONFIRM_CARD,
												searchedExisting && CONFIRM_CARD_CHECKED,
											)}
										>
											<Checkbox
												className="mt-0.5"
												checked={searchedExisting}
												onCheckedChange={(checked) => {
													setSearchedExisting(checked === true);
													setTouched((prev) => ({
														...prev,
														confirmations: true,
													}));
												}}
												aria-label={BUG_CONFIRM_SEARCHED}
											/>
											<span>{BUG_CONFIRM_SEARCHED}</span>
										</label>
										<label
											className={cn(
												CONFIRM_CARD,
												isBug && CONFIRM_CARD_CHECKED,
											)}
										>
											<Checkbox
												className="mt-0.5"
												checked={isBug}
												onCheckedChange={(checked) => {
													setIsBug(checked === true);
													setTouched((prev) => ({
														...prev,
														confirmations: true,
													}));
												}}
												aria-label={BUG_CONFIRM_IS_BUG}
											/>
											<span>{BUG_CONFIRM_IS_BUG}</span>
										</label>
									</div>
									{touched.confirmations && errors.confirmations ? (
										<p className="mt-1 text-xs text-red">
											{errors.confirmations}
										</p>
									) : null}
								</div>
							</div>
						) : (
							<FormField
								label="Description"
								htmlFor="ticket-description"
								required
								error={touched.description ? errors.description : null}
								trailing={
									<span className="text-xs text-slate-500">
										{description.length}/{MAX_DESC}
									</span>
								}
							>
								<Textarea
									id="ticket-description"
									value={description}
									onChange={(event) =>
										setDescription(event.target.value.slice(0, MAX_DESC))
									}
									onBlur={() =>
										setTouched((prev) => ({ ...prev, description: true }))
									}
									placeholder="What happened? What did you expect instead? Steps to reproduce, if any."
									rows={5}
									className={cn(
										"min-h-32 resize-y",
										TICKET_FIELD_CLASS,
										touched.description &&
											errors.description &&
											"border-red/60!",
									)}
								/>
							</FormField>
						)}
						<div className="space-y-6">
							<Separator className="bg-slate-200/70" />
						</div>
						<ProblemPageUrlField
							id="ticket-problem-page-url"
							value={problemPageUrl}
							onChange={setProblemPageUrl}
							onBlur={() =>
								setTouched((prev) => ({ ...prev, problemPageUrl: true }))
							}
							error={touched.problemPageUrl ? errors.problemPageUrl : null}
							currentPathname={pathname || "/tickets/new"}
							confirm={{
								dirty: pageUrlDirty,
								justUpdated: pageJustUpdated,
								onUpdate: updateProblemPage,
							}}
						/>

						<div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-stretch gap-4 max-[720px]:grid-cols-1">
							<FormField
								label="Show us the problem"
								hint="optional"
								className="h-full"
							>
								<TicketVideoRecorder
									problemPageUrl={confirmedPageUrl}
									onBeforeNavigate={persistFormDraft}
									disabled={submitting}
								/>
							</FormField>

							<FormField label="Attachments" hint="optional" className="h-full">
								<div
									role="button"
									tabIndex={0}
									onKeyDown={(event) => {
										if (event.key === "Enter" || event.key === " ") {
											event.preventDefault();
											fileInputRef.current?.click();
										}
									}}
									onDragOver={(event) => {
										event.preventDefault();
										setDragOver(true);
									}}
									onDragLeave={() => setDragOver(false)}
									onDrop={(event) => {
										event.preventDefault();
										setDragOver(false);
										if (event.dataTransfer.files?.length) {
											addFiles(event.dataTransfer.files);
										}
									}}
									onClick={() => fileInputRef.current?.click()}
									className={cn(
										"flex h-full min-h-40 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed px-4 py-7 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
										dragOver
											? "border-[#0f5384] bg-blue/5"
											: "border-slate-200 hover:border-blue-300 hover:bg-blue/5",
									)}
								>
									<Upload
										className="h-5 w-5 text-slate-600"
										strokeWidth={1.5}
										aria-hidden
									/>
									<p className="text-sm text-slate-700">
										Drop files here, or click to browse
									</p>
									<p className="text-xs text-slate-500">
										{getEnterpriseFormatHint("ticketAttachment")} — up to 10 MB
										each (max {MAX_FILES} files)
									</p>
									<input
										ref={fileInputRef}
										type="file"
										multiple
										accept={getEnterpriseInputAccept("ticketAttachment")}
										className="hidden"
										onChange={(event) => {
											if (event.target.files?.length) {
												addFiles(event.target.files);
											}
											event.target.value = "";
										}}
									/>
								</div>

								{fileError ? (
									<p className="mt-2 text-xs text-red">{fileError}</p>
								) : null}

								{attachments.length > 0 ? (
									<ul className="mt-3 space-y-1.5">
										{attachments.map((entry) => (
											<li
												key={entry.id}
												className="flex items-center gap-2 rounded-md border border-slate-200/60 bg-white/65 px-3 py-2 text-sm"
											>
												<FileText
													className="h-4 w-4 shrink-0 text-slate-600"
													aria-hidden
												/>
												<span className="truncate text-slate-700">
													{entry.file.name}
												</span>
												<span className="shrink-0 text-xs text-slate-500">
													{formatFileSize(entry.file.size)}
												</span>
												<button
													type="button"
													onClick={() => removeFile(entry.id)}
													className="ml-auto shrink-0 cursor-pointer rounded p-0.5 text-slate-500 transition-colors duration-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
													aria-label={`Remove ${entry.file.name}`}
												>
													<X className="h-4 w-4" aria-hidden />
												</button>
											</li>
										))}
									</ul>
								) : null}
							</FormField>
						</div>

						{showValidationBanner ? (
							<div
								role="alert"
								className="flex items-start gap-2 rounded-md border border-red/20 bg-red/10 px-3 py-2 text-sm text-red"
							>
								<AlertTriangle
									className="mt-0.5 h-4 w-4 shrink-0"
									aria-hidden
								/>
								<span>
									Please fill in all required fields before submitting.
								</span>
							</div>
						) : null}

						{error ? (
							<div
								role="alert"
								className="flex items-start gap-2 rounded-md border border-red/20 bg-red/10 px-3 py-2 text-sm text-red"
							>
								<AlertTriangle
									className="mt-0.5 h-4 w-4 shrink-0"
									aria-hidden
								/>
								<span>{error}</span>
							</div>
						) : null}

						{showSubmitProgress ? (
							<SubmitProgressIndicator
								progress={submitProgress}
								label="Submitting ticket…"
								successLabel="Ticket submitted successfully"
							/>
						) : null}

						<div className="flex justify-end gap-2 pt-6">
							<Button
								type="button"
								variant="ghost"
								className="rounded-full px-3 py-1.5 h-[1.65rem] justify-center text-slate-400 hover:text-slate-600 hover:bg-black/[.04]"
								onClick={cancelForm}
								disabled={submitting}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								className="primary-btn w-full px-3 sm:w-auto sm:px-4"
								disabled={submitting}
							>
								<Send className="h-4 w-4" aria-hidden />
								{submitting ? "Submitting…" : "Submit ticket"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			{submittedTicket ? (
				<TicketSubmittedConfirmDialog
					open={confirmOpen}
					ticketNumber={displayTicketNumber(submittedTicket)}
					ticketId={submittedTicket.$id}
					lane={submittedTicket.lane}
					onOpenChange={setConfirmOpen}
				/>
			) : null}
		</div>
	);
}
