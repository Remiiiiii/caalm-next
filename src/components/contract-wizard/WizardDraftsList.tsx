"use client";

import { AlertTriangle, Ban, FileText, Loader2, Trash2 } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { SearchField } from "@/components/ui/search-field";
import {
	draftAgreementLabel,
	draftDisplayNameFromSummary,
	draftEditedAtFromSummary,
	draftProgressFromSummary,
	isEmptyWizardDraftSummary,
	sortDraftSummariesByEdited,
} from "@/lib/templates/wizard-draft-meta";
import { cn } from "@/lib/utils";
import type { WizardSessionSummary } from "@/types/contract-templates";

type WizardDraftsListProps = {
	drafts: WizardSessionSummary[];
	loading?: boolean;
	onContinue: (draft: WizardSessionSummary) => void | Promise<void>;
	onDelete: (ids: string[]) => Promise<void>;
	onDeleteAllEmpty?: () => Promise<void>;
};

function progressBarClass(percent: number): string {
	if (percent >= 70) return "bg-green";
	if (percent >= 25) return "bg-orange";
	return "bg-slate-300";
}

export function WizardDraftsList({
	drafts,
	loading = false,
	onContinue,
	onDelete,
	onDeleteAllEmpty,
}: WizardDraftsListProps) {
	const [query, setQuery] = useState("");
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
	const [pendingDeleteAllEmpty, setPendingDeleteAllEmpty] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [resumingId, setResumingId] = useState<string | null>(null);
	const [selectMode, setSelectMode] = useState(false);

	const exitSelectMode = () => {
		setSelectMode(false);
		setSelected(new Set());
	};

	const sortedDrafts = useMemo(() => sortDraftSummariesByEdited(drafts), [drafts]);

	const visibleDrafts = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return sortedDrafts;
		return sortedDrafts.filter((draft) => {
			const name = draftDisplayNameFromSummary(draft).toLowerCase();
			const agreement = draftAgreementLabel(draft.blueprintId).toLowerCase();
			return name.includes(q) || agreement.includes(q);
		});
	}, [query, sortedDrafts]);

	const emptyDraftIds = useMemo(
		() => drafts.filter(isEmptyWizardDraftSummary).map((draft) => draft.$id),
		[drafts],
	);

	useEffect(() => {
		// #region agent log
		fetch("http://127.0.0.1:7246/ingest/851d37c7-2223-45c1-89c0-a79ca1139a1d", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Debug-Session-Id": "cb2714",
			},
			body: JSON.stringify({
				sessionId: "cb2714",
				hypothesisId: "H4",
				location: "WizardDraftsList.tsx:drafts-prop",
				message: "drafts prop changed",
				data: {
					draftsLength: drafts.length,
					emptyDraftCount: emptyDraftIds.length,
					draftIds: drafts.map((d) => d.$id),
				},
				timestamp: Date.now(),
			}),
		}).catch(() => {});
		// #endregion
	}, [drafts, emptyDraftIds.length]);

	const toggleSelected = (id: string, checked: boolean) => {
		setSelected((current) => {
			const next = new Set(current);
			if (checked) next.add(id);
			else next.delete(id);
			return next;
		});
	};

	const requestDelete = (ids: string[]) => {
		if (ids.length === 0) return;
		setPendingDeleteIds(ids);
	};

	const requestDeleteAllEmpty = () => {
		if (emptyDraftIds.length === 0) return;
		setPendingDeleteAllEmpty(true);
	};

	const confirmDelete = async () => {
		if (pendingDeleteIds.length === 0 && !pendingDeleteAllEmpty) return;
		// #region agent log
		fetch("http://127.0.0.1:7246/ingest/851d37c7-2223-45c1-89c0-a79ca1139a1d", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Debug-Session-Id": "cb2714",
			},
			body: JSON.stringify({
				sessionId: "cb2714",
				hypothesisId: "H3",
				location: "WizardDraftsList.tsx:confirmDelete",
				message: "confirm delete empty/selected drafts",
				data: {
					pendingDeleteIds,
					pendingDeleteAllEmpty,
					draftsLengthBefore: drafts.length,
					emptyDraftCount: emptyDraftIds.length,
				},
				timestamp: Date.now(),
				runId: "post-fix",
			}),
		}).catch(() => {});
		// #endregion
		setDeleting(true);
		try {
			if (pendingDeleteAllEmpty && onDeleteAllEmpty) {
				await onDeleteAllEmpty();
			} else {
				await onDelete(pendingDeleteIds);
				setSelected((current) => {
					const next = new Set(current);
					for (const id of pendingDeleteIds) next.delete(id);
					return next;
				});
			}
		} finally {
			setDeleting(false);
			setPendingDeleteIds([]);
			setPendingDeleteAllEmpty(false);
			if (selectMode) exitSelectMode();
		}
	};

	const deleteCount = pendingDeleteAllEmpty
		? emptyDraftIds.length
		: pendingDeleteIds.length;
	const deleteDialogOpen =
		pendingDeleteIds.length > 0 || pendingDeleteAllEmpty;
	const selectedCount = selected.size;

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
				<SearchField
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Search drafts"
					containerClassName="min-w-0 flex-1"
				/>
				{!loading && drafts.length > 0 && (
					<Button
						type="button"
						variant="ghost"
						className="h-10 shrink-0 cursor-pointer px-3 text-sm text-[#0f5384] hover:bg-transparent hover:text-[#0f5384] sm:px-4"
						onClick={() => {
							if (selectMode) exitSelectMode();
							else setSelectMode(true);
						}}
					>
						{selectMode ? "Cancel" : "Select"}
					</Button>
				)}
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
				{loading ? (
					<div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-slate-600">
						<Loader2 className="h-4 w-4 animate-spin text-[#0f5384]" />
						Loading drafts...
					</div>
				) : visibleDrafts.length === 0 ? (
					<p className="px-6 py-8 text-sm text-slate-600">
						{drafts.length === 0
							? "No saved drafts yet. Choose an agreement to start one."
							: "No drafts match that search."}
					</p>
				) : (
					<ul className="divide-y divide-slate-200">
						{visibleDrafts.map((draft) => {
							const name = draftDisplayNameFromSummary(draft);
							const agreement = draftAgreementLabel(draft.blueprintId);
							const edited = draftEditedAtFromSummary(draft);
							const progress = draftProgressFromSummary(draft);
							const isSelected = selected.has(draft.$id);
							const isResuming = resumingId === draft.$id;
							const showProgressBar = progress.label !== "Not started";

							return (
								<li
									key={draft.$id}
									className={cn(
										"flex items-center gap-3 px-4 py-3 transition-colors duration-200 sm:px-6",
										isSelected ? "bg-blue/5" : "hover:bg-blue/5",
									)}
								>
									{selectMode && (
										<Checkbox
											checked={isSelected}
											onCheckedChange={(checked) =>
												toggleSelected(draft.$id, checked === true)
											}
											onClick={(event) => event.stopPropagation()}
											aria-label={`Select ${name}`}
											className="border-[0.25px] border-slate-300"
										/>
									)}
									<button
										type="button"
										disabled={isResuming}
										className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 disabled:cursor-wait disabled:opacity-70"
										onClick={() => {
											if (selectMode) {
												toggleSelected(draft.$id, !isSelected);
												return;
											}
											setResumingId(draft.$id);
											void Promise.resolve(onContinue(draft)).finally(() => {
												setResumingId((current) =>
													current === draft.$id ? null : current,
												);
											});
										}}
									>
										<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue/10">
											<FileText className="h-4 w-4 text-[#0f5384]" />
										</span>
										<span className="min-w-0 flex-1">
											<span className="block truncate text-sm font-medium text-slate-700">
												{name}
											</span>
											<span className="mt-0.5 block truncate text-xs text-slate-500">
												{agreement}
											</span>
										</span>
										<span className="mr-6 flex w-24 shrink-0 flex-col items-center gap-1 sm:mr-10 sm:w-28">
											{showProgressBar ? (
												<span className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
													<span
														className={cn(
															"block h-full rounded-full transition-all duration-200",
															progressBarClass(progress.percent),
														)}
														style={{ width: `${progress.percent}%` }}
													/>
												</span>
											) : null}
											<span className="text-xs text-slate-500 tabular-nums">
												{progress.label}
											</span>
										</span>
									</button>
									<span className="shrink-0 text-xs text-slate-500 tabular-nums">
										{edited}
									</span>
									{!selectMode && (
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="h-8 w-8 shrink-0 cursor-pointer rounded-full text-slate-500 hover:bg-white/30 hover:text-red"
											aria-label={`Delete ${name}`}
											onClick={(event) => {
												event.stopPropagation();
												requestDelete([draft.$id]);
											}}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									)}
								</li>
							);
						})}
					</ul>
				)}
			</div>

			{(emptyDraftIds.length > 0 || (selectMode && selectedCount > 0)) && (
				<div className="flex flex-wrap items-center gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
					{emptyDraftIds.length > 0 && !selectMode && onDeleteAllEmpty && (
						<Button
							type="button"
							variant="ghost"
							className="h-auto cursor-pointer px-0 text-sm text-red hover:bg-transparent hover:text-red"
							onClick={requestDeleteAllEmpty}
						>
							Delete all empty drafts ({emptyDraftIds.length})
						</Button>
					)}
					{selectMode && selectedCount > 0 && (
						<Button
							type="button"
							variant="outline"
							className="cursor-pointer border-red/20 px-3 text-red hover:bg-red/10 hover:text-red sm:px-4"
							onClick={() => requestDelete([...selected])}
						>
							<Trash2 className="h-4 w-4" />
							Delete selected ({selectedCount})
						</Button>
					)}
				</div>
			)}

			<Dialog
				open={deleteDialogOpen}
				onOpenChange={(open) => {
					if (!open && !deleting) {
						setPendingDeleteIds([]);
						setPendingDeleteAllEmpty(false);
					}
				}}
			>
				<DialogContent
					className="gap-0 overflow-hidden border border-slate-200 p-0 shadow-xl sm:max-w-md"
					variant="destructive"
				>
					<DialogTitle className="sr-only">
						Delete draft{deleteCount === 1 ? "" : "s"}
					</DialogTitle>
					<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />

					<div className="mt-4 border-b border-slate-200 bg-white px-6 py-4">
						<div className="flex items-center gap-2">
							<AlertTriangle className="h-5 w-5 shrink-0 text-[#f7d333]" />
							<h2 className="text-base font-semibold sidebar-gradient-text">
								Delete draft{deleteCount === 1 ? "" : "s"}
							</h2>
						</div>
						<p className="mt-1 ml-7 text-sm text-slate-600">
							{deleteCount === 1
								? "Are you sure you want to delete this draft? This action cannot be undone."
								: `Are you sure you want to delete ${deleteCount} drafts? This action cannot be undone.`}
						</p>
					</div>

					<div className="space-y-3 bg-white px-6 py-5">
						<p className="text-sm text-slate-600">
							{deleteCount === 1
								? "This will permanently remove the draft from your saved work."
								: "This will permanently remove the selected drafts from your saved work."}
						</p>
						<p className="text-xs font-medium text-slate-500">
							This action is permanent.
						</p>
					</div>

					<div className="flex items-center justify-center gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
						<Button
							type="button"
							variant="ghost"
							disabled={deleting}
							className="primary-btn gap-2 px-3 sm:px-4"
							onClick={() => setPendingDeleteIds([])}
						>
							<Ban className="h-4 w-4 shrink-0" />
							Cancel
						</Button>
						<Button
							type="button"
							disabled={deleting}
							className="delete-btn gap-2 px-3 sm:px-4"
							onClick={() => void confirmDelete()}
						>
							<Trash2 className="h-4 w-4 shrink-0" />
							{deleting
								? "Deleting..."
								: deleteCount === 1
									? "Delete draft"
									: "Delete drafts"}
							{deleting && (
								<Loader2 className="h-4 w-4 shrink-0 animate-spin" />
							)}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
