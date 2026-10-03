"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceToNow } from "date-fns";
import {
	ExternalLink,
	Eye,
	FileText,
	GripVertical,
	Heart,
	KeyRound,
	Loader2,
	Plus,
	Send,
	Share2,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DonationPageShareCard } from "@/components/settings/DonationPageShareCard";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageIndex } from "@/components/ui/page-index";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PERMISSIONS } from "@/constants/permissions";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type {
	DonationPageConfigDraft,
	DonationPageConfigPayload,
	DonationPageConfigPublished,
	DonationPageConfigVersion,
} from "@/lib/give/donation-page-config/types";
import {
	MAX_SUGGESTED_AMOUNTS,
	validateDonationPageConfigPayload,
} from "@/lib/give/donation-page-config/validation";
import {
	resolvePublicImpactStatement,
	toPublicDonationPageConfig,
} from "@/lib/give/public-donation-config";
import { slugifyGiveSlug } from "@/lib/give/slug";
import {
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/lib/ui/data-table-styles";
import { cn } from "@/lib/utils";

/** Form column was 420px; +20% ≈ 504px */
const FORM_COLUMN_CLASS = "w-full max-w-[504px] shrink-0 space-y-4";
const VERSION_HISTORY_PAGE_SIZE = 12;

function payloadFromDraft(
	draft: DonationPageConfigDraft,
): DonationPageConfigPayload {
	return JSON.parse(JSON.stringify(draft.payload)) as DonationPageConfigPayload;
}

function dollarsFromCents(cents: number): string {
	return String(cents / 100);
}

function centsFromDollars(value: string): number {
	const n = Number(value);
	if (!Number.isFinite(n)) return 0;
	return Math.round(n * 100);
}

function isPayloadSaveable(payload: DonationPageConfigPayload): boolean {
	try {
		validateDonationPageConfigPayload(payload);
		return true;
	} catch {
		return false;
	}
}

type DonationPageSettingsClientProps = {
	orgName?: string;
	/** Public give page slug (`/give/{slug}`). Falls back to a slugified org name. */
	giveSlug?: string;
};

function SortableDesignationRow({
	id,
	label,
	canEdit,
	canRemove,
	onLabelChange,
	onRemove,
}: {
	id: string;
	label: string;
	canEdit: boolean;
	canRemove: boolean;
	onLabelChange: (value: string) => void;
	onRemove: () => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id, disabled: !canEdit });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				"flex min-w-0 items-center gap-2",
				isDragging && "opacity-60",
			)}
		>
			{canEdit ? (
				<button
					type="button"
					className="cursor-grab rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#0f5384] active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
					aria-label="Drag to reorder designation"
					title="Drag to reorder"
					{...attributes}
					{...listeners}
				>
					<GripVertical className="h-4 w-4" />
				</button>
			) : (
				<GripVertical className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
			)}
			<Input
				className="min-w-0 flex-1 border-[0.25px] border-slate-300"
				value={label}
				disabled={!canEdit}
				onChange={(e) => onLabelChange(e.target.value)}
			/>
			{canEdit && canRemove ? (
				<button
					type="button"
					className="cursor-pointer rounded-full p-1 text-slate-400 transition-colors hover:bg-white/30 hover:text-slate-600"
					aria-label="Remove designation"
					onClick={onRemove}
				>
					<X className="h-4 w-4" />
				</button>
			) : null}
		</div>
	);
}

function DonationLivePreview({
	orgName,
	payload,
}: {
	orgName: string;
	payload: DonationPageConfigPayload;
}) {
	const amounts = payload.amountsCents.length
		? payload.amountsCents
		: [2500, 5000, 10000, 25000];
	const [selectedCents, setSelectedCents] = useState(amounts[0] ?? 2500);
	const [frequency, setFrequency] = useState<"one_time" | "monthly">(
		"one_time",
	);
	const [designationIndex, setDesignationIndex] = useState(0);

	useEffect(() => {
		if (!amounts.includes(selectedCents)) {
			setSelectedCents(amounts[0] ?? 2500);
		}
	}, [amounts, selectedCents]);

	useEffect(() => {
		if (designationIndex >= payload.designations.length) {
			setDesignationIndex(0);
		}
	}, [payload.designations.length, designationIndex]);

	const showMonthly = payload.frequencyOptions.includes("monthly");
	const showOneTime = payload.frequencyOptions.includes("one_time");
	const dollars = selectedCents / 100;
	const publicConfig = toPublicDonationPageConfig(payload);
	const impactLine = resolvePublicImpactStatement(
		publicConfig,
		Number.isFinite(dollars) && dollars > 0 ? dollars : amounts[0] / 100,
	);
	const legalText =
		payload.legalText?.trim() ||
		"Your gift may be tax-deductible to the extent allowed by law. No goods or services were provided in exchange for this contribution.";

	return (
		<div className="sticky top-4 space-y-4">
			<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
				<span className="mr-1.5 inline-block size-1.5 rounded-full bg-green align-middle" />
				Live preview — updates as you type
			</p>

			{/* Donation widget */}
			<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
				<h3 className="mt-3 text-xl font-semibold leading-snug sidebar-gradient-text">
					Give to {orgName}
				</h3>

				{showOneTime && showMonthly ? (
					<div
						className="relative mt-4 grid grid-cols-2 items-center rounded-full border border-slate-200 bg-slate-100 p-1"
						role="tablist"
						aria-label="Donation frequency preview"
					>
						<span
							aria-hidden
							className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out"
							style={{
								width: "calc(50% - 0.25rem)",
								transform:
									frequency === "one_time"
										? "translateX(0)"
										: "translateX(100%)",
							}}
						/>
						<button
							type="button"
							role="tab"
							aria-selected={frequency === "one_time"}
							onClick={() => setFrequency("one_time")}
							className={cn(
								"relative z-10 cursor-pointer rounded-full py-1.5 text-sm font-medium transition-colors",
								frequency === "one_time"
									? "text-[#0f5384]"
									: "text-slate-500 hover:text-slate-700",
							)}
						>
							One-time
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={frequency === "monthly"}
							onClick={() => setFrequency("monthly")}
							className={cn(
								"relative z-10 cursor-pointer rounded-full py-1.5 text-sm font-medium transition-colors",
								frequency === "monthly"
									? "text-[#0f5384]"
									: "text-slate-500 hover:text-slate-700",
							)}
						>
							Monthly
						</button>
					</div>
				) : null}

				<p className="mt-4 text-sm font-medium text-slate-700">
					Choose an amount
				</p>
				<div
					className={cn(
						"mt-2 grid gap-2",
						amounts.length <= 4 ? "grid-cols-4" : "grid-cols-3",
					)}
				>
					{amounts.map((cents) => {
						const selected = cents === selectedCents;
						return (
							<button
								key={cents}
								type="button"
								aria-pressed={selected}
								onClick={() => setSelectedCents(cents)}
								className={cn(
									"cursor-pointer rounded-xl border px-1 py-2.5 text-sm font-semibold tabular-nums transition-all duration-200",
									selected
										? "border-[#0f5384] bg-[#0f5384] text-white shadow-sm"
										: "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50",
								)}
							>
								${cents / 100}
							</button>
						);
					})}
				</div>

				{payload.designations.length > 0 ? (
					<div className="mt-4 space-y-1.5">
						<p className="text-sm font-medium text-slate-700">
							Designate your gift
						</p>
						<select
							className="h-10 w-full rounded-md border-[0.25px] border-slate-300 bg-white px-3 text-sm text-slate-700 hover:border-blue-300 focus-visible:border-[#078FAB] focus-visible:outline-none"
							value={designationIndex}
							onChange={(e) => setDesignationIndex(Number(e.target.value))}
							aria-label="Fund designation preview"
						>
							{payload.designations.map((label, index) => (
								<option key={`${label}-${index}`} value={index}>
									{label.trim() || `Fund ${index + 1}`}
								</option>
							))}
						</select>
					</div>
				) : null}

				<div className="mt-5 flex justify-end">
					<button
						type="button"
						className="btn-primary px-3 sm:px-4"
						tabIndex={-1}
					>
						<Heart className="h-4 w-4" />
						Donate ${Number.isFinite(dollars) ? dollars : 0}
						{frequency === "monthly" ? "/mo" : ""}
					</button>
				</div>

				<p className="mt-4 text-center text-[11px] leading-relaxed text-slate-500">
					{legalText.length > 90 ? `${legalText.slice(0, 90)}…` : legalText}
				</p>
			</div>

			{/* Story cards (public left column) */}
			<div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
				<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
					Public page story
				</p>

				<div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm">
					<span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#00C1CB]/12">
						<FileText className="h-4 w-4 text-[#0f5384]" />
					</span>
					<p className="text-sm text-slate-600">
						<span className="font-semibold text-slate-700">{orgName}</span> is a
						501(c)(3) nonprofit. {legalText}
					</p>
				</div>

				<div className="relative overflow-hidden rounded-xl border border-[#0f5384]/20 bg-gradient-to-br from-[#0f5384] to-[#162768] p-5 text-left text-white shadow-md">
					<svg
						className="pointer-events-none absolute -left-12 -top-12 size-48 text-white/[0.07]"
						viewBox="0 0 100 100"
						aria-hidden
					>
						<circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" />
						<circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" />
						<circle cx="50" cy="50" r="24" fill="none" stroke="currentColor" />
					</svg>
					<p className="relative text-sm leading-relaxed">
						<span className="text-2xl font-bold tabular-nums text-white">
							$
							{Number.isFinite(dollars) && dollars > 0
								? dollars.toLocaleString("en-US")
								: "25"}
						</span>{" "}
						{impactLine}
					</p>
				</div>
			</div>
		</div>
	);
}

export function DonationPageSettingsClient({
	orgName = "your organization",
	giveSlug,
}: DonationPageSettingsClientProps) {
	const resolvedGiveSlug = useMemo(
		() => slugifyGiveSlug(giveSlug || orgName),
		[giveSlug, orgName],
	);
	const liveGivePath = resolvedGiveSlug
		? `/give/${encodeURIComponent(resolvedGiveSlug)}`
		: null;
	const { permissions } = usePermissions();
	const canEdit = permissions.includes(PERMISSIONS.DONATIONS.CONFIG_EDIT);
	const { toast } = useToast();

	const [draft, setDraft] = useState<DonationPageConfigDraft | null>(null);
	const [published, setPublished] =
		useState<DonationPageConfigPublished | null>(null);
	const [versions, setVersions] = useState<DonationPageConfigVersion[]>([]);
	const [payload, setPayload] = useState<DonationPageConfigPayload | null>(
		null,
	);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [publishing, setPublishing] = useState(false);
	const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
	const [activeAction, setActiveAction] = useState<
		"preview" | "publish" | "visit" | "share"
	>("preview");
	const [versionPage, setVersionPage] = useState(1);

	const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const draftVersionRef = useRef(0);
	const pendingPayloadRef = useRef<DonationPageConfigPayload | null>(null);
	const saveInFlightRef = useRef(false);
	const staleRetryRef = useRef(0);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const [draftRes, versionsRes] = await Promise.all([
				fetch("/api/give/donation-page-config/draft"),
				fetch("/api/give/donation-page-config/versions"),
			]);
			const draftJson = await draftRes.json();
			const versionsJson = await versionsRes.json();
			if (draftRes.ok) {
				setDraft(draftJson.draft);
				draftVersionRef.current = draftJson.draft?.version ?? 0;
				setPublished(draftJson.published ?? null);
				setPayload(payloadFromDraft(draftJson.draft));
				setLastSavedAt(draftJson.draft?.updatedAt ?? null);
			}
			if (versionsRes.ok) {
				setVersions(versionsJson.versions ?? []);
			}
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		return () => {
			if (saveTimer.current) clearTimeout(saveTimer.current);
		};
	}, []);

	const hasUnpublishedChanges = useMemo(() => {
		if (!draft || !payload) return false;
		// No live page yet — anything in draft is unpublished.
		if (!published) return true;
		// Compare config only. Draft updatedAt and publishedAt are different clocks
		// and must not drive the banner after a successful publish.
		return JSON.stringify(payload) !== JSON.stringify(published.payload);
	}, [draft, payload, published]);

	const versionTotalPages = Math.max(
		1,
		Math.ceil(versions.length / VERSION_HISTORY_PAGE_SIZE),
	);
	const pagedVersions = useMemo(() => {
		const page = Math.min(versionPage, versionTotalPages);
		const start = (page - 1) * VERSION_HISTORY_PAGE_SIZE;
		return versions.slice(start, start + VERSION_HISTORY_PAGE_SIZE);
	}, [versions, versionPage, versionTotalPages]);

	useEffect(() => {
		if (versionPage > versionTotalPages) {
			setVersionPage(versionTotalPages);
		}
	}, [versionPage, versionTotalPages]);

	const flushSave = useCallback(async () => {
		if (!canEdit || saveInFlightRef.current) return;
		const toSave = pendingPayloadRef.current;
		if (!toSave) return;
		if (!isPayloadSaveable(toSave)) return;

		pendingPayloadRef.current = null;
		const expectedVersion = draftVersionRef.current;
		saveInFlightRef.current = true;
		setSaving(true);
		try {
			const res = await fetch("/api/give/donation-page-config/draft", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					payload: { ...toSave, ein: "" },
					expectedVersion,
				}),
			});
			const json = await res.json();
			if (res.status === 409) {
				// Stale version from overlapping autosaves — refresh version only, keep local edits
				if (staleRetryRef.current >= 2) {
					staleRetryRef.current = 0;
					toast({
						title: "Could not save",
						description:
							"Draft is out of sync. Refresh the page and try again.",
						variant: "destructive",
					});
					return;
				}
				staleRetryRef.current += 1;
				const draftRes = await fetch("/api/give/donation-page-config/draft");
				const draftJson = await draftRes.json();
				if (draftRes.ok && draftJson.draft) {
					draftVersionRef.current = draftJson.draft.version;
					setDraft(draftJson.draft);
				}
				pendingPayloadRef.current = pendingPayloadRef.current ?? toSave;
				return;
			}
			if (!res.ok) {
				staleRetryRef.current = 0;
				toast({
					title: "Could not save",
					description: json.error ?? "Check your values and try again.",
					variant: "destructive",
				});
				return;
			}
			staleRetryRef.current = 0;
			draftVersionRef.current = json.draft.version;
			setDraft(json.draft);
			setLastSavedAt(json.draft.updatedAt);
			// Keep local edits if the user typed during the request
			if (!pendingPayloadRef.current) {
				setPayload(payloadFromDraft(json.draft));
			}
		} finally {
			saveInFlightRef.current = false;
			setSaving(false);
			if (pendingPayloadRef.current) {
				void flushSave();
			}
		}
	}, [canEdit, load, toast]);

	const scheduleSave = useCallback(
		(next: DonationPageConfigPayload) => {
			if (!canEdit) return;
			const cleaned = { ...next, ein: "" };
			// Skip autosave while amounts/designations are mid-edit invalid
			if (!isPayloadSaveable(cleaned)) return;
			pendingPayloadRef.current = cleaned;
			if (saveTimer.current) clearTimeout(saveTimer.current);
			saveTimer.current = setTimeout(() => {
				void flushSave();
			}, 800);
		},
		[canEdit, flushSave],
	);

	const updatePayload = (
		updater: (prev: DonationPageConfigPayload) => DonationPageConfigPayload,
	) => {
		if (!payload || !canEdit) return;
		const next = { ...updater(payload), ein: "" };
		setPayload(next);
		scheduleSave(next);
	};

	const designationIds = useMemo(
		() => (payload?.designations ?? []).map((_, index) => `des-${index}`),
		[payload?.designations],
	);

	function handleDesignationDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id || !payload) return;
		const oldIndex = Number(String(active.id).replace("des-", ""));
		const newIndex = Number(String(over.id).replace("des-", ""));
		if (
			!Number.isInteger(oldIndex) ||
			!Number.isInteger(newIndex) ||
			oldIndex < 0 ||
			newIndex < 0
		) {
			return;
		}
		updatePayload((prev) => ({
			...prev,
			designations: arrayMove(prev.designations, oldIndex, newIndex),
		}));
	}

	async function handlePublish() {
		if (!canEdit) return;
		setPublishing(true);
		try {
			// Flush any pending draft before publish
			if (pendingPayloadRef.current) {
				if (saveTimer.current) clearTimeout(saveTimer.current);
				await flushSave();
			}
			const res = await fetch("/api/give/donation-page-config/publish", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ changeSummary: "Published from settings" }),
			});
			const json = await res.json();
			if (!res.ok) {
				toast({
					title: "Publish failed",
					description: json.error ?? "Validation or server error",
					variant: "destructive",
				});
				return;
			}
			toast({
				title: "Published",
				description: "The live donation page was updated.",
			});
			await load();
		} finally {
			setPublishing(false);
		}
	}

	async function handlePreview() {
		const res = await fetch("/api/give/donation-page-config/preview", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		const json = await res.json();
		if (!res.ok || !json.previewUrl) {
			toast({
				title: "Preview unavailable",
				description: json.error ?? "Could not create preview link",
				variant: "destructive",
			});
			return;
		}
		window.open(json.previewUrl, "_blank", "noopener,noreferrer");
	}

	async function handleRevert(versionNumber: number) {
		if (!canEdit) return;
		const res = await fetch("/api/give/donation-page-config/revert", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ targetVersionNumber: versionNumber }),
		});
		const json = await res.json();
		if (!res.ok) {
			toast({
				title: "Revert failed",
				description: json.error ?? "Could not revert",
				variant: "destructive",
			});
			return;
		}
		toast({
			title: "Reverted",
			description: `Restored version ${versionNumber}.`,
		});
		await load();
	}

	if (loading || !payload) {
		return (
			<p className="flex items-center gap-2 text-sm text-slate-600">
				<Loader2 className="h-4 w-4 animate-spin text-[#0f5384]" />
				Loading donation page settings…
			</p>
		);
	}

	const lowestCents = payload.amountsCents[0];
	const lowestKey = lowestCents ? String(lowestCents) : "2500";

	return (
		<div className="space-y-4">
			{hasUnpublishedChanges ? (
				<div className="rounded-lg border border-orange/20 bg-orange/10 px-4 py-3 text-sm text-slate-700">
					You have unpublished changes
					{lastSavedAt ? (
						<>
							{" "}
							— last saved{" "}
							{formatDistanceToNow(new Date(lastSavedAt), { addSuffix: true })}
						</>
					) : null}
					{saving ? " (saving…)" : null}
				</div>
			) : null}

			<div className="flex flex-wrap items-center justify-end gap-3">
				{(() => {
					const actionTabs = [
						{ value: "preview" as const, label: "Preview draft", icon: Eye },
						{
							value: "publish" as const,
							label: "Publish changes",
							icon: publishing ? Loader2 : Send,
							disabled: !canEdit || publishing || !hasUnpublishedChanges,
							iconClassName: publishing ? "animate-spin" : undefined,
						},
						...(liveGivePath
							? [
									{
										value: "visit" as const,
										label: "Visit page",
										icon: ExternalLink,
									},
								]
							: []),
						...(resolvedGiveSlug
							? [
									{
										value: "share" as const,
										label: "Share page",
										icon: Share2,
									},
								]
							: []),
					];
					const selectedIndex = Math.max(
						0,
						actionTabs.findIndex((tab) => tab.value === activeAction),
					);
					const tabCount = actionTabs.length;

					return (
						<div
							role="tablist"
							aria-label="Donation page actions"
							className="relative inline-grid items-center rounded-full border border-slate-200 bg-slate-100 p-1"
							style={{
								gridTemplateColumns: `repeat(${tabCount}, minmax(0, 1fr))`,
							}}
						>
							{/* White active thumb — same as SegmentedToggle / image */}
							<span
								aria-hidden
								className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out"
								style={{
									width: `calc((100% - 0.5rem) / ${tabCount})`,
									transform: `translateX(${selectedIndex * 100}%)`,
								}}
							/>
							{actionTabs.map((tab) => {
								const selected = activeAction === tab.value;
								const disabled = Boolean(
									"disabled" in tab ? tab.disabled : false,
								);
								const Icon = tab.icon;
								return (
									<button
										key={tab.value}
										type="button"
										role="tab"
										aria-selected={selected}
										aria-label={tab.label}
										disabled={disabled}
										title={
											tab.value === "publish" && disabled
												? !canEdit
													? "Need donations.config.edit to publish"
													: !hasUnpublishedChanges
														? "No unpublished changes"
														: undefined
												: undefined
										}
										onClick={() => {
											if (disabled) return;
											setActiveAction(tab.value);
											if (tab.value === "preview") void handlePreview();
											if (tab.value === "publish") void handlePublish();
											if (tab.value === "visit" && liveGivePath) {
												window.open(
													liveGivePath,
													"_blank",
													"noopener,noreferrer",
												);
											}
										}}
										className={cn(
											"relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200",
											"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
											disabled
												? "cursor-not-allowed text-slate-400"
												: "cursor-pointer",
											!disabled && selected && "text-[#0f5384]",
											!disabled && !selected && "text-slate-500",
										)}
									>
										<Icon
											className={cn(
												"h-4 w-4 shrink-0",
												"iconClassName" in tab ? tab.iconClassName : undefined,
											)}
											aria-hidden
										/>
										<span className="truncate">{tab.label}</span>
									</button>
								);
							})}
						</div>
					);
				})()}
				{!canEdit ? (
					<span className="inline-flex items-center gap-1 text-xs text-slate-500">
						<KeyRound className="h-3.5 w-3.5" />
						View only — need donations.config.edit to publish
					</span>
				) : null}
			</div>

			{activeAction === "share" && resolvedGiveSlug ? (
				<DonationPageShareCard
					orgName={orgName}
					giveSlug={resolvedGiveSlug}
					isPublished={Boolean(published)}
				/>
			) : null}

			<div
				className={cn(
					"flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10",
					activeAction === "share" && "hidden",
				)}
			>
				<div className={FORM_COLUMN_CLASS}>
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="space-y-4 p-4 sm:p-5">
							<p className="text-sm font-medium sidebar-gradient-text">
								Suggested amounts
							</p>
							<div className="grid grid-cols-4 gap-2">
								{payload.amountsCents.map((cents, index) => (
									<div key={`amount-${index}`} className="relative min-w-0">
										<span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">
											$
										</span>
										<Input
											className="border-[0.25px] border-slate-300 pl-5! tabular-nums"
											value={dollarsFromCents(cents)}
											disabled={!canEdit}
											aria-label={`Suggested amount ${index + 1}`}
											onChange={(e) => {
												const nextCents = centsFromDollars(e.target.value);
												updatePayload((prev) => {
													const amounts = [...prev.amountsCents];
													amounts[index] = nextCents;
													return { ...prev, amountsCents: amounts };
												});
											}}
										/>
										{canEdit && payload.amountsCents.length > 1 ? (
											<button
												type="button"
												className="absolute -right-1 -top-1 cursor-pointer rounded-full bg-white p-0.5 text-slate-400 shadow-sm ring-1 ring-slate-200 hover:text-slate-600"
												aria-label="Remove amount"
												onClick={() =>
													updatePayload((prev) => ({
														...prev,
														amountsCents: prev.amountsCents.filter(
															(_, i) => i !== index,
														),
													}))
												}
											>
												<X className="h-3 w-3" />
											</button>
										) : null}
									</div>
								))}
							</div>
							{canEdit &&
							payload.amountsCents.length < MAX_SUGGESTED_AMOUNTS ? (
								<button
									type="button"
									className="cursor-pointer text-sm font-medium text-[#0f5384] hover:underline"
									onClick={() =>
										updatePayload((prev) => {
											const last =
												prev.amountsCents[prev.amountsCents.length - 1] ?? 2500;
											return {
												...prev,
												amountsCents: [...prev.amountsCents, last + 2500],
											};
										})
									}
								>
									<Plus className="mr-1 inline h-3.5 w-3.5" />
									Add amount
								</button>
							) : null}
						</CardContent>
					</Card>

					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="space-y-4 p-4 sm:p-5">
							<p className="text-sm font-medium sidebar-gradient-text">
								Fund designations
							</p>
							<DndContext
								sensors={sensors}
								collisionDetection={closestCenter}
								onDragEnd={handleDesignationDragEnd}
							>
								<SortableContext
									items={designationIds}
									strategy={verticalListSortingStrategy}
								>
									<div className="space-y-2">
										{payload.designations.map((label, index) => (
											<SortableDesignationRow
												key={designationIds[index]}
												id={designationIds[index]}
												label={label}
												canEdit={canEdit}
												canRemove={payload.designations.length > 1}
												onLabelChange={(value) =>
													updatePayload((prev) => {
														const designations = [...prev.designations];
														designations[index] = value;
														return { ...prev, designations };
													})
												}
												onRemove={() =>
													updatePayload((prev) => ({
														...prev,
														designations: prev.designations.filter(
															(_, i) => i !== index,
														),
													}))
												}
											/>
										))}
									</div>
								</SortableContext>
							</DndContext>
							{canEdit ? (
								<button
									type="button"
									className="cursor-pointer text-sm font-medium text-[#0f5384] hover:underline"
									onClick={() =>
										updatePayload((prev) => ({
											...prev,
											designations: [...prev.designations, "New fund"],
										}))
									}
								>
									<Plus className="mr-1 inline h-3.5 w-3.5" />
									Add designation
								</button>
							) : null}
						</CardContent>
					</Card>

					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="space-y-4 p-4 sm:p-5">
							<p className="text-sm font-medium sidebar-gradient-text">
								Organization & legal
							</p>
							<div className="space-y-1.5">
								<Label htmlFor="donation-impact">
									Impact statement (lowest amount)
								</Label>
								<Textarea
									id="donation-impact"
									className="min-h-[80px] w-full border-[0.25px] border-slate-300"
									value={payload.impactStatements[lowestKey] ?? ""}
									disabled={!canEdit}
									onChange={(e) =>
										updatePayload((prev) => ({
											...prev,
											impactStatements: {
												...prev.impactStatements,
												[lowestKey]: e.target.value,
											},
										}))
									}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="donation-legal">
									Tax-deductibility disclosure
								</Label>
								<Textarea
									id="donation-legal"
									className="min-h-[80px] w-full border-[0.25px] border-slate-300"
									value={payload.legalText}
									disabled={!canEdit}
									onChange={(e) =>
										updatePayload((prev) => ({
											...prev,
											legalText: e.target.value,
										}))
									}
								/>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="min-w-0 flex-1">
					<DonationLivePreview orgName={orgName} payload={payload} />
				</div>
			</div>

			{activeAction !== "share" ? (
				<Card className="glass-card w-full">
					<div className="glass-card-cap" />
					<CardContent className="space-y-4 p-4 sm:p-6">
						<p className="text-sm font-medium sidebar-gradient-text">
							Version history
						</p>
						{versions.length === 0 ? (
							<p className="text-sm italic text-slate-600">
								No published versions yet.
							</p>
						) : (
							<>
								<div className="w-full overflow-x-auto px-2 sm:px-4 pb-2">
									<Table className="border-separate border-spacing-0">
										<TableHeader className="[&_tr]:border-b-0">
											<TableRow className={DATA_TABLE_HEADER_ROW}>
												<TableHead
													className={`${DATA_TABLE_HEADER_CELL} pl-4 pr-3`}
												>
													Version
												</TableHead>
												<TableHead
													className={`${DATA_TABLE_HEADER_CELL} px-3`}
												>
													Status
												</TableHead>
												<TableHead
													className={`${DATA_TABLE_HEADER_CELL} px-3`}
												>
													Published by
												</TableHead>
												<TableHead
													className={`${DATA_TABLE_HEADER_CELL} px-3`}
												>
													Published
												</TableHead>
												<TableHead
													className={`${DATA_TABLE_HEADER_CELL} pl-3 pr-4 text-right`}
												>
													Actions
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody className="[&_tr:last-child>td]:border-b-0">
											{pagedVersions.map((v) => (
												<TableRow
													key={v.versionNumber}
													className={DATA_TABLE_BODY_ROW_BASE}
												>
													<TableCell className="py-4 pl-4 pr-3">
														<p className="font-medium text-slate-700">
															{v.changeSummary ||
																`Version ${v.versionNumber}`}
														</p>
														<p className="mt-0.5 text-xs text-slate-500 tabular-nums">
															v{v.versionNumber}
														</p>
													</TableCell>
													<TableCell className="px-3 py-4 whitespace-nowrap">
														{v.isLive ? (
															<span className="inline-block rounded-full border border-green/20 bg-green/10 px-2 py-0.5 text-xs font-medium text-green">
																Live
															</span>
														) : (
															<span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
																Previous
															</span>
														)}
													</TableCell>
													<TableCell className="px-3 py-4 text-slate-700">
														{v.publishedByName || "Unknown"}
													</TableCell>
													<TableCell className="px-3 py-4 whitespace-nowrap text-slate-600">
														{formatDistanceToNow(new Date(v.publishedAt), {
															addSuffix: true,
														})}
													</TableCell>
													<TableCell className="py-4 pl-3 pr-4 text-right">
														{canEdit && !v.isLive ? (
															<button
																type="button"
																className="cursor-pointer text-sm font-medium text-[#0f5384] hover:underline"
																onClick={() =>
																	void handleRevert(v.versionNumber)
																}
															>
																Revert
															</button>
														) : (
															<span className="text-slate-400">—</span>
														)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
								<PageIndex
									page={Math.min(versionPage, versionTotalPages)}
									totalItems={versions.length}
									pageSize={VERSION_HISTORY_PAGE_SIZE}
									onPageChange={setVersionPage}
									hideWhenSinglePage
									showRange
									itemLabel="versions"
								/>
							</>
						)}
					</CardContent>
				</Card>
			) : null}
		</div>
	);
}
