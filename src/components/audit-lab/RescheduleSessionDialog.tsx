"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/** `datetime-local` wants `YYYY-MM-DDTHH:mm` in the viewer's local time. */
function toDatetimeLocalValue(iso: string | undefined): string {
	if (!iso) return "";
	const ms = Date.parse(iso);
	if (Number.isNaN(ms)) return "";
	const date = new Date(ms);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function RescheduleSessionDialog({
	open,
	onOpenChange,
	sessionTitle,
	currentScheduledAt,
	onSubmit,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	sessionTitle: string;
	currentScheduledAt: string | undefined;
	onSubmit: (scheduledAt: string) => Promise<void>;
}) {
	const [scheduledAt, setScheduledAt] = useState("");
	const [busy, setBusy] = useState(false);

	// Re-seed from the target session each time the dialog opens.
	useEffect(() => {
		if (open) setScheduledAt(toDatetimeLocalValue(currentScheduledAt));
	}, [open, currentScheduledAt]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="glass-card max-w-md">
				<DialogHeader>
					<DialogTitle>Reschedule simulation</DialogTitle>
				</DialogHeader>
				<div className="space-y-2">
					<p className="text-sm text-slate-600">{sessionTitle}</p>
					<Input
						type="datetime-local"
						aria-label="New scheduled time"
						value={scheduledAt}
						onChange={(e) => setScheduledAt(e.target.value)}
					/>
				</div>
				<DialogFooter className="gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						className="btn-primary"
						disabled={busy || !scheduledAt}
						onClick={async () => {
							setBusy(true);
							try {
								await onSubmit(new Date(scheduledAt).toISOString());
								onOpenChange(false);
							} finally {
								setBusy(false);
							}
						}}
					>
						Save new time
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
