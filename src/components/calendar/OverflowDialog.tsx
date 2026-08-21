"use client";

import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden p-0 shadow-xl">
				<VisuallyHiddenPrimitive.Root>
					<DialogTitle>
						{overflowDate
							? format(overflowDate, "EEEE, MMMM d, yyyy")
							: "Events"}
					</DialogTitle>
				</VisuallyHiddenPrimitive.Root>
				{/* Professional Header with Cap */}
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
				<div className="glass-dialog-wizard-header">
					<div className="flex items-center px-6">
						<div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
							<CalendarIcon className="w-5 h-5 text-[#0f5384]" />
						</div>
						<div>
							<h2 className="text-xl font-semibold sidebar-gradient-text mt-6">
								{overflowDate
									? format(overflowDate, "EEEE, MMMM d, yyyy")
									: "Events"}
							</h2>
							<p className="text-sm text-slate-600 mt-1">
								{overflowEvents.length} event
								{overflowEvents.length !== 1 ? "s" : ""} scheduled
							</p>
						</div>
					</div>
				</div>

				{/* Scrollable Event List */}
				<div className="flex-1 overflow-y-auto p-6 bg-white">
					<div className="space-y-3">
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
									event.approvalStatus &&
									event.approvalStatus !== "not_required"
										? event.approvalStatus
										: null;
								return (
									<button
										key={
											event.$id ||
											event.id ||
											`${event.title}-${event.startDate}`
										}
										type="button"
										onClick={() => {
											onOpenChange(false);
											onSelectEvent(event);
										}}
										className={cn(
											"w-full text-left p-4 rounded-lg border-2 border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group",
											"shadow-sm hover:shadow-md",
										)}
									>
										<div className="flex items-start gap-4">
											<div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:from-blue-200 group-hover:to-indigo-200 transition-colors">
												<IconComp className="h-5 w-5 text-blue-600" />
											</div>

											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 mb-2">
													<span
														className={cn(
															"text-sm font-semibold truncate",
															canViewSensitive
																? "text-slate-700"
																: "text-slate-500 italic",
														)}
													>
														{displayTitle}
													</span>
													{status && (
														<Badge
															variant="outline"
															className="uppercase text-[10px]"
														>
															{getApprovalStatusText(status)}
														</Badge>
													)}
													{!status && event.outlook_id && (
														<CheckCircle className="h-4 w-4 text-green flex-shrink-0" />
													)}
												</div>
												<div className="flex items-center gap-2 text-xs text-slate-600">
													<Clock className="h-3.5 w-3.5 flex-shrink-0" />
													<span>
														{event.startTime
															? `${formatTimeForDisplay(event.startTime)}${
																	event.endTime
																		? ` - ${formatTimeForDisplay(
																				event.endTime,
																			)}`
																		: ""
																}`
															: "All Day"}
													</span>
												</div>
												{event.type && (
													<div className="mt-2">
														<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
															{getEventTypeLabel(
																event.type as unknown as string,
															)}
														</span>
													</div>
												)}
											</div>

											<div className="flex-shrink-0 flex items-center">
												<ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
											</div>
										</div>
									</button>
								);
							})}
					</div>
				</div>

				<div className="flex items-center justify-between border-t border-white/40 bg-white/35 px-6 py-4 backdrop-blur-sm">
					<div className="text-xs text-slate-500">
						Click on any event to view details
					</div>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						className="primary-btn px-4"
					>
						Close
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
