"use client";

import {
	type TimeGridEvent,
	TimeGridWeekView,
} from "@/components/calendar/TimeGridWeekView";

interface DayViewProps {
	selectedDate: Date;
	events: TimeGridEvent[];
	canViewSensitive: (event: TimeGridEvent) => boolean;
	formatTime: (time: string) => string;
	parseTimeToMinutes: (time?: string) => number;
	onSelectDay: (day: Date) => void;
	onEventClick: (event: TimeGridEvent) => void;
	onSlotClick?: (day: Date, hour: number) => void;
}

export function DayView(props: DayViewProps) {
	return <TimeGridWeekView {...props} singleDay />;
}

export default DayView;
