"use client";

import { format } from "date-fns";
import {
	Calendar as CalendarIcon,
	CheckCircle,
	ChevronRight,
	Clock,
} from "lucide-react";
import type React from "react";
import {
	getEventTypeConfig,
	getEventTypeLabel,
} from "@/components/calendar/eventTypeConfig";
import type { LocalCalendarEvent } from "@/components/calendar/outlookStyleCalendarTypes";
import { AppDialog } from "@/components/ui/app-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getApprovalStatusText } from "@/lib/calendar/calendarStatusDisplay";
import {
	formatTimeForDisplay,
	parseTimeToMinutes,
} from "@/lib/calendar/eventDisplayFormat";
import { cn } from "@/lib/utils";

export interface OverflowDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	overflowDate: Date | null;
	overflowEvents: LocalCalendarEvent[];
	canViewEventSensitiveDetails: (event: LocalCalendarEvent) => boolean;
	onSelectEvent: (event: LocalCalendarEvent) => void;
}

export function OverflowDialog({
	open,
	onOpenChange,
	overflowDate,
	overflowEvents,
	canViewEventSensitiveDetails,
	onSelectEvent,
}: OverflowDialogProps): React.ReactElement {
	const title = overflowDate
		? format(overflowDate, "EEEE, MMMM d, yyyy")
		: "Events";
	const description = `${overflowEvents.length} event${overflowEvents.length !== 1 ? "s" : ""} scheduled`;

	return (
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			size="form"
			className="max-w-2xl"
			icon={<CalendarIcon className="h-5 w-5" />}
			title={title}
			description={description}
			footer={
				<Button
					type="button"
					variant="outline"
					className="rounded-full border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
					onClick={() => onOpenChange(false)}
				>
					Close
				</Button>
			}
		>
			<div className="space-y-3 pb-1">
				<p className="text-xs text-slate-500">
					Click on any event to view details
				</p>
				{[...overflowEvents]
					.sort((a, b) => {
						const timeA = parseTimeToMinutes(a.startTime);
						const timeB = parseTimeToMinutes(b.startTime);
						return timeA - timeB;
					})
					.map((event) => {
						const config = getEventTypeConfig(event.type);
						const IconComp = config.icon;
						const canViewSensitive = canViewEventSensitiveDetails(event);
						const displayTitle = canViewSensitive
							? event.title
							: "Restricted event";
						const status =
							event.approvalStatus && event.approvalStatus !== "not_required"
								? event.approvalStatus
								: null;
						return (
							<button
								key={
									event.$id || event.id || `${event.title}-${event.startDate}`
								}
								type="button"
								onClick={() => {
									onOpenChange(false);
									onSelectEvent(event);
								}}
								className={cn(
									"group w-full rounded-lg border-2 border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md",
								)}
							>
								<div className="flex items-start gap-4">
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 transition-colors group-hover:from-blue-200 group-hover:to-indigo-200">
										<IconComp className="h-5 w-5 text-blue-600" />
									</div>

									<div className="min-w-0 flex-1">
										<div className="mb-2 flex items-center gap-2">
											<span
												className={cn(
													"truncate text-sm font-semibold",
													canViewSensitive
														? "text-slate-700"
														: "italic text-slate-500",
												)}
											>
												{displayTitle}
											</span>
											{status && (
												<Badge
													variant="outline"
													className="text-[10px] uppercase"
												>
													{getApprovalStatusText(status)}
												</Badge>
											)}
											{!status && event.outlook_id && (
												<CheckCircle className="h-4 w-4 shrink-0 text-green" />
											)}
										</div>
										<div className="flex items-center gap-2 text-xs text-slate-600">
											<Clock className="h-3.5 w-3.5 shrink-0" />
											<span>
												{event.startTime
													? `${formatTimeForDisplay(event.startTime)}${
															event.endTime
																? ` - ${formatTimeForDisplay(event.endTime)}`
																: ""
														}`
													: "All Day"}
											</span>
										</div>
										{event.type && (
											<div className="mt-2">
												<span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
													{getEventTypeLabel(event.type as unknown as string)}
												</span>
											</div>
										)}
									</div>

									<div className="flex shrink-0 items-center">
										<ChevronRight className="h-5 w-5 text-slate-400 transition-colors group-hover:text-blue-600" />
									</div>
								</div>
							</button>
						);
					})}
			</div>
		</AppDialog>
	);
}
