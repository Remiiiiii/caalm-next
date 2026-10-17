"use client";

import { AlertTriangle } from "lucide-react";
import {
	CaalmCalendarPanel,
	parseIsoDateLocal,
	toIsoDateLocal,
} from "@/components/ui/caalm-date-picker";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { getTaskDueDisplay } from "@/lib/tasks/dueDateDisplay";
import { cn } from "@/lib/utils";

export function TaskDueCell({
	dueDate,
	status,
	timeZone,
	disabled,
	onChange,
}: {
	dueDate?: string;
	status?: string;
	timeZone: string;
	disabled?: boolean;
	onChange?: (iso: string) => void;
}) {
	const display = getTaskDueDisplay({ dueDate, status, timeZone });
	const iso = dueDate
		? dueDate.includes("T")
			? dueDate.slice(0, 10)
			: dueDate
		: "";
	const selected = parseIsoDateLocal(iso);

	const text = (
		<span
			className={cn(
				"inline-flex flex-col items-start text-left text-xs",
				display.tone === "overdue" && "text-red font-medium",
				display.tone === "today" && "text-orange font-medium",
				display.tone === "default" && "text-slate-600",
				display.tone === "none" && "text-slate-400",
			)}
		>
			<span className="inline-flex items-center gap-1">
				{display.showAlert ? (
					<AlertTriangle className="h-3 w-3 shrink-0" />
				) : null}
				{display.label}
			</span>
			{display.relative ? (
				<span className="text-[11px] font-normal">{display.relative}</span>
			) : null}
		</span>
	);

	if (!onChange) return text;

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					disabled={disabled}
					onClick={(e) => e.stopPropagation()}
					className={cn(
						"cursor-pointer rounded-md px-1 py-0.5 hover:bg-slate-50",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
						disabled && "cursor-not-allowed opacity-50",
					)}
				>
					{text}
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-auto rounded-xl border border-slate-200 bg-white p-0 shadow-lg"
				onClick={(e) => e.stopPropagation()}
			>
				<CaalmCalendarPanel
					selected={selected}
					onSelect={(date) => onChange(date ? toIsoDateLocal(date) : "")}
				/>
			</PopoverContent>
		</Popover>
	);
}
