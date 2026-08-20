"use client";

import { Check, CheckCircle2, Copy, Ticket } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type TicketSubmittedConfirmDialogProps = {
	open: boolean;
	ticketNumber: string;
	ticketId: string;
	onOpenChange: (open: boolean) => void;
};

export function TicketSubmittedConfirmDialog({
	open,
	ticketNumber,
	ticketId: _ticketId,
	onOpenChange,
}: TicketSubmittedConfirmDialogProps) {
	const [copied, setCopied] = useState(false);

	const copyNumber = async () => {
		try {
			await navigator.clipboard.writeText(ticketNumber);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {
			setCopied(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[85vh] max-w-[420px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl">
				<div className="absolute top-0 right-0 left-0 h-3 rounded-t-md bg-[#d6d7d8] opacity-70" />

				<div className="sticky top-0 z-10 mt-3 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 py-3">
					<div className="flex items-center gap-2.5 px-5">
						<CheckCircle2 className="h-4 w-4 text-[#0f5384]" />
						<DialogTitle className="text-lg font-semibold sidebar-gradient-text">
							Ticket submitted
						</DialogTitle>
					</div>
					<div className="mt-1 ml-11 space-y-0.5 text-xs text-slate-600">
						<p>Save this number for follow-ups.</p>
						<p>We also emailed you a copy.</p>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto bg-slate-50 p-4">
					<div className="flex items-center gap-2 text-xs font-medium text-slate-600">
						<Ticket className="h-3.5 w-3.5 text-[#0f5384]" />
						Your ticket number
					</div>

					<div className="mt-2 flex items-stretch overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
						<p className="min-w-0 flex-1 px-3 py-2.5 font-mono text-base font-semibold tracking-wide text-slate-800">
							{ticketNumber}
						</p>
						<div className="w-px shrink-0 bg-slate-200" aria-hidden />
						<button
							type="button"
							onClick={() => void copyNumber()}
							className={cn(
								"flex shrink-0 items-center justify-center px-3 text-slate-600 transition-colors duration-200",
								"hover:bg-slate-50 hover:text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 focus-visible:ring-inset",
								copied && "text-green",
							)}
							aria-label={copied ? "Ticket number copied" : "Copy ticket number"}
						>
							{copied ? (
								<Check className="h-4 w-4" aria-hidden />
							) : (
								<Copy className="h-4 w-4" aria-hidden />
							)}
						</button>
					</div>
				</div>

				<div className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-5 py-3">
					<Button
						type="button"
						className="primary-btn px-3 sm:px-4"
						onClick={() => onOpenChange(false)}
					>
						<Check className="h-4 w-4" />
						Done
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
