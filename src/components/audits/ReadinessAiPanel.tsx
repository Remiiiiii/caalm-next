"use client";

import { Bot, Loader2, Send } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Message {
	role: "assistant" | "user";
	content: string;
}

export function ReadinessAiPanel({
	snapshotId,
	initialSummary,
}: {
	snapshotId?: string | null;
	initialSummary?: string;
}) {
	const [messages, setMessages] = useState<Message[]>(
		initialSummary
			? [{ role: "assistant", content: initialSummary }]
			: [],
	);
	const [question, setQuestion] = useState("");
	const [loading, setLoading] = useState(false);
	const [suggestions, setSuggestions] = useState<string[]>([
		"Which gaps matter most for HRSA OSV prep?",
		"What should we fix before child-welfare monitoring?",
		"Which items belong on a financial PBC list?",
	]);

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
			setMessages([{ role: "assistant", content: body.data.summary }]);
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
					{ role: "assistant", content: body.data.answer },
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
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6 space-y-4">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<Bot className="h-5 w-5 text-[#0f5384]" />
						<p className="text-sm font-medium sidebar-gradient-text">
							Readiness AI assistant
						</p>
					</div>
					<Button
						type="button"
						variant="outline"
						className="primary-btn px-3 sm:px-4 cursor-pointer"
						onClick={runAnalyze}
						disabled={loading}
					>
						{loading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							"Auto-summary"
						)}
					</Button>
				</div>
				<p className="text-xs text-slate-600">
					Explains CAALM readiness gaps for HRSA OSV, child-welfare monitoring,
					and financial PBC prep. Not an official audit determination.
				</p>
				<div className="max-h-64 overflow-y-auto space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
					{messages.length === 0 ? (
						<p className="text-sm text-slate-600">
							Run auto-summary or ask a question to get started.
						</p>
					) : (
						messages.map((message, index) => (
							<div
								key={`${message.role}-${index}`}
								className={
									message.role === "user"
										? "rounded-md bg-white border border-slate-200 p-3 text-sm text-slate-700"
										: "rounded-md bg-blue-50 border border-blue-100 p-3 text-sm text-slate-700"
								}
							>
								{message.content}
							</div>
						))
					)}
				</div>
				<div className="flex flex-wrap gap-2">
					{suggestions.map((item) => (
						<button
							key={item}
							type="button"
							className="text-xs px-2 py-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all duration-200"
							onClick={() => ask(item)}
							disabled={loading}
						>
							{item}
						</button>
					))}
				</div>
				<form
					className="flex gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						void ask(question);
					}}
				>
					<Input
						value={question}
						onChange={(event) => setQuestion(event.target.value)}
						placeholder="Ask about gaps, HRSA prep, or PBC evidence…"
						className="bg-white"
						disabled={loading}
					/>
					<Button
						type="submit"
						className="primary-btn px-3 sm:px-4 cursor-pointer"
						disabled={loading || !question.trim()}
					>
						<Send className="h-4 w-4" />
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
