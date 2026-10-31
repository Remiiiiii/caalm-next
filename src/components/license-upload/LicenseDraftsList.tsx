/**
 * Drafts list screen, reached from the "Saved drafts" row on the
 * Select License Type screen. Mirrors ContractUploadForm.tsx's drafts-list
 * screen exactly (same card layout, inline delete confirm, progress bar).
 */

"use client";

import { ChevronLeft, FolderOpen, StepForward, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getLicenseTypeConfig } from "@/lib/licenses/licenseTypeConfigs";
import { cn } from "@/lib/utils";
import type { Draft } from "./types";

const TYPE_SELECT_LABEL =
	"mb-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400";
const TYPE_SELECT_ICON_TILE =
	"flex shrink-0 items-center justify-center rounded-[9px] border border-[#0f5384]/[.12] bg-[#0f5384]/[.07]";
const GHOST_BTN_CLASS =
	"inline-flex h-[34px] cursor-pointer items-center rounded-full px-3 text-[12.5px] font-semibold text-slate-400 transition-colors duration-200 hover:bg-black/[.04] hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078fab]";
const DRAFT_DELETE_BTN_CLASS =
	"inline-flex h-7 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] border-[#dc2626]/[.22] bg-[#dc2626]/[.06] px-3 text-xs font-semibold text-[#dc2626] transition-[background-color,border-color,box-shadow] duration-200 hover:border-[#dc2626]/35 hover:bg-[#dc2626]/[.12] hover:shadow-[0_2px_8px_rgba(220,38,38,0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dc2626]";

export interface LicenseDraftsListProps {
	drafts: Draft[];
	onBack: () => void;
	onResumeDraft: (draft: Draft) => void;
	onDeleteDraft: (draftId: string) => Promise<boolean>;
}

export default function LicenseDraftsList({
	drafts,
	onBack,
	onResumeDraft,
	onDeleteDraft,
}: LicenseDraftsListProps) {
	const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
	const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);

	return (
		<div className="flex flex-col overflow-hidden bg-transparent">
			{/* Header: Back shares a row with the dialog's close button */}
			<div className="shrink-0 border-b border-slate-200 px-6 pb-4 pt-4 pr-12">
				<div className="mb-2 flex h-8 items-center">
					<button
						type="button"
						onClick={() => {
							setDraftToDelete(null);
							onBack();
						}}
						className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-slate-400 transition-colors duration-200 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078fab]"
					>
						<ChevronLeft className="h-[15px] w-[15px]" aria-hidden />
						Back
					</button>
				</div>
				<div className="flex items-center gap-2.5">
					<div
						className={cn(TYPE_SELECT_ICON_TILE, "h-[34px] w-[34px] bg-white")}
					>
						<FolderOpen
							className="h-[17px] w-[17px] text-[#0f5384]"
							aria-hidden
						/>
					</div>
					<h2
						id="drafts-title"
						className="text-[17px] font-bold leading-tight tracking-tight text-[#0f5384]"
					>
						Drafts
					</h2>
				</div>
				<p className="mt-1 pl-11 text-[12.5px] leading-normal text-slate-500">
					Resume a saved upload or delete drafts you no longer need.
				</p>
			</div>

			<div className="max-h-[60vh] overflow-y-auto px-[22px] pb-3 pt-[18px]">
				{drafts.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-2.5 py-10 text-center">
						<div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#0f5384]/10 bg-white">
							<FolderOpen className="h-5 w-5 text-[#0f5384]" aria-hidden />
						</div>
						<p className="text-[13.5px] font-semibold text-slate-700">
							No saved drafts
						</p>
						<p className="max-w-[280px] text-xs leading-normal text-slate-500">
							Drafts you save during an upload will appear here so you can pick
							up where you left off.
						</p>
					</div>
				) : (
					<>
						<p className={TYPE_SELECT_LABEL}>
							{drafts.length === 1
								? "1 saved draft"
								: `${drafts.length} saved drafts`}
						</p>
						{drafts.map((draft) => {
							const formData =
								typeof draft.formData === "string"
									? JSON.parse(draft.formData)
									: draft.formData;
							const typeConfig = getLicenseTypeConfig(formData?.licenseTypeId);
							const stepTitles = typeConfig
								? [
										"Upload File",
										...typeConfig.steps.map((s) => s.title),
										"Review",
									]
								: [];
							const stepLabel =
								stepTitles[draft.currentStep - 1] ||
								`Step ${draft.currentStep}`;
							const pct = Math.max(
								0,
								Math.min(100, Number(draft.progressPercentage) || 0),
							);
							const confirming = draftToDelete === draft.$id;
							const removing = deletingDraftId === draft.$id;
							return (
								<div
									key={draft.$id}
									className={cn(
										"mb-2.5 overflow-hidden rounded-xl border-[1.5px] border-slate-200 bg-white/80 p-4 transition-[border-color,box-shadow,opacity,max-height,margin,padding] duration-200",
										"hover:border-[#078fab]/30 hover:shadow-[0_2px_12px_rgba(7,143,171,0.08)]",
										removing
											? "pointer-events-none mb-0 max-h-0 border-transparent p-0 opacity-0"
											: "max-h-80",
									)}
								>
									<div className="mb-2.5 min-w-0">
										<p className="truncate text-[13.5px] font-bold text-slate-700">
											{formData?.licenseName || "Untitled License"}
										</p>
										<p className="mt-0.5 text-[11.5px] text-slate-500">
											{typeConfig?.label ? (
												<>
													{typeConfig.label}
													<span className="mx-1.5 text-slate-300" aria-hidden>
														·
													</span>
												</>
											) : null}
											Step {draft.currentStep}: {stepLabel}
										</p>
										<p className="mt-0.5 text-[11px] text-slate-400">
											Saved{" "}
											{new Date(draft.lastSavedAt).toLocaleDateString("en-US")}
										</p>
									</div>
									<div className="flex flex-wrap items-center gap-2.5">
										<span
											className={cn(
												"whitespace-nowrap rounded-full border px-[9px] py-[3px] text-[11px] font-semibold",
												pct < 50
													? "border-[#078fab]/20 bg-[#078fab]/10 text-[#078fab]"
													: pct < 75
														? "border-[#0e638f]/20 bg-[#0e638f]/10 text-[#0e638f]"
														: "border-[#0f5384]/20 bg-[#0f5384]/10 text-[#0f5384]",
											)}
										>
											{pct}% Complete
										</span>
										<div
											className="h-[3px] min-w-[60px] flex-1 overflow-hidden rounded-full bg-slate-100"
											role="progressbar"
											aria-valuenow={pct}
											aria-valuemin={0}
											aria-valuemax={100}
											aria-label="Draft completion"
										>
											<div
												className="h-full rounded-full bg-[linear-gradient(90deg,#00c1cb,#078fab,#0e638f)] transition-[width] duration-300"
												style={{ width: `${pct}%` }}
											/>
										</div>
										{confirming ? (
											<div className="flex shrink-0 items-center gap-2">
												<span className="text-[12.5px] font-semibold text-[#dc2626]">
													Delete this draft?
												</span>
												<button
													type="button"
													onClick={() => setDraftToDelete(null)}
													className={GHOST_BTN_CLASS}
												>
													Cancel
												</button>
												<button
													type="button"
													onClick={async () => {
														setDraftToDelete(null);
														setDeletingDraftId(draft.$id);
														await new Promise((resolve) =>
															setTimeout(resolve, 200),
														);
														await onDeleteDraft(draft.$id);
														setDeletingDraftId(null);
													}}
													className={DRAFT_DELETE_BTN_CLASS}
												>
													Confirm Delete
												</button>
											</div>
										) : (
											<div className="flex shrink-0 items-center gap-1.5">
												<button
													type="button"
													onClick={() => setDraftToDelete(draft.$id)}
													aria-label="Delete draft"
													title="Delete draft"
													className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors duration-200 hover:bg-[#dc2626]/[.08] hover:text-[#dc2626] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dc2626]"
												>
													<Trash2 className="h-4 w-4" aria-hidden />
												</button>
												<Button
													type="button"
													size="sm"
													onClick={() => void onResumeDraft(draft)}
													className="btn-primary gap-1.5 text-xs"
												>
													<StepForward className="h-3 w-3" />
													Resume
												</Button>
											</div>
										)}
									</div>
								</div>
							);
						})}
					</>
				)}
			</div>
		</div>
	);
}
