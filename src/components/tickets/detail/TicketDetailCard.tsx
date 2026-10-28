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

/** Left-border color of the submitter + meta block, by severity (SEV-1 to SEV-4). */
const SEVERITY_COLOR: Record<TicketSeverity, string> = {
	critical: "#FF7474",
	high: "#F9AB72",
	medium: "#56B8FF",
	low: "#94a3b8",
};

function SectionLabel({ children }: { children: string }) {
	return (
		<p className="text-[10px] font-bold uppercase tracking-[0.07em] text-slate-500">
			{children}
		</p>
	);
}

const META_CELL = "border-r border-slate-100 px-4 py-2.5 last:border-r-0";

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
	const metaColumns: { label: string; value: string; className?: string }[] = [
		{
			label: "Submitted",
			value: formatTicketDate(ticket.submittedAt, timeZone),
		},
		{ label: "Category", value: ticket.category ?? "" },
		{
			label: "Affected service",
			value: ticket.affectedModule ?? "",
			className: "font-semibold text-[#078FAB]",
		},
		{
			label: "Impact",
			value: ticket.impact ? getImpactLabel(ticket.impact) : "",
			className: wide ? "text-orange" : undefined,
		},
		{
			label: "Urgency",
			value: ticket.urgency ? getUrgencyLabel(ticket.urgency) : "",
		},
		{ label: "Environment", value: parsed?.environment ?? "" },
	];

	return (
		<>
			<div
				className="glass-card-inner overflow-hidden rounded-lg border border-l-4 border-slate-200/60"
				style={{ borderLeftColor: SEVERITY_COLOR[ticket.severity] }}
			>
				<div className="flex items-center gap-3 p-3 sm:p-4">
					<Avatar
						name={submitterName}
						userId={ticket.submittedByUserId}
						size="md"
						imageUrl={submitterAvatarUrl}
					/>
					<div className="min-w-0">
						<p className="truncate text-sm font-medium text-slate-700">
							{submitterName}
						</p>
						<p className="truncate text-xs text-slate-600">
							{ticket.department}
						</p>
					</div>
					<div className="ml-auto flex shrink-0 items-center gap-3 text-xs text-slate-500">
						<span suppressHydrationWarning>
							Submitted {timeInStatus(ticket.submittedAt)} ago
						</span>
						{ticket.githubIssueUrl ? (
							<a
								href={ticket.githubIssueUrl}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-1 font-medium text-[#078FAB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
							>
								#{ticket.githubIssueNumber} synced
								<ExternalLink className="h-3 w-3" aria-hidden />
							</a>
						) : null}
					</div>
				</div>
				<div className="overflow-x-auto border-t border-slate-200/60">
					<table className="w-full border-collapse text-left">
						<thead>
							<tr className="border-b border-slate-100 bg-slate-50/60">
								{metaColumns.map((col) => (
									<th
										key={col.label}
										scope="col"
										className={cn(
											META_CELL,
											"py-[9px] text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400",
										)}
									>
										{col.label}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							<tr>
								{metaColumns.map((col) => (
									<td
										key={col.label}
										className={cn(
											META_CELL,
											"max-w-[14rem] truncate text-[13px] font-medium text-slate-700",
											col.className,
										)}
									>
										{col.value || "—"}
									</td>
								))}
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			<div className="px-0.5">
				<h2 className="mb-[5px] text-[17px] font-bold text-slate-700">
					{ticket.title}
				</h2>
				{parsed ? (
					parsed.extra ? (
						<p className="whitespace-pre-wrap text-[13.5px] leading-[1.65] text-slate-600">
							{parsed.extra}
						</p>
					) : null
				) : (
					<p className="whitespace-pre-wrap text-[13.5px] leading-[1.65] text-slate-600">
						{ticket.description}
					</p>
				)}
				{ticket.problemPageUrl ? (
					<p className="mt-2 text-xs text-slate-500">
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
				<Card className="glass-card overflow-hidden p-0">
					<div className="glass-card-cap" />
					<CardContent className="space-y-5 p-4 sm:p-6">
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
					</CardContent>
				</Card>
			) : null}
		</>
	);
}
