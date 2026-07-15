"use client";

import { format, isSameDay, isToday, startOfDay } from "date-fns";
import { CalendarDays } from "lucide-react";
import { EventChip, type EventChipEvent } from "@/components/calendar/EventChip";
import { cn } from "@/lib/utils";

export interface AgendaEvent extends EventChipEvent {
	startDate: string | Date;
	endDate?: string | Date;
}

interface AgendaViewProps {
	events: AgendaEvent[];
	rangeStart: Date;
	rangeEnd: Date;
	canViewSensitive: (event: AgendaEvent) => boolean;
	formatTime: (time: string) => string;
	parseTimeToMinutes: (time?: string) => number;
	onEventClick: (event: AgendaEvent) => void;
}

export function AgendaView({
	events,
	rangeStart,
	rangeEnd,
	canViewSensitive,
	formatTime,
	parseTimeToMinutes,
	onEventClick,
}: AgendaViewProps) {
	const start = startOfDay(rangeStart).getTime();
	const end = startOfDay(rangeEnd).getTime();

	const inRange = events
		.filter((event) => {
			if (!event.startDate) return false;
			const d =
				event.startDate instanceof Date
					? event.startDate
					: new Date(event.startDate);
			const t = startOfDay(d).getTime();
			return t >= start && t <= end;
		})
		.sort((a, b) => {
			const da =
				a.startDate instanceof Date ? a.startDate : new Date(a.startDate);
			const db =
				b.startDate instanceof Date ? b.startDate : new Date(b.startDate);
			const dayDiff = startOfDay(da).getTime() - startOfDay(db).getTime();
			if (dayDiff !== 0) return dayDiff;
			return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
		});

	const groups: { date: Date; items: AgendaEvent[] }[] = [];
	for (const event of inRange) {
		const d =
			event.startDate instanceof Date
				? event.startDate
				: new Date(event.startDate);
		const last = groups[groups.length - 1];
		if (last && isSameDay(last.date, d)) {
			last.items.push(event);
		} else {
			groups.push({ date: d, items: [event] });
		}
	}

	if (groups.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 px-4 text-center min-h-[320px]">
				<CalendarDays className="h-10 w-10 text-slate-400 mb-3" />
				<p className="text-sm font-medium text-slate-700">No events in range</p>
				<p className="text-xs text-slate-500 mt-1">
					Try another month or create a new event
				</p>
			</div>
		);
	}

	return (
		<div className="divide-y divide-slate-200 bg-white min-h-[320px]">
			{groups.map(({ date, items }) => (
				<div key={date.toISOString()} className="flex gap-4 p-4">
					<div
						className={cn(
							"w-16 shrink-0 text-center",
							isToday(date) && "text-[#0f5384]",
						)}
					>
						<div className="text-xs font-medium uppercase text-slate-500">
							{format(date, "EEE")}
						</div>
						{isToday(date) ? (
							<div
								className="mx-auto mt-1 w-9 h-9 rounded-full flex items-center justify-center text-base font-bold text-white"
								style={{
									background:
										"linear-gradient(135deg, #12477d 0%, #03afbf 100%)",
								}}
							>
								{format(date, "d")}
							</div>
						) : (
							<div className="mt-1 text-2xl font-bold text-slate-800">
								{format(date, "d")}
							</div>
						)}
					</div>
					<div className="flex-1 space-y-2 min-w-0">
						{items.map((event, index) => (
							<EventChip
								key={event.$id || `agenda-${index}`}
								event={event}
								displayTitle={
									canViewSensitive(event) ? event.title : "Restricted event"
								}
								timeLabel={
									event.startTime ? formatTime(event.startTime) : "All Day"
								}
								canViewSensitive={canViewSensitive(event)}
								compact={false}
								onClick={() => onEventClick(event)}
							/>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

export default AgendaView;
