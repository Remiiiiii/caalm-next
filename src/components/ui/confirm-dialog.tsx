"use client";

import { Loader2, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useId, useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "./button";

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
	description: string;
	facts?: ConfirmDialogFact[];
	helperText?: ReactNode;
	note?: ReactNode;
	confirmLabel: string;
	cancelLabel?: string;
	showCancel?: boolean;
	variant?: "default" | "destructive";
	pendingLabel?: string;
	onConfirm: () => Promise<void>;
}

export function ConfirmDialog({
	open,
	onOpenChange,
	icon,
	confirmIcon,
	title,
	description,
	facts,
	helperText,
	note,
	confirmLabel,
	cancelLabel = "Cancel",
	showCancel = true,
	variant = "default",
	pendingLabel,
	onConfirm,
}: ConfirmDialogProps) {
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const statusId = useId();
	const isDestructive = variant === "destructive";

	const handleConfirm = async () => {
		if (saving) return;
		setSaving(true);
		setError(null);
		try {
			await onConfirm();
			onOpenChange(false);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Something went wrong. Try again.",
			);
		} finally {
			setSaving(false);
		}
	};

	const handleOpenChange = (next: boolean) => {
		if (saving) return;
		if (!next) setError(null);
		onOpenChange(next);
	};

	const busyLabel =
		pendingLabel ?? (isDestructive ? "Deleting…" : "Saving…");

	return (
		<AppDialog
			open={open}
			onOpenChange={handleOpenChange}
			icon={icon}
			title={title}
			description={description}
			variant={variant}
			pending={saving}
			footer={
				<>
					{showCancel ? (
						<Button
							type="button"
							variant="ghost"
							className="rounded-full px-3 py-1.5 h-[1.65rem] justify-center text-slate-400 hover:text-slate-600 hover:bg-black/[.04]"
							disabled={saving}
							autoFocus={isDestructive}
							onClick={() => handleOpenChange(false)}
						>
							{cancelLabel}
						</Button>
					) : null}
					<Button
						type="button"
						className={isDestructive ? "delete-btn" : "btn-primary"}
						disabled={saving}
						aria-busy={saving}
						onClick={() => void handleConfirm()}
					>
						{saving ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							(confirmIcon ?? null)
						)}
						{saving ? busyLabel : confirmLabel}
					</Button>
				</>
			}
		>
			{facts?.length || helperText || note || error || saving ? (
				<div className="flex flex-col gap-3 pb-1">
					{facts && facts.length > 0 ? (
						<div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
							{facts.map((row) => (
								<div
									key={row.label}
									className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
								>
									<span className="text-slate-500">{row.label}</span>
									<span className="text-right font-medium text-slate-700">
										{row.value}
									</span>
								</div>
							))}
						</div>
					) : null}
					{note ? (
						<div className="flex items-start gap-2 rounded-lg border border-orange/20 bg-orange/5 px-4 py-2.5 text-sm text-orange">
							<TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
							<span>{note}</span>
						</div>
					) : null}
					{helperText ? (
						<div className="text-sm text-slate-500">{helperText}</div>
					) : null}
					{saving ? (
						<p id={statusId} role="status" className="sr-only">
							{busyLabel}
						</p>
					) : null}
					{error ? (
						<p
							role="alert"
							className="flex items-center gap-1.5 text-sm text-red"
						>
							<TriangleAlert className="h-4 w-4 shrink-0" />
							{error}
						</p>
					) : null}
				</div>
			) : null}
		</AppDialog>
	);
}
