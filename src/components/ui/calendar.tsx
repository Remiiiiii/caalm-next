"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type * as React from "react";
import {
	type ChevronProps,
	DayPicker,
	type MonthCaptionProps,
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
					"rdp-button_previous shrink-0 text-slate-700 hover:text-slate-700",
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
					"rdp-button_next shrink-0 text-slate-700 hover:text-slate-700",
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

function EmptyNav(_props: NavProps) {
	return <></>;
}

function EmptyMonthCaption(_props: MonthCaptionProps) {
	return <></>;
}

export function Calendar({
	className,
	classNames,
	style,
	components,
	navLayout = "around",
	hideNavigation = false,
	...props
}: React.ComponentProps<typeof DayPicker> & {
	/** Hide month prev/next and caption (e.g. when a parent toolbar owns navigation). */
	hideNavigation?: boolean;
}) {
	return (
		<DayPicker
			showOutsideDays
			hideNavigation={hideNavigation}
			navLayout={hideNavigation ? undefined : navLayout}
			className={cn("p-3", className)}
			classNames={classNames}
			style={style}
			{...props}
			components={{
				...components,
				Chevron: CalendarChevron,
				Nav: hideNavigation ? EmptyNav : (components?.Nav ?? CustomNavbar),
				MonthCaption: hideNavigation
					? EmptyMonthCaption
					: components?.MonthCaption,
			}}
		/>
	);
}

export default Calendar;
