import { Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import Avatar from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import type { Ticket, TicketSeverity } from "@/lib/tickets/ticket.types";
import {
	getImpactLabel,
	getUrgencyLabel,
} from "@/lib/tickets/ticket-intake.constants";
import { getStructuredBody } from "@/lib/tickets/ticket-structured";
import { cn } from "@/lib/utils";
import { timeInStatus } from "../TicketStatusPill";
import { formatTicketDate } from "./format";

/** 4px bar on the card's top edge, fading out to the right. */
const SEVERITY_BAR: Record<TicketSeverity, string> = {
	critical: "from-red",
	high: "from-orange",
	medium: "from-blue",
	low: "from-green",
};

function SectionLabel({ children }: { children: string }) {
	return (
		<p className="text-[10px] font-bold uppercase tracking-[0.07em] text-slate-500">
			{children}
		</p>
	);
}

function MetaCell({
	label,
	value,
	valueClassName,
}: {
	label: string;
	value: string;
	valueClassName?: string;
}) {
	return (
		<div className="min-w-0 space-y-1 border-slate-100 px-4 py-3 [&:not(:nth-child(3n))]:border-r [&:nth-child(n+4)]:border-t">
			<SectionLabel>{label}</SectionLabel>
			<p
				className={cn(
					"truncate text-[13px] font-semibold text-slate-800",
					valueClassName,
				)}
			>
				{value || "—"}
			</p>
		</div>
	);
}

export function TicketDetailCard({
	ticket,
	timeZone,
	submitterName,
	submitterAvatarUrl,
}: {
	ticket: Ticket;
	timeZone: string;
	submitterName: string;
	submitterAvatarUrl?: string;
}) {
	const parsed = getStructuredBody(ticket);
	const wide = ticket.impact === "high" || ticket.impact === "critical";

	return (
		<Card className="glass-card overflow-hidden p-0">
			<div className="glass-card-cap" />
			<div
				className={cn(
					"h-1 w-full bg-gradient-to-r to-transparent",
					SEVERITY_BAR[ticket.severity],
				)}
				aria-hidden
			/>
			<div className="grid grid-cols-1 border-b border-slate-100 sm:grid-cols-3">
				<MetaCell
					label="Submitted"
					value={formatTicketDate(ticket.submittedAt, timeZone)}
				/>
				<MetaCell label="Category" value={ticket.category ?? ""} />
				<MetaCell
					label="Affected service"
					value={ticket.affectedModule ?? ""}
					valueClassName="text-[#078FAB]"
				/>
				<MetaCell
					label="Impact"
					value={ticket.impact ? getImpactLabel(ticket.impact) : ""}
					valueClassName={wide ? "text-orange" : undefined}
				/>
				<MetaCell
					label="Urgency"
					value={ticket.urgency ? getUrgencyLabel(ticket.urgency) : ""}
				/>
				<MetaCell label="Environment" value={parsed?.environment ?? ""} />
			</div>

			<CardContent className="space-y-5 p-4 sm:p-6">
				<div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
					<Avatar
						name={submitterName}
						userId={ticket.submittedByUserId}
						size="md"
						imageUrl={submitterAvatarUrl}
					/>
					<div className="min-w-0">
						<p className="truncate text-[13px] font-semibold text-slate-800">
							{submitterName}
						</p>
						<p
							className="text-[11.5px] text-slate-500"
							suppressHydrationWarning
						>
							{ticket.department} · submitted {timeInStatus(ticket.submittedAt)}{" "}
							ago
						</p>
					</div>
					{ticket.githubIssueUrl ? (
						<a
							href={ticket.githubIssueUrl}
							target="_blank"
							rel="noreferrer"
							className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#078FAB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
						>
							#{ticket.githubIssueNumber} synced
							<ExternalLink className="h-3 w-3" aria-hidden />
						</a>
					) : null}
				</div>

				<div className="space-y-2">
					<SectionLabel>Description</SectionLabel>
					<h2 className="text-lg font-bold text-slate-800">{ticket.title}</h2>
					{parsed ? (
						parsed.extra ? (
							<p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-600">
								{parsed.extra}
							</p>
						) : null
					) : (
						<p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-600">
							{ticket.description}
						</p>
					)}
					{ticket.problemPageUrl ? (
						<p className="text-xs text-slate-500">
							Seen on{" "}
							<Link
								href={ticket.problemPageUrl}
								target="_blank"
								className="break-all text-[#0f5384] hover:underline"
							>
								{ticket.problemPageUrl}
							</Link>
						</p>
					) : null}
				</div>

				{parsed ? (
					<>
						{parsed.steps.length > 0 ? (
							<div className="space-y-2 border-t border-slate-100 pt-5">
								<SectionLabel>Reproduction steps</SectionLabel>
								<ul className="space-y-2">
									{parsed.steps.map((step, index) => (
										<li
											key={`${index}-${step}`}
											className="flex items-start gap-2.5 text-[13px] text-slate-700"
										>
											<span
												className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
												style={{
													background:
														"linear-gradient(135deg, #12477d 0%, #03afbf 100%)",
												}}
											>
												{index + 1}
											</span>
											{step}
										</li>
									))}
								</ul>
							</div>
						) : null}

						<div className="grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
							<div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
								<p className="text-[10px] font-bold uppercase tracking-[0.07em] text-green">
									Expected
								</p>
								<p className="whitespace-pre-wrap text-[13px] text-slate-700">
									{parsed.expected}
								</p>
							</div>
							<div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
								<p className="text-[10px] font-bold uppercase tracking-[0.07em] text-red">
									Actual
								</p>
								<p className="whitespace-pre-wrap text-[13px] text-slate-700">
									{parsed.actual}
								</p>
							</div>
						</div>

						<div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
							<div className="space-y-1">
								<SectionLabel>OS</SectionLabel>
								<p className="text-[13px] font-semibold text-slate-800">
									{parsed.os || "—"}
								</p>
							</div>
							<div className="space-y-1">
								<SectionLabel>Confirmations</SectionLabel>
								<ul className="space-y-0.5">
									{parsed.confirmations
										.filter((item) => item.checked)
										.map((item) => (
											<li
												key={item.label}
												className="flex items-center gap-1.5 text-xs text-green"
											>
												<Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
												{item.label}
											</li>
										))}
								</ul>
							</div>
						</div>
					</>
				) : null}
			</CardContent>
		</Card>
	);
}
