"use client";

import {
	eachDayOfInterval,
	endOfWeek,
	format,
	isSameDay,
	isToday,
	startOfWeek,
} from "date-fns";
import type React from "react";
import { EventChip, type EventChipEvent } from "@/components/calendar/EventChip";
import { CalendarNowLine } from "@/components/calendar/CalendarNowLine";
import { cn } from "@/lib/utils";

const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 56;

export interface TimeGridEvent extends EventChipEvent {
	startDate: string | Date;
	endDate?: string | Date;
	endTime?: string;
}

interface TimeGridWeekViewProps {
	selectedDate: Date;
	events: TimeGridEvent[];
	canViewSensitive: (event: TimeGridEvent) => boolean;
	formatTime: (time: string) => string;
	parseTimeToMinutes: (time?: string) => number;
	onSelectDay: (day: Date) => void;
	onEventClick: (event: TimeGridEvent) => void;
	onSlotClick?: (day: Date, hour: number) => void;
	/** When true, render a single day column (for Day view) */
	singleDay?: boolean;
}

function getEventTopAndHeight(
	startTime: string | undefined,
	endTime: string | undefined,
	parseTimeToMinutes: (time?: string) => number,
): { top: number; height: number } | null {
	if (!startTime) return null;
	const startMins = parseTimeToMinutes(startTime);
	const endMins = endTime
		? parseTimeToMinutes(endTime)
		: startMins + 60;
	const gridStart = START_HOUR * 60;
	const gridEnd = END_HOUR * 60;
	if (endMins <= gridStart || startMins >= gridEnd) return null;
	const clampedStart = Math.max(startMins, gridStart);
	const clampedEnd = Math.min(endMins, gridEnd);
	const top = ((clampedStart - gridStart) / 60) * HOUR_HEIGHT;
	const height = Math.max(
		((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT,
		24,
	);
	return { top, height };
}

export function TimeGridWeekView({
	selectedDate,
	events,
	canViewSensitive,
	formatTime,
	parseTimeToMinutes,
	onSelectDay,
	onEventClick,
	onSlotClick,
	singleDay = false,
}: TimeGridWeekViewProps) {
	const weekStart = startOfWeek(selectedDate);
	const weekEnd = endOfWeek(selectedDate);
	const days = singleDay
		? [selectedDate]
		: eachDayOfInterval({ start: weekStart, end: weekEnd });

	const hours = Array.from(
		{ length: END_HOUR - START_HOUR },
		(_, i) => START_HOUR + i,
	);

	const todayInView = days.some((d) => isToday(d));

	const eventsForDay = (day: Date) =>
		events.filter((event) => {
			if (!event.startDate) return false;
			const eventDate =
				event.startDate instanceof Date
					? event.startDate
					: new Date(event.startDate);
			return isSameDay(eventDate, day);
		});

	return (
		<div className="flex flex-col min-h-[480px] bg-white">
			{/* Day headers */}
			<div
				className={cn(
					"grid border-b border-slate-200 sticky top-0 z-10 bg-white",
					singleDay ? "grid-cols-[3.5rem_1fr]" : "grid-cols-[3.5rem_repeat(7,1fr)]",
				)}
			>
				<div className="border-r border-slate-200" />
				{days.map((day) => {
					const current = isToday(day);
					const selected = isSameDay(day, selectedDate);
					return (
						<button
							key={day.toISOString()}
							type="button"
							onClick={() => onSelectDay(day)}
							className={cn(
								"p-2 text-center border-r border-slate-200 last:border-r-0 cursor-pointer transition-colors duration-200",
								current && "bg-blue/5",
								selected && !current && "bg-slate-50",
							)}
						>
							<div className="text-xs font-medium text-slate-600">
								{format(day, "EEE")}
							</div>
							{current ? (
								<div
									className="mx-auto mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white"
									style={{
										background:
											"linear-gradient(135deg, #12477d 0%, #03afbf 100%)",
									}}
								>
									{format(day, "d")}
								</div>
							) : (
								<div className="mt-0.5 text-lg font-bold text-slate-800">
									{format(day, "d")}
								</div>
							)}
						</button>
					);
				})}
			</div>

			{/* All-day band */}
			<div
				className={cn(
					"grid border-b border-slate-200 min-h-[40px]",
					singleDay ? "grid-cols-[3.5rem_1fr]" : "grid-cols-[3.5rem_repeat(7,1fr)]",
				)}
			>
				<div className="text-[10px] text-slate-500 p-1 border-r border-slate-200 flex items-start">
					All day
				</div>
				{days.map((day) => {
					const allDay = eventsForDay(day).filter((e) => !e.startTime);
					return (
						<div
							key={`allday-${day.toISOString()}`}
							className={cn(
								"p-1 border-r border-slate-200 last:border-r-0 space-y-0.5",
								isToday(day) && "bg-blue/5",
							)}
						>
							{allDay.slice(0, 2).map((event, index) => (
								<EventChip
									key={event.$id || `allday-${index}`}
									event={event}
									displayTitle={
										canViewSensitive(event) ? event.title : "Restricted event"
									}
									timeLabel="All Day"
									canViewSensitive={canViewSensitive(event)}
									onClick={(e) => {
										e.stopPropagation();
										onEventClick(event);
									}}
								/>
							))}
						</div>
					);
				})}
			</div>

			{/* Time grid */}
			<div className="overflow-y-auto max-h-[560px] relative">
				<div
					className={cn(
						"grid relative",
						singleDay ? "grid-cols-[3.5rem_1fr]" : "grid-cols-[3.5rem_repeat(7,1fr)]",
					)}
					style={{ height: hours.length * HOUR_HEIGHT }}
				>
					{/* Hour labels */}
					<div className="relative border-r border-slate-200">
						{hours.map((hour) => (
							<div
								key={hour}
								className="absolute left-0 right-0 text-[10px] text-slate-500 pr-1 text-right -translate-y-1/2"
								style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
							>
								{format(new Date(2000, 0, 1, hour), "h a")}
							</div>
						))}
					</div>

					{/* Day columns */}
					{days.map((day) => {
						const dayEvents = eventsForDay(day).filter((e) => e.startTime);
						const current = isToday(day);
						return (
							<div
								key={`col-${day.toISOString()}`}
								className={cn(
									"relative border-r border-slate-200 last:border-r-0",
									current && "bg-blue/5",
								)}
							>
								{/* Hour lines + click slots */}
								{hours.map((hour) => (
									<button
										key={hour}
										type="button"
										className="absolute left-0 right-0 border-t border-slate-100 cursor-pointer hover:bg-blue-50/50 transition-colors duration-200"
										style={{
											top: (hour - START_HOUR) * HOUR_HEIGHT,
											height: HOUR_HEIGHT,
										}}
										onClick={() => onSlotClick?.(day, hour)}
										aria-label={`Create event ${format(day, "MMM d")} at ${hour}:00`}
									/>
								))}

								{/* Timed events */}
								{dayEvents.map((event, index) => {
									const pos = getEventTopAndHeight(
										event.startTime,
										event.endTime,
										parseTimeToMinutes,
									);
									if (!pos) return null;
									return (
										<div
											key={event.$id || `timed-${index}`}
											className="absolute left-0.5 right-0.5 z-10"
											style={{ top: pos.top, height: pos.height }}
										>
											<EventChip
												event={event}
												displayTitle={
													canViewSensitive(event)
														? event.title
														: "Restricted event"
												}
												timeLabel={
													event.startTime
														? formatTime(event.startTime)
														: "All Day"
												}
												canViewSensitive={canViewSensitive(event)}
												compact={pos.height < 40}
												onClick={(e) => {
													e.stopPropagation();
													onEventClick(event);
												}}
											/>
										</div>
									);
								})}

								{current && todayInView && (
									<CalendarNowLine
										startHour={START_HOUR}
										endHour={END_HOUR}
										hourHeight={HOUR_HEIGHT}
									/>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

export { START_HOUR, END_HOUR, HOUR_HEIGHT };
export default TimeGridWeekView;
