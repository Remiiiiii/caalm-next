"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AUDITOR_PERSONAS } from "@/lib/audit-lab/roleplay";
import type { ReviewSession } from "@/lib/audit-lab/types";
import { cn } from "@/lib/utils";

export function PracticeSessionPersonaControls({
	sessions,
	sessionId,
	onSessionId,
	persona,
	onPersona,
	actions,
}: {
	sessions: ReviewSession[];
	sessionId: string;
	onSessionId: (id: string) => void;
	persona: (typeof AUDITOR_PERSONAS)[number];
	onPersona: (p: (typeof AUDITOR_PERSONAS)[number]) => void;
	actions?: ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-center gap-3">
			<select
				className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
				value={sessionId}
				onChange={(e) => onSessionId(e.target.value)}
				aria-label="Simulation"
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
					onPersona(e.target.value as (typeof AUDITOR_PERSONAS)[number])
				}
				aria-label="Auditor persona"
			>
				{AUDITOR_PERSONAS.map((p) => (
					<option key={p} value={p}>
						{p.replaceAll("_", " ")}
					</option>
				))}
			</select>
			{actions}
		</div>
	);
}

export function PracticeLiveShell({
	headerLeft,
	headerRight,
	children,
	className,
}: {
	headerLeft: ReactNode;
	headerRight?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<Card className={cn("glass-card overflow-hidden", className)}>
			<div className="glass-card-cap" />
			<CardContent className="space-y-4 p-4 sm:p-6">
				<div className="flex items-center justify-between gap-3">
					{headerLeft}
					{headerRight}
				</div>
				{children}
			</CardContent>
		</Card>
	);
}

export function PracticeProgressBar({
	label,
	current,
	total,
}: {
	label: string;
	current: number;
	total: number;
}) {
	const pct =
		total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
				<span>{label}</span>
				<span className="tabular-nums text-slate-600">
					{current}/{total}
				</span>
			</div>
			<div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
				<div
					className="h-full rounded-full bg-[#078fab] transition-[width] duration-300"
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	);
}

export function formatPracticeElapsed(elapsedSec: number): string {
	return `${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, "0")}`;
}
