"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Database,
	FileSearch,
	Loader2,
	Search,
	XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
	AssistantResearchStep,
	AssistantResearchStepKind,
} from "@/lib/assistant/assistant-research-steps";
import { cn } from "@/lib/utils";

function StepIcon({
	kind,
	status,
}: {
	kind: AssistantResearchStepKind;
	status: AssistantResearchStep["status"];
}) {
	if (status === "active") {
		return (
			<Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#078fab]" />
		);
	}
	if (status === "done") {
		return (
			<CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" aria-hidden />
		);
	}
	if (status === "empty") {
		return <XCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />;
	}
	if (status === "failed") {
		return <XCircle className="h-3.5 w-3.5 shrink-0 text-red-600" aria-hidden />;
	}
	const Icon =
		kind === "database" ? Database : kind === "file" ? FileSearch : Search;
	return <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />;
}

export default function AssistantResearchTrace({
	steps,
	playbackIndex,
	collapsible,
	defaultCollapsed = false,
}: {
	steps: AssistantResearchStep[];
	/** When set, only steps up to this index render as done/active (client playback). */
	playbackIndex?: number;
	collapsible?: boolean;
	defaultCollapsed?: boolean;
}) {
	const reducedMotion = useReducedMotion();
	const [collapsed, setCollapsed] = useState(defaultCollapsed);

	useEffect(() => {
		if (collapsible) setCollapsed(defaultCollapsed);
	}, [collapsible, defaultCollapsed, steps]);

	const visibleSteps = useMemo(() => {
		if (playbackIndex === undefined) return steps;
		return steps.map((row, index) => {
			if (index < playbackIndex) {
				return { ...row, status: row.status === "pending" ? "done" : row.status };
			}
			if (index === playbackIndex) {
				return { ...row, status: "active" as const };
			}
			return { ...row, status: "pending" as const };
		});
	}, [steps, playbackIndex]);

	const doneCount = steps.filter(
		(s) => s.status === "done" || s.status === "empty",
	).length;

	if (!steps.length) return null;

	const body = (
		<ul className="space-y-1.5" aria-live="polite">
			{visibleSteps.map((row, index) => {
				if (playbackIndex !== undefined && index > playbackIndex) return null;
				return (
					<motion.li
						key={row.id}
						initial={reducedMotion ? false : { opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: reducedMotion ? 0 : 0.18 }}
						className="flex items-start gap-2 text-xs text-slate-600"
					>
						<StepIcon kind={row.kind} status={row.status} />
						<span className="min-w-0 leading-snug">
							{row.label}
							{row.resultNote && row.status !== "pending" ? (
								<span className="text-slate-500"> {row.resultNote}</span>
							) : null}
						</span>
					</motion.li>
				);
			})}
		</ul>
	);

	if (collapsible && collapsed) {
		return (
			<button
				type="button"
				className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg py-1 text-left text-xs text-slate-500 hover:text-[#0f5384]"
				onClick={() => setCollapsed(false)}
			>
				<ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
				Researched {doneCount} source{doneCount === 1 ? "" : "s"}
			</button>
		);
	}

	return (
		<div className="w-full max-w-[85%]">
			{collapsible ? (
				<button
					type="button"
					className="mb-1 flex cursor-pointer items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#0f5384]"
					onClick={() => setCollapsed(true)}
				>
					<ChevronDown className="h-3.5 w-3.5" aria-hidden />
					Research trace
				</button>
			) : null}
			{body}
		</div>
	);
}
