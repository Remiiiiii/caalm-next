"use client";

import { CheckCircle2, Copy, Ticket } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";

type TicketSubmittedConfirmDialogProps = {
	open: boolean;
	ticketNumber: string;
	ticketId: string;
	onOpenChange: (open: boolean) => void;
	onViewTicket: () => void;
};

export function TicketSubmittedConfirmDialog({
	open,
	ticketNumber,
	ticketId: _ticketId,
	onOpenChange,
	onViewTicket,
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
			<DialogContent className="flex max-h-[90vh] max-w-[600px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl">
				{/* Professional Cap */}
				<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />

				{/* Header */}
				<div className="sticky top-0 z-10 mt-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 py-4">
					<div className="flex items-center gap-3 px-6">
						<div className="flex items-center gap-3">
							<CheckCircle2 className="h-5 w-5 text-[#0f5384]" />
							<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
								Ticket submitted
							</DialogTitle>
						</div>
					</div>
					<p className="mt-1 ml-14 text-sm text-slate-600">
						Save this number for follow-ups. We also emailed you a copy.
					</p>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto bg-slate-50 p-6">
					<div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
						<div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600">
							<Ticket className="h-4 w-4 text-[#0f5384]" />
							Your ticket number
						</div>
						<p className="font-mono text-2xl font-bold tracking-wide text-slate-700 sm:text-3xl">
							{ticketNumber}
						</p>
						<div className="mt-4">
							<Button
								type="button"
								variant="outline"
								className="primary-btn px-3 sm:px-4"
								onClick={() => void copyNumber()}
							>
								<Copy className="h-4 w-4" />
								{copied ? "Copied" : "Copy number"}
							</Button>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
					<div className="text-xs text-slate-500">
						You can find this ticket anytime under Tickets.
					</div>
					<div className="flex items-center gap-3">
						<Button
							type="button"
							variant="outline"
							className="primary-btn px-3 sm:px-4"
							onClick={() => onOpenChange(false)}
						>
							Close
						</Button>
						<Button
							type="button"
							className="primary-btn px-3 sm:px-4"
							onClick={onViewTicket}
						>
							View ticket
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
