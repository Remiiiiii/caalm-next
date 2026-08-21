"use client";

import {
	eachDayOfInterval,
	endOfMonth,
	endOfWeek,
	format,
	isSameDay,
	isSameMonth,
	isToday,
	startOfMonth,
	startOfWeek,
} from "date-fns";
import type React from "react";
import { EventChip } from "@/components/calendar/EventChip";
import { VISIBLE_CHIPS_PER_DAY } from "@/components/calendar/eventChipStyles";
import type { LocalCalendarEvent } from "@/components/calendar/outlookStyleCalendarTypes";
import { formatTimeForDisplay } from "@/lib/calendar/eventDisplayFormat";
import { cn } from "@/lib/utils";

export interface MonthViewProps {
	currentMonth: Date;
	selectedDate?: Date;
	events: LocalCalendarEvent[];
	canViewEventSensitiveDetails: (event: LocalCalendarEvent) => boolean;
	onSelectDay: (day: Date) => void;
	onEventClick: (event: LocalCalendarEvent) => void;
	onOverflow: (day: Date, dayEvents: LocalCalendarEvent[]) => void;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MonthView({
	currentMonth,
	selectedDate,
	events,
	canViewEventSensitiveDetails,
	onSelectDay,
	onEventClick,
	onOverflow,
}: MonthViewProps): React.ReactElement {
	const monthStart = startOfMonth(currentMonth);
	const monthEnd = endOfMonth(currentMonth);
	const startDate = startOfWeek(monthStart);
	const endDate = endOfWeek(monthEnd);
	const days = eachDayOfInterval({ start: startDate, end: endDate });

	return (
		<div className="grid grid-cols-7 gap-px bg-gray-200">
			{WEEKDAY_LABELS.map((day) => (
				<div
					key={day}
					className="p-2 text-center text-sm font-medium text-gray-700 bg-gray-50"
				>
					{day}
				</div>
			))}

			{days.map((day) => {
				const dayEvents = events.filter((event) => {
					if (!event.startDate) return false;
					const eventDate =
						event.startDate instanceof Date
							? event.startDate
							: new Date(event.startDate);
					return isSameDay(eventDate, day);
				});

				const isCurrentMonth = isSameMonth(day, currentMonth);
				const isSelected = selectedDate && isSameDay(day, selectedDate);
				const isCurrentDay = isToday(day);

				return (
					<div
						key={day.toISOString()}
						className={cn(
							"min-h-[72px] sm:min-h-[105px] max-h-[72px] sm:max-h-[105px] overflow-hidden p-1.5 sm:p-2 bg-white border border-gray-200 cursor-pointer transition-colors flex flex-col",
							!isCurrentMonth && "bg-gray-50 text-gray-400",
							isSelected && "bg-gray-50 border-blue-300",
						)}
						onClick={() => onSelectDay(day)}
					>
						<div className="flex items-center justify-start mb-0.5 flex-shrink-0">
							{isCurrentDay ? (
								<div
									className="w-6 h-6 rounded-full"
									style={{
										background:
											"linear-gradient(135deg, #12477d 0%, #03afbf 100%)",
									}}
								>
									<span className="text-white text-xs font-medium flex items-center justify-center h-full">
										{format(day, "d")}
									</span>
								</div>
							) : (
								<div className="text-xs font-medium">{format(day, "d")}</div>
							)}
						</div>

						<div className="flex flex-col flex-1 min-h-0">
							<div className="space-y-1">
								{dayEvents
									.slice(0, VISIBLE_CHIPS_PER_DAY)
									.map((event, index) => {
										const canViewSensitive =
											canViewEventSensitiveDetails(event);
										const displayTitle = canViewSensitive
											? event.title
											: "Restricted event";
										return (
											<EventChip
												key={event.$id || `event-${index}-${event.title}`}
												event={event}
												displayTitle={displayTitle}
												timeLabel={
													event.startTime
														? formatTimeForDisplay(event.startTime)
														: "All Day"
												}
												canViewSensitive={canViewSensitive}
												onClick={(e) => {
													e.stopPropagation();
													onEventClick(event);
												}}
											/>
										);
									})}
							</div>
							{dayEvents.length > VISIBLE_CHIPS_PER_DAY && (
								<button
									type="button"
									className="w-full text-[10px] text-slate-600 text-center hover:text-[#0f5384] py-1 mt-auto cursor-pointer transition-colors duration-200"
									onClick={(e) => {
										e.stopPropagation();
										onOverflow(day, dayEvents);
									}}
								>
									+{dayEvents.length - VISIBLE_CHIPS_PER_DAY} more
								</button>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}
