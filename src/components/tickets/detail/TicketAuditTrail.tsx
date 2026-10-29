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
import type { TicketEvent, TicketEventType } from "@/lib/tickets/ticket.types";
import { cn } from "@/lib/utils";
import { formatTicketDateTime } from "./format";
import { SheetSection } from "./SheetSection";

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

function eventTitle(
	event: TicketEvent,
	actorNames: Record<string, string>,
): string {
	if (event.eventType === "ASSIGNED") {
		const assigneeId = assigneeIdFrom(event.metadata);
		const name = assigneeId ? actorNames[assigneeId] : undefined;
		if (name) return `Assigned to ${name}`;
	}
	const text = event.eventType.replaceAll("_", " ").toLowerCase();
	return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The CAALM user an ASSIGNED event handed the ticket to, if recorded. */
export function assigneeIdFrom(metadata?: string | null): string | null {
	if (!metadata) return null;
	try {
		const id = (JSON.parse(metadata) as { assigneeCaalmUserId?: unknown })
			.assigneeCaalmUserId;
		return typeof id === "string" && id ? id : null;
	} catch {
		return null;
	}
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
		<SheetSection title="Audit trail">
			<ol>
				{newestFirst.map((event, index) => {
					const { icon: Icon, className } =
						EVENT_STYLE[event.eventType] ?? FALLBACK_STYLE;
					return (
						<li key={event.$id} className="relative flex gap-3 pb-4 last:pb-0">
							{index < newestFirst.length - 1 ? (
								<span
									className="absolute left-[10px] top-5 h-[calc(100%-1.25rem)] w-px bg-slate-200"
									aria-hidden
								/>
							) : null}
							<span
								className={cn(
									"relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
									className,
								)}
							>
								<Icon className="h-2.5 w-2.5" aria-hidden />
							</span>
							<div className="min-w-0">
								<p className="text-[11.5px] font-semibold text-slate-700">
									{eventTitle(event, actorNames)}
								</p>
								<p className="text-[10.5px] text-slate-400">
									{actorNames[event.actor] || event.actor} ·{" "}
									{formatTicketDateTime(event.timestamp, timeZone)}
								</p>
							</div>
						</li>
					);
				})}
			</ol>
		</SheetSection>
	);
}
