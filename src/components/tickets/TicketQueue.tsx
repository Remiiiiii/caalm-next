"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { Ticket } from "@/lib/tickets/ticket.types";
import { displayTicketNumber } from "@/lib/tickets/ticket-number.utils";
import {
	TicketSeverityPill,
	TicketStatusPill,
	timeInStatus,
} from "./TicketStatusPill";

export function TicketQueue({ tickets }: { tickets: Ticket[] }) {
	if (tickets.length === 0) {
		return (
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-8 text-center">
					<AlertCircle className="mx-auto mb-3 h-10 w-10 text-slate-500" />
					<p className="text-sm font-medium text-slate-700">No active tickets</p>
					<p className="mt-1 text-xs text-slate-600">
						New submissions appear here until they are resolved.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-3">
			{tickets.map((ticket) => (
				<Link
					key={ticket.$id}
					href={`/tickets/${ticket.$id}`}
					className="block"
				>
					<Card className="glass-card interactive-glass-card cursor-pointer transition-all duration-200 hover:border-blue-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#0f5384]/40">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="min-w-0">
									<p className="font-mono text-xs font-semibold tracking-wide text-[#0f5384]">
										{displayTicketNumber(ticket)}
									</p>
									<p className="mt-1 text-sm font-medium sidebar-gradient-text">
										{ticket.title}
									</p>
									<p className="mt-1 text-xs text-slate-600">
										{ticket.submittedByName} · {ticket.department} ·{" "}
										{timeInStatus(ticket.$updatedAt || ticket.submittedAt)} in
										status
									</p>
								</div>
								<div className="flex items-center gap-2">
									<TicketSeverityPill severity={ticket.severity} />
									<TicketStatusPill status={ticket.status} />
								</div>
							</div>
						</CardContent>
					</Card>
				</Link>
			))}
		</div>
	);
}
