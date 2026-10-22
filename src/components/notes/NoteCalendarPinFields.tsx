"use client";

import { isToday } from "date-fns";
import { CalendarDays, Clock, StickyNote } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	CaalmDatePicker,
	parseIsoDateLocal,
} from "@/components/ui/caalm-date-picker";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { cn } from "@/lib/utils";

export type NotePinMode = "dashboard" | "calendar";

export const NOTE_PIN_PAST_TIME_ERROR =
	"Time must be in the future for today's date.";

/** Note pin calendar window (matches prior New Note picker). */
const NOTE_YEAR_START = 2026;
const NOTE_YEAR_END = NOTE_YEAR_START + 20;

const HOURS = Array.from({ length: 12 }, (_, i) =>
	String(i + 1).padStart(2, "0"),
);
const MINUTES = Array.from({ length: 60 }, (_, i) =>
	String(i).padStart(2, "0"),
);
const PERIODS = ["AM", "PM"] as const;

type Period = (typeof PERIODS)[number];

function parseTime24(value: string): {
	hour12: string;
	minute: string;
	period: Period;
} {
	const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
	if (!match) {
		return { hour12: "09", minute: "00", period: "AM" };
	}
	const hour24 = Number(match[1]);
	const minute = match[2];
	const period: Period = hour24 >= 12 ? "PM" : "AM";
	const hour12Num = hour24 % 12 === 0 ? 12 : hour24 % 12;
	return {
		hour12: String(hour12Num).padStart(2, "0"),
		minute: minute.padStart(2, "0"),
		period,
	};
}

function toTime24(hour12: string, minute: string, period: Period): string {
	let hour = Number(hour12) % 12;
	if (period === "PM") hour += 12;
	return `${String(hour).padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

function formatTimeDisplay(value: string): string {
	const { hour12, minute, period } = parseTime24(value);
	return `${hour12}:${minute} ${period}`;
}

/** True when date is today and HH:mm is not after the current local time. */
export function isNotePinDateTimeInPast(date: string, time: string): boolean {
	const day = parseIsoDateLocal(date);
	if (!day || !time || !isToday(day)) return false;
	const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
	if (!match) return false;
	const now = new Date();
	const selected = new Date(day);
	selected.setHours(Number(match[1]), Number(match[2]), 0, 0);
	return selected.getTime() <= now.getTime();
}

function minutesFromMidnight(time24: string): number {
	const match = /^(\d{1,2}):(\d{2})$/.exec(time24.trim());
	if (!match) return 0;
	return Number(match[1]) * 60 + Number(match[2]);
}

function getNowMinutes(now = new Date()): number {
	return now.getHours() * 60 + now.getMinutes();
}

/** Next whole minute after now, as HH:mm (24h). */
function nextFutureTime24(now = new Date()): string {
	const next = new Date(now);
	next.setSeconds(0, 0);
	next.setMinutes(next.getMinutes() + 1);
	return `${String(next.getHours()).padStart(2, "0")}:${String(next.getMinutes()).padStart(2, "0")}`;
}

function isAtOrBeforeNow(
	hour12: string,
	minute: string,
	period: Period,
	nowMinutes: number,
): boolean {
	return minutesFromMidnight(toTime24(hour12, minute, period)) <= nowMinutes;
}

/** Hour is muted when every minute in that hour+period is already past. */
function isHourPast(
	hour12: string,
	period: Period,
	nowMinutes: number,
): boolean {
	return isAtOrBeforeNow(hour12, "59", period, nowMinutes);
}

/** Period is muted when no future time remains in AM or PM. */
function isPeriodPast(period: Period, nowMinutes: number): boolean {
	return HOURS.every((hour12) => isHourPast(hour12, period, nowMinutes));
}

function firstAvailableMinute(
	hour12: string,
	period: Period,
	nowMinutes: number,
): string | null {
	for (const minute of MINUTES) {
		if (!isAtOrBeforeNow(hour12, minute, period, nowMinutes)) {
			return minute;
		}
	}
	return null;
}

function firstAvailableTimeInPeriod(
	period: Period,
	nowMinutes: number,
	preferredHour12?: string,
	preferredMinute?: string,
): string | null {
	const hourOrder = preferredHour12
		? [preferredHour12, ...HOURS.filter((hour) => hour !== preferredHour12)]
		: [...HOURS];

	for (const hour12 of hourOrder) {
		if (isHourPast(hour12, period, nowMinutes)) continue;
		if (
			preferredHour12 === hour12 &&
			preferredMinute &&
			!isAtOrBeforeNow(hour12, preferredMinute, period, nowMinutes)
		) {
			return toTime24(hour12, preferredMinute, period);
		}
		const minute = firstAvailableMinute(hour12, period, nowMinutes);
		if (minute) return toTime24(hour12, minute, period);
	}
	return null;
}

/** Live local clock in minutes-from-midnight; -1 when not restricting to future. */
function useLiveNowMinutes(enabled: boolean): number {
	const [nowMinutes, setNowMinutes] = useState(() => getNowMinutes());

	useEffect(() => {
		if (!enabled) return;
		const tick = () => setNowMinutes(getNowMinutes());
		tick();
		const id = window.setInterval(tick, 1000);
		return () => window.clearInterval(id);
	}, [enabled]);

	return enabled ? nowMinutes : -1;
}

function TimeColumn({
	options,
	selected,
	onSelect,
	ariaLabel,
	isOptionMuted,
}: {
	options: readonly string[];
	selected: string;
	onSelect: (value: string) => void;
	ariaLabel: string;
	isOptionMuted?: (option: string) => boolean;
}) {
	const selectedRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		selectedRef.current?.scrollIntoView({ block: "nearest" });
	}, [selected]);

	return (
		<div
			role="listbox"
			aria-label={ariaLabel}
			className="h-[180px] w-12 overflow-y-auto rounded-lg"
		>
			{options.map((option) => {
				const isSelected = option === selected;
				const muted = isOptionMuted?.(option) ?? false;
				return (
					<button
						key={option}
						ref={isSelected && !muted ? selectedRef : undefined}
						type="button"
						role="option"
						aria-selected={isSelected}
						aria-disabled={muted}
						disabled={muted}
						onClick={() => {
							if (!muted) onSelect(option);
						}}
						className={cn(
							"flex h-9 w-full items-center justify-center rounded-lg text-sm font-medium transition-colors duration-200",
							muted && "cursor-not-allowed text-slate-300",
							!muted && isSelected && "bg-[#0f5384] text-white",
							!muted &&
								!isSelected &&
								"text-slate-700 hover:bg-[#0f5384]/10 hover:text-[#0f5384]",
						)}
					>
						{option}
					</button>
				);
			})}
		</div>
	);
}

function NoteTimePicker({
	value,
	onChange,
	restrictToFuture,
	hasPastError,
}: {
	value: string;
	onChange: (value: string) => void;
	restrictToFuture: boolean;
	hasPastError: boolean;
}) {
	const [open, setOpen] = useState(false);
	const nowMinutes = useLiveNowMinutes(restrictToFuture);
	const parsed = parseTime24(value || "09:00");
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

	// Keep today's selection in the future as the clock moves (e.g. 09:00 AM → 07:01 PM)
	useEffect(() => {
		if (!restrictToFuture) return;
		const current = value || "09:00";
		const { hour12, minute, period } = parseTime24(current);
		if (!isAtOrBeforeNow(hour12, minute, period, nowMinutes)) return;
		onChangeRef.current(nextFutureTime24());
	}, [restrictToFuture, nowMinutes, value]);

	const commit = (hour12: string, minute: string, period: Period) => {
		if (!restrictToFuture) {
			onChange(toTime24(hour12, minute, period));
			return;
		}
		if (isPeriodPast(period, nowMinutes)) return;
		if (!isAtOrBeforeNow(hour12, minute, period, nowMinutes)) {
			onChange(toTime24(hour12, minute, period));
			return;
		}
		// Hour/period chosen but minute (or whole hour) is past — jump to first open slot
		const bumped = firstAvailableTimeInPeriod(
			period,
			nowMinutes,
			hour12,
			minute,
		);
		if (bumped) onChange(bumped);
	};

	return (
		<div className="space-y-1.5">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant="outline"
						className={cn(
							"h-10 w-full justify-between bg-white px-3 font-normal text-slate-700 border-[0.25px] border-slate-300 hover:border-blue-300",
							hasPastError && "border-red/40 hover:border-red/50",
						)}
					>
						<span>{formatTimeDisplay(value || "09:00")}</span>
						<Clock className="h-4 w-4 shrink-0 text-slate-500" />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					align="start"
					className="w-auto rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
				>
					<div className="flex gap-2">
						<TimeColumn
							ariaLabel="Hour"
							options={HOURS}
							selected={parsed.hour12}
							onSelect={(hour12) =>
								commit(hour12, parsed.minute, parsed.period)
							}
							isOptionMuted={(hour12) =>
								restrictToFuture &&
								isHourPast(hour12, parsed.period, nowMinutes)
							}
						/>
						<TimeColumn
							ariaLabel="Minute"
							options={MINUTES}
							selected={parsed.minute}
							onSelect={(minute) =>
								commit(parsed.hour12, minute, parsed.period)
							}
							isOptionMuted={(minute) =>
								restrictToFuture &&
								isAtOrBeforeNow(
									parsed.hour12,
									minute,
									parsed.period,
									nowMinutes,
								)
							}
						/>
						<TimeColumn
							ariaLabel="AM or PM"
							options={PERIODS}
							selected={parsed.period}
							onSelect={(period) =>
								commit(parsed.hour12, parsed.minute, period as Period)
							}
							isOptionMuted={(period) =>
								restrictToFuture && isPeriodPast(period as Period, nowMinutes)
							}
						/>
					</div>
				</PopoverContent>
			</Popover>
			{hasPastError ? (
				<p className="text-xs text-red" role="alert">
					{NOTE_PIN_PAST_TIME_ERROR}
				</p>
			) : null}
		</div>
	);
}

export function NoteCalendarPinFields({
	mode,
	onModeChange,
	date,
	time,
	onDateChange,
	onTimeChange,
}: {
	mode: NotePinMode;
	onModeChange: (mode: NotePinMode) => void;
	date: string;
	time: string;
	onDateChange: (value: string) => void;
	onTimeChange: (value: string) => void;
}) {
	const selectedDay = parseIsoDateLocal(date);
	const restrictToFuture = Boolean(selectedDay && isToday(selectedDay));
	const hasPastError =
		mode === "calendar" && isNotePinDateTimeInPast(date, time);

	return (
		<div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
			<SegmentedToggle
				ariaLabel="Note destination"
				value={mode}
				onChange={onModeChange}
				className="w-full"
				tabs={[
					{ value: "dashboard", label: "Dashboard only", icon: StickyNote },
					{ value: "calendar", label: "Pin to calendar", icon: CalendarDays },
				]}
			/>
			{mode === "calendar" ? (
				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-1.5">
						<Label className="text-xs text-slate-600">Date</Label>
						<CaalmDatePicker
							value={date}
							onChange={onDateChange}
							disablePast
							yearStart={NOTE_YEAR_START}
							yearEnd={NOTE_YEAR_END}
						/>
					</div>
					<div className="space-y-1.5">
						<Label className="text-xs text-slate-600">Time</Label>
						<NoteTimePicker
							value={time}
							onChange={onTimeChange}
							restrictToFuture={restrictToFuture}
							hasPastError={hasPastError}
						/>
					</div>
				</div>
			) : null}
		</div>
	);
}
