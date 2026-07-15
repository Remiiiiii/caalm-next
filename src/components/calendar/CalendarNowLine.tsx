"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CalendarNowLineProps {
	/** Hour the grid starts (e.g. 6) */
	startHour: number;
	/** Hour the grid ends exclusive (e.g. 22) */
	endHour: number;
	/** Height of one hour row in px */
	hourHeight: number;
	className?: string;
}

function minutesSinceMidnight(d: Date): number {
	return d.getHours() * 60 + d.getMinutes();
}

export function CalendarNowLine({
	startHour,
	endHour,
	hourHeight,
	className,
}: CalendarNowLineProps) {
	const [now, setNow] = useState(() => new Date());

	useEffect(() => {
		const id = window.setInterval(() => setNow(new Date()), 60_000);
		return () => window.clearInterval(id);
	}, []);

	const mins = minutesSinceMidnight(now);
	const startMins = startHour * 60;
	const endMins = endHour * 60;
	if (mins < startMins || mins > endMins) return null;

	const top = ((mins - startMins) / 60) * hourHeight;

	return (
		<div
			className={cn(
				"pointer-events-none absolute left-0 right-0 z-20 flex items-center",
				className,
			)}
			style={{ top }}
			aria-hidden
		>
			<div className="w-2.5 h-2.5 rounded-full bg-red -ml-1 shrink-0" />
			<div className="flex-1 h-[2px] bg-red" />
		</div>
	);
}

export default CalendarNowLine;
