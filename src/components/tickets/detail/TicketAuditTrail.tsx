import {
	CheckCircle2,
	Circle,
	CircleDot,
	GitPullRequest,
	Hand,
	type LucideIcon,
	OctagonAlert,
	TicketPlus,
	TriangleAlert,
	Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { TicketEvent, TicketEventType } from "@/lib/tickets/ticket.types";
import { cn } from "@/lib/utils";
import { formatTicketDateTime } from "./format";

const EVENT_STYLE: Partial<
	Record<TicketEventType, { icon: LucideIcon; className: string }>
> = {
	CREATED: { icon: TicketPlus, className: "bg-blue/10 text-blue" },
	ISSUE_CREATED: { icon: CircleDot, className: "bg-slate-100 text-slate-600" },
	CLAIMED: { icon: Hand, className: "bg-blue/10 text-[#0f5384]" },
	ASSIGNED: { icon: Hand, className: "bg-blue/10 text-[#0f5384]" },
	ESCALATED: { icon: TriangleAlert, className: "bg-orange/10 text-orange" },
	AGENT_STARTED: { icon: Zap, className: "bg-green/10 text-green" },
	RESOLVE_CLICKED: { icon: Zap, className: "bg-green/10 text-green" },
	PR_OPENED: { icon: GitPullRequest, className: "bg-green/10 text-green" },
	PR_MERGED: { icon: GitPullRequest, className: "bg-green/10 text-green" },
	MARKED_RESOLVED: { icon: CheckCircle2, className: "bg-green/10 text-green" },
	FAILED: { icon: OctagonAlert, className: "bg-red/10 text-red" },
	NEEDS_HUMAN: { icon: OctagonAlert, className: "bg-red/10 text-red" },
};

const FALLBACK_STYLE = {
	icon: Circle,
	className: "bg-slate-100 text-slate-500",
};

function eventTitle(type: TicketEventType): string {
	const text = type.replaceAll("_", " ").toLowerCase();
	return text.charAt(0).toUpperCase() + text.slice(1);
}

export function TicketAuditTrail({
	events,
	timeZone,
	actorNames,
}: {
	events: TicketEvent[];
	timeZone: string;
	/** Display names by user id; unknown actors (e.g. "ai-agent") show as stored. */
	actorNames: Record<string, string>;
}) {
	const newestFirst = [...events].sort(
		(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
	);

	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6">
				<p className="mb-3 text-sm font-medium sidebar-gradient-text">
					Audit trail
				</p>
				<ol>
					{newestFirst.map((event, index) => {
						const { icon: Icon, className } =
							EVENT_STYLE[event.eventType] ?? FALLBACK_STYLE;
						return (
							<li
								key={event.$id}
								className="relative flex gap-3 pb-4 last:pb-0"
							>
								{index < newestFirst.length - 1 ? (
									<span
										className="absolute left-[10px] top-6 h-[calc(100%-1.5rem)] w-px bg-slate-200"
										aria-hidden
									/>
								) : null}
								<span
									className={cn(
										"relative inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full",
										className,
									)}
								>
									<Icon className="h-3 w-3" aria-hidden />
								</span>
								<div className="min-w-0">
									<p className="text-xs font-semibold text-slate-800">
										{eventTitle(event.eventType)}
									</p>
									<p className="text-[11px] text-slate-500">
										{actorNames[event.actor] || event.actor} ·{" "}
										{formatTicketDateTime(event.timestamp, timeZone)}
									</p>
								</div>
							</li>
						);
					})}
				</ol>
			</CardContent>
		</Card>
	);
}
