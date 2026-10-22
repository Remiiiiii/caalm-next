"use client";

import { Check, CheckCircle2, Copy, Ticket } from "lucide-react";
import { useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TicketSubmittedConfirmDialogProps = {
	open: boolean;
	ticketNumber: string;
	ticketId: string;
	lane?: "help" | "engineering" | null;
	onOpenChange: (open: boolean) => void;
};

export function TicketSubmittedConfirmDialog({
	open,
	ticketNumber,
	ticketId: _ticketId,
	lane,
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

	const laneCopy =
		lane === "help"
			? "Routed to Help — IT can claim and close it in CAALM."
			: lane === "engineering"
				? "Routed to Engineering — a GitHub issue is created for the fix agent."
				: null;

	return (
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			icon={<CheckCircle2 className="h-5 w-5" />}
			title="Ticket submitted"
			description="Save this number for follow-ups. We also emailed you a copy."
			footer={
				<Button
					type="button"
					className="btn-primary"
					onClick={() => onOpenChange(false)}
				>
					<Check className="h-4 w-4" />
					Done
				</Button>
			}
		>
			<div className="flex flex-col gap-3 pb-1">
				<div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
					<div className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
						<span className="inline-flex items-center gap-1.5 text-slate-500">
							<Ticket className="h-3.5 w-3.5" />
							Ticket number
						</span>
						<span className="inline-flex items-center gap-2 font-medium text-slate-700">
							{ticketNumber}
							<button
								type="button"
								onClick={() => void copyNumber()}
								className={cn(
									"flex h-8 w-8 items-center justify-center rounded-sm text-slate-500 transition-colors duration-200",
									"hover:bg-white hover:text-[#0f5384]",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
									copied && "text-green",
								)}
								aria-label={
									copied ? "Ticket number copied" : "Copy ticket number"
								}
							>
								{copied ? (
									<Check className="h-4 w-4" aria-hidden />
								) : (
									<Copy className="h-4 w-4" aria-hidden />
								)}
							</button>
						</span>
					</div>
				</div>
				{laneCopy ? (
					<p className="text-sm text-slate-500">{laneCopy}</p>
				) : null}
			</div>
		</AppDialog>
	);
}
