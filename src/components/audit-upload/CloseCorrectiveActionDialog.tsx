"use client";

import {
	AlertCircle,
	AlertTriangle,
	ClipboardCheck,
	SaveCheck,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CapEvidenceStrip } from "@/components/audit-upload/CapEvidenceStrip";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { requiresCloseEvidence } from "@/lib/audit-upload/caps";
import type {
	AuditCapEvidenceAttachment,
	AuditCapRecord,
	AuditSeverity,
} from "@/lib/audit-upload/types";
import { cn } from "@/lib/utils";

const MIN_HIGH_CHARS = 20;

const META_LABEL =
	"text-[10px] font-semibold uppercase tracking-wide text-slate-500";

export function CloseCorrectiveActionDialog({
	open,
	onOpenChange,
	cap,
	severity,
	busy = false,
	onSubmit,
	onAttachmentsChange,
	onViewAllAttachments,
	initialNotes,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	cap: AuditCapRecord | null;
	severity: AuditSeverity;
	busy?: boolean;
	/** Prefill from Ask CAALM or a staged draft when the dialog opens. */
	initialNotes?: string;
	onSubmit: (notes: string) => Promise<void> | void;
	onAttachmentsChange?: (attachments: AuditCapEvidenceAttachment[]) => void;
	/** Overflow tile: leave dialog and open the finding’s corrective action section. */
	onViewAllAttachments?: () => void;
}) {
	const [notes, setNotes] = useState("");
	const [touchedInvalid, setTouchedInvalid] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const needsStrict = requiresCloseEvidence(severity);
	const trimmed = notes.trim();
	const meetsMin = needsStrict
		? trimmed.length >= MIN_HIGH_CHARS
		: trimmed.length >= 1;
	const showError =
		touchedInvalid && !meetsMin && (trimmed.length === 0 || needsStrict);

	const helperId = "close-cap-helper";
	const errorId = "close-cap-error";
	const countId = "close-cap-count";

	useEffect(() => {
		if (!open) {
			setNotes("");
			setTouchedInvalid(false);
			setSubmitting(false);
			return;
		}
		setNotes(initialNotes?.trim() ?? "");
		setTouchedInvalid(false);
		const timer = window.setTimeout(() => textareaRef.current?.focus(), 50);
		return () => window.clearTimeout(timer);
	}, [open, initialNotes]);

	const charCountLabel = useMemo(() => {
		if (!needsStrict) return null;
		return `${trimmed.length} / ${MIN_HIGH_CHARS} min`;
	}, [needsStrict, trimmed.length]);

	const saveDisabled = busy || submitting || !meetsMin;

	const handleSave = async () => {
		if (!meetsMin) {
			setTouchedInvalid(true);
			textareaRef.current?.focus();
			return;
		}
		setSubmitting(true);
		try {
			await onSubmit(trimmed);
			onOpenChange(false);
		} finally {
			setSubmitting(false);
		}
	};

	const attachments = cap?.evidenceAttachments ?? [];

	return (
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			size="form"
			pending={busy || submitting}
			icon={<ClipboardCheck className="h-5 w-5 text-[#078fab]" aria-hidden />}
			title="Close corrective action"
			description="Document what was done and confirm the fix is in place."
			footer={
				<>
					<Button
						type="button"
						variant="ghost"
						className="h-[1.65rem] justify-center rounded-full px-3 py-1.5 text-slate-400 hover:bg-black/[.04] hover:text-slate-600"
						disabled={busy || submitting}
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						className="btn-primary px-3 sm:px-4"
						disabled={saveDisabled}
						onClick={() => void handleSave()}
					>
						<SaveCheck className="h-4 w-4" />
						Save & close
					</Button>
				</>
			}
		>
			<div className="space-y-4 py-4">
				{needsStrict ? (
					<div
						role="alert"
						aria-live="polite"
						className="flex items-start gap-2 rounded-lg border border-orange/20 bg-orange/10 p-3"
					>
						<AlertTriangle
							className="mt-0.5 h-4 w-4 shrink-0 text-orange"
							aria-hidden
						/>
						<p className="text-sm text-slate-700">
							<span className="font-bold text-orange">
								Verification notes required
							</span>{" "}
							— This is a high-severity finding. You must describe the
							corrective steps taken before this action can be closed.
						</p>
					</div>
				) : null}

				<div className="space-y-1.5">
					<label htmlFor="close-cap-notes" className={META_LABEL}>
						Verification notes <span className="text-red">*</span>
					</label>
					<p
						id={helperId}
						className="text-[13px] leading-normal text-slate-500"
					>
						Describe the corrective steps taken and any supporting documentation
						or evidence.
					</p>
					<Textarea
						ref={textareaRef}
						id="close-cap-notes"
						value={notes}
						onChange={(event) => {
							const next = event.target.value;
							setNotes(next);
							if (touchedInvalid && next.trim().length === 0) {
								setTouchedInvalid(true);
							}
						}}
						onBlur={() => {
							if (notes.length > 0 && notes.trim().length === 0) {
								setTouchedInvalid(true);
							}
						}}
						aria-required="true"
						aria-invalid={showError || undefined}
						aria-describedby={
							showError
								? `${helperId} ${errorId}`
								: needsStrict
									? `${helperId} ${countId}`
									: helperId
						}
						placeholder="e.g. Award mapping corrected in accounting system; amended FAC filing submitted Oct 14, 2026."
						className={cn(
							"min-h-[96px] resize-y border-[0.25px] border-slate-300 bg-white text-[13px] text-slate-700",
							"focus-visible:border-[#078fab] focus-visible:ring-2 focus-visible:ring-[#078fab]/20",
							showError &&
								"border-red focus-visible:border-red focus-visible:ring-red/20",
						)}
					/>
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0 flex-1">
							{showError ? (
								<p
									id={errorId}
									role="alert"
									className="flex items-center gap-1.5 text-[13px] font-medium text-red"
								>
									<AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
									Verification notes are required to close this finding.
								</p>
							) : null}
						</div>
						{charCountLabel ? (
							<p
								id={countId}
								aria-live="polite"
								className={cn(
									"shrink-0 text-xs tabular-nums",
									trimmed.length > 0 && trimmed.length < MIN_HIGH_CHARS
										? "text-orange"
										: "text-slate-400",
								)}
							>
								{charCountLabel}
							</p>
						) : null}
					</div>
				</div>

				{cap ? (
					<div className="space-y-1.5">
						<p className={META_LABEL}>Evidence attachments</p>
						<p className="text-[13px] leading-normal text-slate-500">
							Click a file to preview. Use View all to open the Corrective
							action section and add or manage files there.
						</p>
						<CapEvidenceStrip
							capId={cap.$id}
							attachments={attachments}
							canUpload={false}
							canDelete
							size="md"
							layout="compact"
							maxFiles={10}
							compactFileSlots={3}
							onUploaded={onAttachmentsChange}
							onDeleted={onAttachmentsChange}
							onViewAll={() => {
								onOpenChange(false);
								onViewAllAttachments?.();
							}}
						/>
					</div>
				) : null}
			</div>
		</AppDialog>
	);
}
