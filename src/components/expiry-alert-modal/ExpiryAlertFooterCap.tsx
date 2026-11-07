"use client";

import { ExternalLink, Pause, X } from "lucide-react";
import { Button } from "../ui/button";

type ExpiryAlertFooterCapProps = {
	nextLabel: string | null;
	countdownSeconds: number | null;
	paused: boolean;
	onPause: () => void;
	onDismissAll: () => void;
	/** File view open — swap "Dismiss all" for the workspace CTA. */
	fileViewOpen?: boolean;
	workspaceLabel?: string;
	onOpenInWorkspace?: () => void;
};

/**
 * Card footer cap — same idea as the uploaded-audits review footer
 * (`border-t` + slate wash, pinned under the body with matching bottom radius).
 */
export default function ExpiryAlertFooterCap({
	nextLabel,
	countdownSeconds,
	paused,
	onPause,
	onDismissAll,
	fileViewOpen = false,
	workspaceLabel = "Open in workspace",
	onOpenInWorkspace,
}: ExpiryAlertFooterCapProps) {
	const statusLine =
		countdownSeconds !== null && !paused && nextLabel
			? `Advancing to ${nextLabel} in ${countdownSeconds}s`
			: paused
				? "Auto-advance paused"
				: "";

	if (fileViewOpen && onOpenInWorkspace) {
		return (
			<div className="shrink-0 rounded-b-[26px] border-t border-slate-200/70 bg-slate-50/80 px-5 py-3">
				<div className="flex items-center gap-3">
					<p className="min-w-0 flex-1 text-xs leading-relaxed text-slate-500">
						Need the full workspace? We&apos;ll pause this alert queue so you
						can come back to the same item.
					</p>
					<Button
						type="button"
						onClick={onOpenInWorkspace}
						className="btn-primary shrink-0"
					>
						<ExternalLink className="h-3.5 w-3.5" />
						{workspaceLabel}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="shrink-0 rounded-b-[26px] border-t border-slate-200/70 bg-slate-50/80 px-5 py-3">
			<div className="flex items-center gap-3">
				<p className="min-w-0 flex-1 truncate text-sm text-slate-500">
					{statusLine}
				</p>
				<div className="flex shrink-0 items-center gap-2">
					{countdownSeconds !== null && !paused && (
						<button
							type="button"
							onClick={onPause}
							className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-blue-300 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
						>
							<Pause className="h-3.5 w-3.5" />
							Pause
						</button>
					)}
					<Button type="button" onClick={onDismissAll} className="btn-primary">
						<X className="h-3.5 w-3.5" />
						Dismiss all
					</Button>
				</div>
			</div>
		</div>
	);
}
