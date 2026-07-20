"use client";

import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { DayButtonProps } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CALENDAR_SOURCE_STYLES } from "@/components/calendar/eventChipStyles";

const MINI_CAL_TODAY_GRADIENT =
	"linear-gradient(135deg, #12477d 0%, #03afbf 100%)";

function MiniCalDayButton({
	day: _day,
	modifiers,
	...buttonProps
}: DayButtonProps) {
	const ref = useRef<HTMLButtonElement>(null);
	const showGradient =
		Boolean(modifiers.selected) ||
		(Boolean(modifiers.today) && !modifiers.outside);

	useEffect(() => {
		if (modifiers.focused) ref.current?.focus();
	}, [modifiers.focused]);

	return (
		<button
			ref={ref}
			{...buttonProps}
			style={{
				...buttonProps.style,
				...(showGradient
					? {
							background: MINI_CAL_TODAY_GRADIENT,
							color: "#fff",
							border: "none",
						}
					: undefined),
			}}
		/>
	);
}

interface SharedCalendar {
	$id: string;
	name: string;
	ownerId: string;
	ownerName?: string;
	sharedWith?: string[];
}

interface CalendarSidebarProps {
	selectedMyCalendars: {
		calendar: boolean;
		usHolidays: boolean;
		resources: boolean;
	};
	selectedSharedCalendars: string[];
	onMyCalendarChange: (
		calendar: "calendar" | "usHolidays" | "resources",
		checked: boolean,
	) => void;
	onSharedCalendarChange: (calendarId: string, checked: boolean) => void;
	sharedCalendars: SharedCalendar[];
	loadingSharedCalendars: boolean;
	selectedDate?: Date;
	currentMonth: Date;
	onSelectDate: (date: Date) => void;
	onMonthChange: (month: Date) => void;
	children?: React.ReactNode;
}

export const CalendarSidebar: React.FC<CalendarSidebarProps> = ({
	selectedMyCalendars,
	selectedSharedCalendars,
	onMyCalendarChange,
	onSharedCalendarChange,
	sharedCalendars,
	loadingSharedCalendars,
	selectedDate,
	currentMonth,
	onSelectDate,
	onMonthChange,
	children,
}) => {
	const [isMyCalendarsExpanded, setIsMyCalendarsExpanded] = useState(true);
	const [isSharedCalendarsExpanded, setIsSharedCalendarsExpanded] =
		useState(true);

	return (
		<aside className="w-full lg:w-62 lg:min-w-[242px] lg:max-w-[300px] border-b lg:border-b-0 lg:border-r border-slate-200 bg-white/50 flex flex-col min-w-0 shrink-0 overflow-hidden">
			<div className="p-3 sm:p-4 space-y-4 flex-1 overflow-y-auto min-w-0">
				<div className="rounded-lg border border-slate-200 bg-white/80 px-2 py-2 overflow-hidden min-w-0 w-full">
					<Calendar
						mode="single"
						selected={selectedDate}
						month={currentMonth}
						onMonthChange={onMonthChange}
						onSelect={(date) => {
							if (!date) return;
							onSelectDate(date);
							onMonthChange(date);
						}}
						components={{ DayButton: MiniCalDayButton }}
						className={cn(
							"caalm-mini-cal w-full max-w-full p-0 text-xs",
							"[&_.rdp-month_caption]:text-sm [&_.rdp-month_caption]:font-semibold",
							"[&_.rdp-caption_label]:truncate [&_.rdp-caption_label]:max-w-full",
							"[&_.rdp-weekday]:text-[0.65rem] [&_.rdp-weekday]:font-medium [&_.rdp-weekday]:text-center",
							"[&_.rdp-day]:text-xs",
						)}
					/>
				</div>

				{/* My calendars section */}
				<div>
					<button
						type="button"
						onClick={() => setIsMyCalendarsExpanded(!isMyCalendarsExpanded)}
						className="flex items-center justify-between w-full text-left font-medium text-slate-700 hover:text-slate-900 mb-2 cursor-pointer transition-colors duration-200"
					>
						<span className="text-sm sidebar-gradient-text">My calendars</span>
						{isMyCalendarsExpanded ? (
							<ChevronUp className="h-4 w-4 text-slate-500" />
						) : (
							<ChevronDown className="h-4 w-4 text-slate-500" />
						)}
					</button>
					{isMyCalendarsExpanded && (
						<div className="space-y-2 ml-1">
							<div className="flex items-center space-x-2">
								<Checkbox
									className={`h-4 w-4 rounded-full cursor-pointer ${
										selectedMyCalendars.calendar ? "!bg-[#00c1cb]" : "bg-white"
									}`}
									id="calendar-main"
									checked={selectedMyCalendars.calendar}
									onCheckedChange={(checked) =>
										onMyCalendarChange("calendar", checked === true)
									}
								/>
								<span
									className="h-2 w-2 rounded-full shrink-0"
									style={{ backgroundColor: CALENDAR_SOURCE_STYLES.my.accent }}
									aria-hidden
								/>
								<Label
									htmlFor="calendar-main"
									className="text-xs font-normal cursor-pointer text-slate-700"
								>
									Calendar
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<Checkbox
									className={`h-4 w-4 rounded-full cursor-pointer ${
										selectedMyCalendars.usHolidays
											? "!bg-[#00c1cb]"
											: "bg-white"
									}`}
									id="calendar-holidays"
									checked={selectedMyCalendars.usHolidays}
									onCheckedChange={(checked) =>
										onMyCalendarChange("usHolidays", checked === true)
									}
								/>
								<span
									className="h-2 w-2 rounded-full shrink-0"
									style={{
										backgroundColor: CALENDAR_SOURCE_STYLES.holidays.accent,
									}}
									aria-hidden
								/>
								<Label
									htmlFor="calendar-holidays"
									className="text-xs font-normal cursor-pointer text-slate-700"
								>
									United States holidays
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<Checkbox
									className={`h-4 w-4 rounded-full cursor-pointer ${
										selectedMyCalendars.resources
											? "!bg-[#00c1cb]"
											: "bg-white"
									}`}
									id="calendar-resources"
									checked={selectedMyCalendars.resources}
									onCheckedChange={(checked) =>
										onMyCalendarChange("resources", checked === true)
									}
								/>
								<span
									className="h-2 w-2 rounded-full shrink-0"
									style={{
										backgroundColor: CALENDAR_SOURCE_STYLES.resource.accent,
									}}
									aria-hidden
								/>
								<Label
									htmlFor="calendar-resources"
									className="text-xs font-normal cursor-pointer text-slate-700"
								>
									Resources
								</Label>
							</div>
						</div>
					)}
				</div>

				{/* Shared Calendars section */}
				<div>
					<button
						type="button"
						onClick={() =>
							setIsSharedCalendarsExpanded(!isSharedCalendarsExpanded)
						}
						className="flex items-center justify-between w-full text-left font-medium text-slate-700 hover:text-slate-900 mb-2 cursor-pointer transition-colors duration-200"
					>
						<span className="text-sm sidebar-gradient-text">
							Shared calendars
						</span>
						{isSharedCalendarsExpanded ? (
							<ChevronUp className="h-4 w-4 text-slate-500" />
						) : (
							<ChevronDown className="h-4 w-4 text-slate-500" />
						)}
					</button>
					{isSharedCalendarsExpanded && (
						<div className="space-y-2 ml-1">
							{loadingSharedCalendars ? (
								<div className="text-sm text-slate-500 flex items-center gap-2">
									<Loader2 className="h-4 w-4 animate-spin shrink-0" />
									Loading...
								</div>
							) : sharedCalendars.length === 0 ? (
								<div className="text-sm text-slate-500">
									No shared calendars
								</div>
							) : (
								sharedCalendars.map((calendar) => {
									const isChecked = selectedSharedCalendars.includes(
										calendar.$id,
									);
									return (
										<div
											key={calendar.$id}
											className="flex items-center space-x-2"
										>
											<Checkbox
												className={`h-4 w-4 rounded-full cursor-pointer ${
													isChecked ? "!bg-[#00c1cb]" : "bg-white"
												}`}
												id={`shared-${calendar.$id}`}
												checked={isChecked}
												onCheckedChange={(checked) =>
													onSharedCalendarChange(calendar.$id, checked === true)
												}
											/>
											<span
												className="h-2 w-2 rounded-full shrink-0"
												style={{
													backgroundColor: CALENDAR_SOURCE_STYLES.shared.accent,
												}}
												aria-hidden
											/>
											<Label
												htmlFor={`shared-${calendar.$id}`}
												className="text-xs font-normal cursor-pointer text-slate-700 truncate"
											>
												{calendar.ownerName || calendar.name}
											</Label>
										</div>
									);
								})
							)}
						</div>
					)}
				</div>
			</div>

			{children ? (
				<div className="mt-auto border-t border-slate-200 p-3 space-y-2 bg-slate-50/80 [&_button]:w-full [&_button]:justify-start [&_button]:text-xs [&_button]:px-2">
					<p className="text-xs font-medium sidebar-gradient-text px-0.5 mb-1">
						Manage
					</p>
					{children}
				</div>
			) : null}
		</aside>
	);
};
