"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AUDITOR_PERSONAS } from "@/lib/audit-lab/roleplay";
import type { ReviewSession } from "@/lib/audit-lab/types";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";

const SHOW_ME_SECONDS = 120;

export function PracticeRoundPanel({
	sessions,
	canPractice,
	canScore,
}: {
	sessions: ReviewSession[];
	canPractice: boolean;
	canScore: boolean;
}) {
	const { toast } = useToast();
	const [sessionId, setSessionId] = useState(sessions[0]?.$id ?? "");
	const [persona, setPersona] = useState<(typeof AUDITOR_PERSONAS)[number]>(
		"by_the_book",
	);
	const [attemptId, setAttemptId] = useState<string | null>(null);
	const [prompt, setPrompt] = useState("");
	const [answer, setAnswer] = useState("");
	const [showMe, setShowMe] = useState(false);
	const [secondsLeft, setSecondsLeft] = useState(SHOW_ME_SECONDS);
	const [dimensions, setDimensions] = useState<Record<string, number> | null>(
		null,
	);
	const startedAt = useRef<number | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (!showMe) return;
		setSecondsLeft(SHOW_ME_SECONDS);
		startedAt.current = Date.now();
		const id = setInterval(() => {
			setSecondsLeft((s) => Math.max(0, s - 1));
		}, 1000);
		return () => clearInterval(id);
	}, [showMe, attemptId, prompt]);

	async function start() {
		if (!sessionId) return;
		setBusy(true);
		try {
			const res = await fetch("/api/audit-lab/practice", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "start",
					sessionId,
					persona,
					difficulty: "medium",
				}),
			});
			const json = (await res.json()) as {
				error?: string;
				data?: {
					attempt?: { $id: string };
					firstQuestion?: { prompt?: string };
				};
			};
			if (!res.ok) throw new Error(json.error || "Start failed");
			setAttemptId(json.data?.attempt?.$id ?? null);
			setPrompt(json.data?.firstQuestion?.prompt ?? "First question ready.");
			setShowMe(/show me/i.test(json.data?.firstQuestion?.prompt ?? ""));
			setAnswer("");
			setDimensions(null);
		} catch (err) {
			toast({
				title: "Practice",
				description: toUserFacingErrorMessage(err, "Could not start practice."),
				variant: "destructive",
			});
		} finally {
			setBusy(false);
		}
	}

	async function submit() {
		if (!attemptId || !canScore) return;
		setBusy(true);
		try {
			const retrievalMs = startedAt.current
				? Date.now() - startedAt.current
				: undefined;
			const res = await fetch("/api/audit-lab/practice", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "score",
					attemptId,
					answer,
					score: 3,
					retrievalMs,
					showMe,
				}),
			});
			const json = (await res.json()) as {
				error?: string;
				data?: {
					dimensions?: Record<string, number>;
					followUp?: string | null;
					slowRetrieval?: boolean;
				};
			};
			if (!res.ok) throw new Error(json.error || "Score failed");
			setDimensions(json.data?.dimensions ?? null);
			if (json.data?.slowRetrieval) {
				toast({
					title: "Retrieval flagged",
					description: "Finding the record took longer than about 2 minutes.",
				});
			}
			if (json.data?.followUp) {
				setPrompt(json.data.followUp);
				setShowMe(/show me/i.test(json.data.followUp));
				setAnswer("");
				startedAt.current = Date.now();
			}
		} catch (err) {
			toast({
				title: "Practice",
				description: toUserFacingErrorMessage(err, "Could not score that answer."),
				variant: "destructive",
			});
		} finally {
			setBusy(false);
		}
	}

	if (!canPractice) {
		return (
			<p className="text-sm text-slate-600">
				Practice needs the run practice permission.
			</p>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-3">
				<select
					className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
					value={sessionId}
					onChange={(e) => setSessionId(e.target.value)}
					aria-label="Session"
				>
					{sessions.map((s) => (
						<option key={s.$id} value={s.$id}>
							{s.title}
						</option>
					))}
				</select>
				<select
					className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
					value={persona}
					onChange={(e) =>
						setPersona(e.target.value as (typeof AUDITOR_PERSONAS)[number])
					}
					aria-label="Auditor persona"
				>
					{AUDITOR_PERSONAS.map((p) => (
						<option key={p} value={p}>
							{p.replaceAll("_", " ")}
						</option>
					))}
				</select>
				<Button
					type="button"
					className="btn-primary"
					disabled={busy || !sessionId}
					onClick={() => void start()}
				>
					Start practice
				</Button>
			</div>

			{attemptId ? (
				<div className="space-y-3 rounded-lg border border-slate-200 p-4">
					<p className="text-sm font-medium text-[#0f5384]">{prompt}</p>
					{showMe ? (
						<p
							className={
								secondsLeft === 0
									? "text-sm font-semibold text-amber-700"
									: "text-sm text-slate-600"
							}
						>
							Show-me timer: {secondsLeft}s
							{secondsLeft === 0 ? " (flagged if you submit now)" : ""}
						</p>
					) : null}
					<Input
						value={answer}
						onChange={(e) => setAnswer(e.target.value)}
						placeholder="Your answer"
					/>
					<Button
						type="button"
						className="btn-primary"
						disabled={busy || !answer.trim() || !canScore}
						onClick={() => void submit()}
					>
						Submit answer
					</Button>
					{dimensions ? (
						<ul className="grid grid-cols-2 gap-2 text-xs text-slate-600 md:grid-cols-4">
							{Object.entries(dimensions).map(([k, v]) => (
								<li key={k} className="rounded border border-slate-200 px-2 py-1">
									{k}: {v}
								</li>
							))}
						</ul>
					) : null}
				</div>
			) : null}
		</div>
	);
}