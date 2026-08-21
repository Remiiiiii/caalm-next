"use client";

import { CheckCircle, Lock } from "lucide-react";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import { getApprovalStatusText } from "@/lib/calendar/calendarStatusDisplay";
import { cn } from "@/lib/utils";
import {
	CALENDAR_SOURCE_STYLES,
	type CalendarSource,
	resolveCalendarSource,
} from "./eventChipStyles";

export interface EventChipEvent {
	$id?: string;
	id?: string;
	title: string;
	startTime?: string;
	endTime?: string;
	outlook_id?: string;
	approvalStatus?: string;
	resourceId?: string;
	source?: CalendarSource;
}

interface EventChipProps {
	event: EventChipEvent;
	displayTitle: string;
	timeLabel: string;
	canViewSensitive: boolean;
	compact?: boolean;
	className?: string;
	onClick?: (e: React.MouseEvent) => void;
}

export function EventChip({
	event,
	displayTitle,
	timeLabel,
	canViewSensitive,
	compact = true,
	className,
	onClick,
}: EventChipProps) {
	const source = resolveCalendarSource(event);
	const style = CALENDAR_SOURCE_STYLES[source];
	const status =
		event.approvalStatus && event.approvalStatus !== "not_required"
			? event.approvalStatus
			: null;

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"w-full text-left rounded cursor-pointer transition-all duration-200 border-l-4",
				compact ? "px-1.5 py-1" : "px-2 py-1.5",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
				className,
			)}
			style={{
				borderLeftColor: style.accent,
				backgroundColor: style.fill,
				color: style.text,
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.backgroundColor = style.fillHover;
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.backgroundColor = style.fill;
			}}
		>
			<div className="flex items-center gap-1.5 min-w-0">
				<span
					className={cn(
						"font-medium whitespace-nowrap shrink-0",
						compact ? "text-[10px]" : "text-[11px]",
					)}
					style={{ color: style.text, opacity: 0.85 }}
				>
					{timeLabel}
				</span>
				{!canViewSensitive && (
					<Lock className="h-3 w-3 shrink-0 text-slate-500" aria-hidden />
				)}
				<span
					className={cn(
						"truncate",
						compact ? "text-xs" : "text-xs",
						canViewSensitive ? "font-medium" : "italic text-slate-500",
					)}
					style={canViewSensitive ? { color: style.text } : undefined}
				>
					{displayTitle}
				</span>
				{status && (
					<Badge
						variant="outline"
						className="ml-auto uppercase text-[9px] text-amber-600 bg-[#fcddc7] shrink-0 border-amber-300"
					>
						{getApprovalStatusText(status)}
					</Badge>
				)}
				{!status && event.outlook_id && (
					<CheckCircle className="h-3 w-3 text-green shrink-0 ml-auto" />
				)}
			</div>
		</button>
	);
}

export default EventChip;
