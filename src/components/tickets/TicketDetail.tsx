"use client";

import { ExternalLink, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { GitHubIssueSnapshot, Ticket, TicketEvent } from "@/lib/tickets/ticket.types";
import { TicketSeverityPill, TicketStatusPill } from "./TicketStatusPill";

export function TicketDetail({
	ticket,
	events,
	canResolve,
}: {
	ticket: Ticket;
	events: TicketEvent[];
	canResolve: boolean;
}) {
	const [issue, setIssue] = useState<GitHubIssueSnapshot | null>(null);
	const [loading, setLoading] = useState(false);
	const [resolving, setResolving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadIssue = useCallback(async () => {
		if (!ticket.githubIssueNumber) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/tickets/${ticket.$id}/github`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to load GitHub issue");
			setIssue(data.issue);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load issue");
		} finally {
			setLoading(false);
		}
	}, [ticket.$id, ticket.githubIssueNumber]);

	useEffect(() => {
		void loadIssue();
	}, [loadIssue]);

	const onResolve = async () => {
		setResolving(true);
		setError(null);
		try {
			const res = await fetch(`/api/tickets/${ticket.$id}/resolve`, {
				method: "POST",
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Resolve failed");
			window.location.reload();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Resolve failed");
		} finally {
			setResolving(false);
		}
	};

	return (
		<div className="space-y-6">
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 space-y-3">
					<div className="flex flex-wrap items-center gap-2">
						<TicketSeverityPill severity={ticket.severity} />
						<TicketStatusPill status={ticket.status} />
					</div>
					<h2 className="text-xl font-semibold sidebar-gradient-text">
						{ticket.title}
					</h2>
					<p className="text-sm text-slate-600">
						{ticket.submittedByName} · {ticket.department} ·{" "}
						{new Date(ticket.submittedAt).toUTCString()}
					</p>
					<p className="text-sm text-slate-700 whitespace-pre-wrap">
						{ticket.description}
					</p>
					{ticket.githubIssueUrl ? (
						<a
							href={ticket.githubIssueUrl}
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1 text-sm text-[#0f5384] underline-offset-2 hover:underline"
						>
							GitHub issue <ExternalLink className="h-3 w-3" />
						</a>
					) : null}
				</CardContent>
			</Card>

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 space-y-4">
					<div className="flex items-center justify-between">
						<p className="text-sm font-medium sidebar-gradient-text">
							Live GitHub issue
						</p>
						<Button
							type="button"
							variant="outline"
							className="primary-btn px-3 sm:px-4"
							onClick={() => void loadIssue()}
							disabled={loading}
						>
							<RefreshCw className="h-4 w-4" />
							Refresh from GitHub
						</Button>
					</div>
					{error ? <p className="text-sm text-red">{error}</p> : null}
					{loading && !issue ? (
						<p className="text-sm text-slate-600">Loading issue…</p>
					) : issue ? (
						<div className="space-y-3">
							<p className="text-sm font-medium text-slate-700">{issue.title}</p>
							<pre className="whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-700">
								{issue.body || "No issue body."}
							</pre>
							{issue.comments.length > 0 ? (
								<ul className="space-y-2">
									{issue.comments.map((comment) => (
										<li
											key={comment.id}
											className="rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600"
										>
											<span className="font-medium text-slate-700">
												{comment.author}
											</span>{" "}
											· {new Date(comment.createdAt).toUTCString()}
											<p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
										</li>
									))}
								</ul>
							) : null}
						</div>
					) : (
						<p className="text-sm text-slate-600">
							No GitHub issue linked yet.
						</p>
					)}
					<Button
						type="button"
						className="primary-btn px-3 sm:px-4"
						disabled={!canResolve || resolving || !ticket.githubIssueNumber}
						onClick={() => void onResolve()}
					>
						{resolving ? "Starting agent…" : "Resolve"}
					</Button>
					{!canResolve ? (
						<p className="text-xs text-slate-500">
							Only the assigned assignee or a Super Admin can resolve this
							ticket.
						</p>
					) : null}
				</CardContent>
			</Card>

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<p className="mb-3 text-sm font-medium sidebar-gradient-text">
						Audit trail
					</p>
					<ol className="space-y-2">
						{events.map((event) => (
							<li key={event.$id} className="text-xs text-slate-600">
								<span className="font-medium text-slate-700">
									{event.eventType.replaceAll("_", " ")}
								</span>{" "}
								· {new Date(event.timestamp).toUTCString()} · {event.actor}
							</li>
						))}
					</ol>
				</CardContent>
			</Card>
		</div>
	);
}
