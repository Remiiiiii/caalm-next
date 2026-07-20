"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type * as React from "react";
import {
	DayPicker,
	type ChevronProps,
	type NavProps,
} from "react-day-picker";
import "react-day-picker/style.css";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Thin stroke chevrons. Do not pass RDP's `rdp-chevron` className — that rule
 * sets `fill: accent` and turns Lucide strokes into solid triangles.
 */
function CalendarChevron({ orientation = "left", size = 16 }: ChevronProps) {
	const Icon = orientation === "right" ? ChevronRight : ChevronLeft;
	return (
		<Icon
			className="size-4 shrink-0 text-slate-700"
			size={size}
			strokeWidth={2}
			aria-hidden
		/>
	);
}

/** Used when navLayout is unset (Nav slot). */
function CustomNavbar(props: NavProps) {
	return (
		<nav className="rdp-nav">
			<button
				type="button"
				className={cn(
					buttonVariants({ variant: "ghost" }),
					"rdp-button_previous shrink-0 text-slate-700 hover:text-slate-900",
				)}
				aria-label="Previous Month"
				onClick={props.onPreviousClick}
				disabled={!props.previousMonth}
			>
				<ChevronLeft className="size-4 text-slate-700" strokeWidth={2} />
			</button>
			<button
				type="button"
				className={cn(
					buttonVariants({ variant: "ghost" }),
					"rdp-button_next shrink-0 text-slate-700 hover:text-slate-900",
				)}
				aria-label="Next Month"
				onClick={props.onNextClick}
				disabled={!props.nextMonth}
			>
				<ChevronRight className="size-4 text-slate-700" strokeWidth={2} />
			</button>
		</nav>
	);
}

export function Calendar({
	className,
	components,
	...props
}: React.ComponentProps<typeof DayPicker>) {
	return (
		<DayPicker
			showOutsideDays
			navLayout="around"
			className={cn("p-3", className)}
			{...props}
			components={{
				...components,
				Chevron: CalendarChevron,
				Nav: components?.Nav ?? CustomNavbar,
			}}
		/>
	);
}

export default Calendar;
