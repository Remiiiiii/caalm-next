"use client";

import { CheckCircle2, ChevronDown, ChevronRight, Circle, Lock } from "lucide-react";
import { useState } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RoadmapTaskTreeNode } from "@/lib/roadmap/types";
import { cn } from "@/lib/utils";

type Props = {
	tasks: RoadmapTaskTreeNode[];
};

function StatusIcon({ status }: { status: string }) {
	if (status === "complete") {
		return <CheckCircle2 className="h-4 w-4 text-green shrink-0" aria-hidden />;
	}
	if (status === "locked") {
		return <Lock className="h-4 w-4 text-slate-400 shrink-0" aria-hidden />;
	}
	return <Circle className="h-4 w-4 text-[#0f5384] shrink-0" aria-hidden />;
}

function TaskRow({
	task,
	depth,
}: {
	task: RoadmapTaskTreeNode;
	depth: number;
}) {
	const [open, setOpen] = useState(true);
	const locked = task.status === "locked";
	const hasChildren = task.children.length > 0;

	const row = (
		<div
			className={cn(
				"flex items-start gap-2 rounded-md border px-3 py-2",
				locked
					? "border-slate-200 bg-slate-100/80 text-slate-500"
					: "border-slate-200 bg-white",
			)}
			style={{ marginLeft: depth * 16 }}
		>
			{hasChildren ? (
				<button
					type="button"
					className="mt-0.5 text-slate-500 cursor-pointer"
					aria-label={open ? "Collapse" : "Expand"}
					onClick={() => setOpen((v) => !v)}
				>
					{open ? (
						<ChevronDown className="h-4 w-4" />
					) : (
						<ChevronRight className="h-4 w-4" />
					)}
				</button>
			) : (
				<span className="w-4" />
			)}

			<span
				className="mt-0.5"
				aria-label={`Status: ${task.status}`}
				title={task.status}
			>
				<StatusIcon status={task.status} />
			</span>

			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-xs text-slate-500">{task.taskCode}</span>
					<span
						className={cn(
							"text-sm font-medium",
							locked ? "text-slate-500" : "text-slate-700",
						)}
					>
						{task.title}
					</span>
					<span className="text-[10px] uppercase tracking-wide text-slate-500 border border-slate-200 rounded px-1.5 py-0.5">
						{task.status.replace("_", " ")}
					</span>
				</div>
				{task.prNumber != null ? (
					<p className="text-xs text-slate-600 mt-1 tabular-nums">
						PR #{task.prNumber}
					</p>
				) : null}
			</div>
		</div>
	);

	return (
		<div className="space-y-2">
			{locked && task.lockReason ? (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>{row}</TooltipTrigger>
						<TooltipContent className="max-w-xs">
							<p className="text-xs">{task.lockReason}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			) : (
				row
			)}
			{hasChildren && open
				? task.children.map((child) => (
						<TaskRow key={child.$id} task={child} depth={depth + 1} />
					))
				: null}
		</div>
	);
}

export function RoadmapTaskTree(props: Props) {
	return (
		<div className="space-y-2">
			{props.tasks.map((task) => (
				<TaskRow key={task.$id} task={task} depth={0} />
			))}
		</div>
	);
}
