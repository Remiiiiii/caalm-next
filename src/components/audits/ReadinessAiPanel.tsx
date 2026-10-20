"use client";

import { Bot, Loader2, Play, Send } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { PILL } from "@/components/audits/readiness/readiness-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatCardIcon } from "@/components/ui/stat-card-icon";
import { cn } from "@/lib/utils";

interface Citation {
	id: string;
	title: string;
	href: string;
	label: string;
}

interface Message {
	role: "assistant" | "user";
	content: string;
	/** Records the answer was based on. */
	citations?: Citation[];
}

const DEFAULT_SUGGESTIONS = [
	"Which gaps matter most for HRSA OSV prep?",
	"What should we fix before child-welfare monitoring?",
	"Which items belong on a financial PBC list?",
];

export function ReadinessAiPanel({
	snapshotId,
	initialSummary,
	initialSummaryAt,
}: {
	snapshotId?: string | null;
	initialSummary?: string;
	/** ISO time the saved summary was generated. */
	initialSummaryAt?: string | null;
}) {
	const [messages, setMessages] = useState<Message[]>(
		initialSummary ? [{ role: "assistant", content: initialSummary }] : [],
	);
	const [summaryAt, setSummaryAt] = useState<string | null>(
		initialSummary ? (initialSummaryAt ?? null) : null,
	);
	const [question, setQuestion] = useState("");
	const [loading, setLoading] = useState(false);
	const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);

	const runAnalyze = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/audits/readiness/analyze", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "analyze",
					snapshotId: snapshotId || undefined,
				}),
			});
			const body = await res.json();
			if (!res.ok) throw new Error(body.error || "Analyze failed");
			setMessages([
				{
					role: "assistant",
					content: body.data.summary,
					citations: body.data.citations,
				},
			]);
			setSummaryAt(new Date().toISOString());
			if (body.data.suggestedQuestions?.length) {
				setSuggestions(body.data.suggestedQuestions);
			}
		} catch (error) {
			setMessages([
				{
					role: "assistant",
					content:
						error instanceof Error
							? error.message
							: "Unable to generate analysis.",
				},
			]);
		} finally {
			setLoading(false);
		}
	}, [snapshotId]);

	const ask = useCallback(
		async (text: string) => {
			if (!text.trim()) return;
			setMessages((prev) => [...prev, { role: "user", content: text.trim() }]);
			setQuestion("");
			setLoading(true);
			try {
				const res = await fetch("/api/audits/readiness/analyze", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						action: "question",
						question: text.trim(),
						snapshotId: snapshotId || undefined,
						previousContext: messages
							.slice(-4)
							.map((m) => `${m.role}: ${m.content}`)
							.join("\n"),
					}),
				});
				const body = await res.json();
				if (!res.ok) throw new Error(body.error || "Question failed");
				setMessages((prev) => [
					...prev,
					{
						role: "assistant",
						content: body.data.answer,
						citations: body.data.citations,
					},
				]);
				if (body.data.suggestedQuestions?.length) {
					setSuggestions(body.data.suggestedQuestions);
				}
			} catch (error) {
				setMessages((prev) => [
					...prev,
					{
						role: "assistant",
						content:
							error instanceof Error
								? error.message
								: "Unable to answer right now.",
					},
				]);
			} finally {
				setLoading(false);
			}
		},
		[messages, snapshotId],
	);

	return (
		<Card className="glass-card h-full">
			<div className="glass-card-cap" />
			<CardContent className="flex h-full flex-col gap-3 p-4 text-slate-700 sm:p-6">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-2.5">
						<StatCardIcon icon={Bot} />
						<p className="h5 sidebar-gradient-text">Readiness AI assistant</p>
					</div>
					<span className={cn(PILL, "bg-blue/10 text-blue border-blue/20")}>
						Auto-summary
					</span>
				</div>
				<p className="caption text-slate-500">
					Explains readiness gaps for HRSA OSV, child-welfare monitoring and
					financial PBC prep. Not an official audit determination.
				</p>

				<div className="flex min-h-40 flex-1 flex-col justify-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
					{messages.length === 0 ? (
						<>
							<p className="text-sm text-slate-600">
								Run auto-summary or ask a question to get started.
							</p>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="cursor-pointer self-start"
								onClick={runAnalyze}
								disabled={loading}
							>
								{loading ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Play className="h-4 w-4" />
								)}
								Run auto-summary
							</Button>
						</>
					) : (
						<div className="max-h-64 space-y-3 overflow-y-auto">
							{messages.map((message, index) => (
								<div
									key={`${message.role}-${index}`}
									className={
										message.role === "user"
											? "rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700"
											: "rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-slate-700"
									}
								>
									{message.content}
									{message.citations?.length ? (
										<div className="mt-2 border-t border-blue-100 pt-2">
											<p className="caption text-slate-500">
												Based on these records
											</p>
											<div className="mt-1 flex flex-wrap gap-1">
												{message.citations.map((citation) => (
													<Link
														key={citation.id}
														href={citation.href}
														className="rounded-md border border-slate-200 bg-white px-2 py-px text-xs text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]"
													>
														{citation.title}
													</Link>
												))}
											</div>
										</div>
									) : null}
								</div>
							))}
							<div className="flex items-center justify-between gap-2">
								<span className="caption text-slate-500">
									{summaryAt
										? `Summary generated ${new Date(summaryAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
										: ""}
								</span>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="cursor-pointer"
									onClick={runAnalyze}
									disabled={loading}
								>
									{loading ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Play className="h-4 w-4" />
									)}
									Re-run auto-summary
								</Button>
							</div>
						</div>
					)}
				</div>

				<div className="flex flex-wrap gap-2">
					{suggestions.map((item) => (
						<button
							key={item}
							type="button"
							className="cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 transition-all duration-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]"
							onClick={() => ask(item)}
							disabled={loading}
						>
							{item}
						</button>
					))}
				</div>
				<form
					className="flex items-center gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						void ask(question);
					}}
				>
					<Input
						value={question}
						onChange={(event) => setQuestion(event.target.value)}
						placeholder="Ask about gaps, HRSA prep, or PBC evidence…"
						aria-label="Ask about gaps, HRSA prep, or PBC evidence"
						className="bg-white"
						disabled={loading}
					/>
					<Button
						type="submit"
						aria-label="Send"
						className="btn-primary shrink-0 px-3"
						disabled={loading || !question.trim()}
					>
						<Send className="h-4 w-4" />
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
