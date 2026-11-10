"use client";

import { Info, Loader2, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useId, useMemo, useRef, useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { useOptionalStepUp } from "@/contexts/StepUpContext";
import {
	confirmingLabelFromPending,
	factValueToText,
	mapConfirmFactsToSummaryRows,
	orderSummaryRows,
	type StepUpSummaryRow,
	type StepUpTone,
} from "@/lib/auth/step-up-prompt";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export type ConfirmDialogSummaryRow = StepUpSummaryRow;

export interface ConfirmDialogFact {
	label: string;
	value: ReactNode;
}

interface ConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	icon: ReactNode;
	confirmIcon?: ReactNode;
	title: string;
	/** One or two sentences. Prefer bold for the single irreversibility phrase. */
	description: ReactNode;
	/** Preferred summary API from the confirm-intent spec. */
	summaryRows?: ConfirmDialogSummaryRow[];
	/** @deprecated Prefer `summaryRows`. Mapped when `summaryRows` is omitted. */
	facts?: ConfirmDialogFact[];
	/** Extra muted copy under the summary. Not an amber warning band. */
	helperText?: ReactNode;
	/**
	 * @deprecated Amber warning bands are not used. Content renders as muted
	 * helper text under the summary so older call sites keep their copy.
	 */
	note?: ReactNode;
	/** Short left-footer hint. Defaults by tone / step-up. */
	footerNote?: ReactNode;
	confirmLabel: string;
	cancelLabel?: string;
	showCancel?: boolean;
	tone?: StepUpTone;
	/** @deprecated Prefer `tone`. `destructive` maps to `danger`. */
	variant?: "default" | "destructive";
	pendingLabel?: string;
	/** Defaults to true for danger tone. */
	requireStepUp?: boolean;
	onConfirm: () => Promise<void>;
}

/** Unambiguous confirm dates: `9 Nov 2026` (never `11/9/2026`). */
export function formatConfirmDate(
	value: string | Date | null | undefined,
): string | null {
	if (value == null || value === "") return null;
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return date.toLocaleDateString("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

function factsToSummaryRows(
	facts: ConfirmDialogFact[] | undefined,
): ConfirmDialogSummaryRow[] {
	if (!facts?.length) return [];
	const rows: ConfirmDialogSummaryRow[] = [];
	for (const fact of facts) {
		const value =
			typeof fact.value === "string" || typeof fact.value === "number"
				? factValueToText(fact.value)
				: factValueToText(
						typeof fact.value === "boolean" ? null : String(fact.value ?? ""),
					);
		if (!value) continue;
		rows.push({ label: fact.label, value });
	}
	if (rows.length === 0) return [];
	return orderSummaryRows([{ ...rows[0], lead: true }, ...rows.slice(1)]);
}

function defaultFooterNote(params: {
	needsStepUp: boolean;
	isDanger: boolean;
}): string {
	if (params.needsStepUp) {
		return "You'll enter a verification code next.";
	}
	if (params.isDanger) {
		return "Nothing changes until you confirm.";
	}
	return "Review the details, then confirm.";
}

export function ConfirmDialog({
	open,
	onOpenChange,
	icon,
	confirmIcon,
	title,
	description,
	summaryRows,
	facts,
	helperText,
	note,
	footerNote,
	confirmLabel,
	cancelLabel = "Cancel",
	showCancel = true,
	tone,
	variant = "default",
	pendingLabel,
	requireStepUp,
	onConfirm,
}: ConfirmDialogProps) {
	const [saving, setSaving] = useState(false);
	const [verifying, setVerifying] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const inFlightRef = useRef(false);
	const statusId = useId();
	const descriptionId = useId();
	const resolvedTone: StepUpTone =
		tone ?? (variant === "destructive" ? "danger" : "brand");
	const isDanger = resolvedTone === "danger";
	const stepUp = useOptionalStepUp();
	const needsStepUp = requireStepUp ?? isDanger;
	const busy = saving || verifying;

	const rows = useMemo(() => {
		if (summaryRows) return orderSummaryRows(summaryRows);
		return factsToSummaryRows(facts);
	}, [summaryRows, facts]);

	const descriptionText =
		typeof description === "string" ? description : undefined;

	const resolvedFooterNote =
		footerNote ?? defaultFooterNote({ needsStepUp, isDanger });

	const handleConfirm = async () => {
		if (busy || inFlightRef.current) return;
		inFlightRef.current = true;
		setError(null);
		try {
			if (needsStepUp) {
				if (!stepUp) {
					throw new Error("Verification is required before this action.");
				}
				setVerifying(true);
				const verified = await stepUp.ensureStepUp({
					tone: resolvedTone,
					icon,
					title,
					description: descriptionText,
					confirmLabel,
					confirmingLabel: confirmingLabelFromPending(pendingLabel),
					summaryRows:
						rows.length > 0
							? rows
							: mapConfirmFactsToSummaryRows({
									confirmLabel,
									facts,
								}),
				});
				setVerifying(false);
				if (!verified) return;
			}
			setSaving(true);
			await onConfirm();
			onOpenChange(false);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Something went wrong. Try again.",
			);
		} finally {
			inFlightRef.current = false;
			setVerifying(false);
			setSaving(false);
		}
	};

	const handleOpenChange = (next: boolean) => {
		if (busy) return;
		if (!next) setError(null);
		onOpenChange(next);
	};

	const busyLabel = pendingLabel ?? (isDanger ? "Deleting…" : "Saving…");
	const underSummary = note ?? helperText;

	return (
		<AppDialog
			open={open}
			onOpenChange={handleOpenChange}
			icon={icon}
			title={title}
			description={description}
			descriptionId={descriptionId}
			variant={isDanger ? "destructive" : "default"}
			size="form"
			pending={busy}
			footerClassName="justify-between gap-3 border-t border-slate-200 bg-slate-50"
			footer={
				<>
					<p className="flex min-w-0 flex-1 items-start gap-1 text-[10.5px] leading-snug text-slate-400">
						<Info
							className="mt-0.5 h-3 w-3 shrink-0 text-slate-500"
							aria-hidden
						/>
						{resolvedFooterNote}
					</p>
					<div className="flex shrink-0 items-center gap-2.5">
						{showCancel ? (
							<Button
								type="button"
								variant="ghost"
								className="h-[1.65rem] justify-center rounded-full px-3 py-1.5 text-slate-400 hover:bg-black/[.04] hover:text-slate-600"
								disabled={busy}
								autoFocus={isDanger}
								onClick={() => handleOpenChange(false)}
							>
								{cancelLabel}
							</Button>
						) : null}
						<Button
							type="button"
							className={isDanger ? "delete-btn" : "btn-primary"}
							disabled={busy}
							aria-busy={saving}
							onClick={() => void handleConfirm()}
						>
							{saving ? (
								<Loader2 className="h-4 w-4 animate-spin" aria-hidden />
							) : (
								(confirmIcon ?? null)
							)}
							{saving ? busyLabel : confirmLabel}
						</Button>
					</div>
				</>
			}
		>
			{(rows.length > 0 || underSummary || error || saving) && (
				<div className="flex flex-col gap-4 py-4">
					{rows.length > 0 ? (
						<dl className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
							{rows.map((row) => (
								<div
									key={`${row.label}-${row.value}`}
									className={cn(
										"grid grid-cols-[5.5rem_1fr] items-center gap-3 px-4 py-2.5 text-xs",
										row.lead && "bg-slate-100",
									)}
								>
									<dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
										{row.label}
									</dt>
									<dd
										className={cn(
											"truncate text-right",
											row.lead
												? "font-semibold text-slate-700"
												: "text-slate-600",
										)}
									>
										{row.value}
									</dd>
								</div>
							))}
						</dl>
					) : null}

					{underSummary ? (
						<p className="text-center text-[11px] text-slate-500">
							{underSummary}
						</p>
					) : null}

					<div
						className="flex min-h-[30px] items-center justify-center px-1"
						aria-live="polite"
						role={error ? "alert" : undefined}
					>
						{error ? (
							<p className="flex items-center gap-1.5 text-center text-xs text-red">
								<TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
								{error}
							</p>
						) : null}
					</div>

					{saving ? (
						<p id={statusId} role="status" className="sr-only">
							{busyLabel}
						</p>
					) : null}
				</div>
			)}
		</AppDialog>
	);
}
