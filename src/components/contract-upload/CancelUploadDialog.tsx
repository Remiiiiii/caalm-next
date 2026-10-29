"use client";

import {
	Loader2,
	PenLine,
	Save,
	SquareArrowRightExit,
	TriangleAlert,
	X,
} from "lucide-react";
import { useState } from "react";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const PILL =
	"inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[12.5px] font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078fab] disabled:pointer-events-none disabled:opacity-50";
const GHOST = `${PILL} px-3 text-slate-400 hover:bg-black/[.04] hover:text-slate-600`;
const SECONDARY = `${PILL} border-[1.5px] border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
/** Keep editing, Save & exit and Exit share this size and weight. */
const ACTION = `${SECONDARY} btn-primary`;

/**
 * Confirm shown when the upload wizard is closed on a form step.
 * `hasUnsavedChanges` picks the variant: warn and offer Save & exit, or reassure
 * that the draft is already saved.
 */
export function CancelUploadDialog({
	open,
	hasUnsavedChanges,
	canSave,
	onKeepEditing,
	onExit,
	onSaveAndExit,
}: {
	open: boolean;
	hasUnsavedChanges: boolean;
	/** False on step 1, where nothing can be saved yet. */
	canSave: boolean;
	onKeepEditing: () => void;
	/** Leave the wizard without saving (the draft, if any, is left as it is). */
	onExit: () => void;
	/** Save the draft; resolves true when it was saved and the wizard closed. */
	onSaveAndExit: () => Promise<boolean>;
}) {
	const [saving, setSaving] = useState(false);

	const handleSave = async () => {
		setSaving(true);
		try {
			await onSaveAndExit();
		} finally {
			setSaving(false);
		}
	};

	return (
		<AlertDialog
			open={open}
			onOpenChange={(next) => {
				if (!next && !saving) onKeepEditing();
			}}
		>
			<AlertDialogContent
				className="max-w-[420px] gap-0 p-0 sm:max-w-[420px] sm:p-0"
				onOpenAutoFocus={(event) => {
					// Land on the safe choice, not the destructive one.
					event.preventDefault();
					(event.currentTarget as HTMLElement)
						.querySelector<HTMLElement>("[data-keep-editing]")
						?.focus();
				}}
				aria-busy={saving || undefined}
			>
				<div className="flex items-start gap-3 px-[22px] pt-[22px] pb-4">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#0f5384]/15 bg-white text-[#0f5384]">
						<TriangleAlert className="h-5 w-5" aria-hidden />
					</div>
					<div className="min-w-0 flex-1 pt-0.5">
						<AlertDialogTitle className="text-[17px] font-bold leading-tight text-[#0f5384]">
							Cancel form?
						</AlertDialogTitle>
						<AlertDialogDescription className="mt-0.5 text-[13px] text-slate-500">
							{hasUnsavedChanges
								? "Unsaved progress will be lost."
								: "Your draft has been saved."}
						</AlertDialogDescription>
					</div>
					<button
						type="button"
						aria-label="Close"
						disabled={saving}
						onClick={onKeepEditing}
						className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors duration-200 hover:bg-black/[.05] hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-[#078fab] disabled:opacity-50"
					>
						<X className="h-4 w-4" aria-hidden />
					</button>
				</div>

				<div className="border-t border-slate-200" />

				<div className="px-[22px] py-4 text-[13.5px] leading-relaxed text-slate-600">
					{hasUnsavedChanges ? (
						<>
							<p>
								You have unsaved changes on this step. Canceling now will
								discard them.
							</p>
							{canSave ? (
								<div className="mt-3 flex items-start gap-2 rounded-[10px] border border-[#078fab]/20 bg-[#078fab]/[.07] px-3 py-2.5 text-[12.5px] text-slate-600">
									<Save
										className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#078fab]"
										aria-hidden
									/>
									<span>
										Use <strong>Save Progress</strong> in the form footer to
										preserve your work before leaving.
									</span>
								</div>
							) : null}
						</>
					) : (
						<p>
							Your progress is saved. You can return to this draft from the
							Contracts list at any time.
						</p>
					)}
				</div>
				<div className="flex items-center justify-between px-[22px] pt-3.5 pb-[18px]">
					<div>
						{hasUnsavedChanges ? (
							<button
								type="button"
								className={GHOST}
								disabled={saving}
								onClick={onExit}
							>
								Discard &amp; exit
							</button>
						) : null}
					</div>
					<div className="flex items-center gap-2">
						<AlertDialogCancel
							data-keep-editing
							className={cn(ACTION, "mt-0")}
							disabled={saving}
							onClick={onKeepEditing}
						>
							<PenLine className="h-4 w-4" />
							Keep editing
						</AlertDialogCancel>
						{hasUnsavedChanges ? (
							canSave ? (
								<button
									type="button"
									className={ACTION}
									disabled={saving}
									aria-busy={saving}
									onClick={() => void handleSave()}
								>
									{saving ? (
										<Loader2 className="h-4 w-4 animate-spin" aria-hidden />
									) : (
										<Save className="h-4 w-4" aria-hidden />
									)}
									{saving ? "Saving…" : "Save & exit"}
								</button>
							) : null
						) : (
							<button type="button" className={ACTION} onClick={onExit}>
								<SquareArrowRightExit className="h-4 w-4" />
								Exit
							</button>
						)}
					</div>
				</div>
			</AlertDialogContent>
		</AlertDialog>
	);
}
