"use client";

/**
 * CAALM date picker — same UI as New Note → “Pick a date”
 * (month/year caption menus + day grid).
 */

import { format, parse } from "date-fns";
import { CalendarIcon, ChevronDown, ChevronUp } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DropdownScrollArea } from "@/components/ui/DropdownScrollArea";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DEFAULT_YEAR_START = 2020;
const DEFAULT_YEAR_END = new Date().getFullYear() + 20;

export function parseIsoDateLocal(value: string): Date | undefined {
	if (!value) return undefined;
	const parsed = parse(value, "yyyy-MM-dd", new Date());
	if (Number.isNaN(parsed.getTime())) return undefined;
	return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function toIsoDateLocal(date: Date): string {
	return format(
		new Date(date.getFullYear(), date.getMonth(), date.getDate()),
		"yyyy-MM-dd",
	);
}

function CaptionMenu({
	open,
	onOpenChange,
	label,
	ariaLabel,
	children,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	label: string;
	ariaLabel: string;
	children: ReactNode;
}) {
	const Chevron = open ? ChevronUp : ChevronDown;

	return (
		<Popover open={open} onOpenChange={onOpenChange} modal={false}>
			<PopoverTrigger asChild>
				<button
					type="button"
					aria-label={ariaLabel}
					aria-expanded={open}
					className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-sm font-semibold sidebar-gradient-text transition-colors duration-200 hover:bg-[#0f5384]/10"
				>
					<span>{label}</span>
					<Chevron className="h-3.5 w-3.5 shrink-0 text-[#0f5384]" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				sideOffset={4}
				className="w-auto overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
			>
				<DropdownScrollArea maxHeightClassName="max-h-56">
					{children}
				</DropdownScrollArea>
			</PopoverContent>
		</Popover>
	);
}

export type CaalmCalendarPanelProps = {
	/** Selected day (local calendar date). */
	selected?: Date;
	onSelect: (date: Date | undefined) => void;
	disablePast?: boolean;
	yearStart?: number;
	yearEnd?: number;
	className?: string;
};

/** Month/year captions + day grid — use inside a popover or inline panel. */
export function CaalmCalendarPanel({
	selected,
	onSelect,
	disablePast = false,
	yearStart = DEFAULT_YEAR_START,
	yearEnd = DEFAULT_YEAR_END,
	className,
}: CaalmCalendarPanelProps) {
	const years = useMemo(
		() =>
			Array.from({ length: yearEnd - yearStart + 1 }, (_, i) => yearStart + i),
		[yearStart, yearEnd],
	);
	const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);
	const startMonth = useMemo(() => new Date(yearStart, 0), [yearStart]);
	const endMonth = useMemo(() => new Date(yearEnd, 11), [yearEnd]);

	const [displayMonth, setDisplayMonth] = useState(() =>
		selected
			? new Date(selected.getFullYear(), selected.getMonth(), 1)
			: new Date(),
	);
	const [monthOpen, setMonthOpen] = useState(false);
	const [yearOpen, setYearOpen] = useState(false);

	useEffect(() => {
		if (!selected) return;
		setDisplayMonth((prev) => {
			if (
				prev.getFullYear() === selected.getFullYear() &&
				prev.getMonth() === selected.getMonth()
			) {
				return prev;
			}
			return new Date(selected.getFullYear(), selected.getMonth(), 1);
		});
	}, [selected]);

	return (
		<div className={cn("w-auto", className)}>
			<div className="flex items-center justify-center gap-2 px-3 pt-3">
				<CaptionMenu
					open={monthOpen}
					onOpenChange={(next) => {
						setMonthOpen(next);
						if (next) setYearOpen(false);
					}}
					label={format(displayMonth, "MMMM")}
					ariaLabel="Select month"
				>
					<div className="flex min-w-[8.5rem] flex-col gap-0.5">
						{months.map((monthIndex) => {
							const isActive = displayMonth.getMonth() === monthIndex;
							return (
								<button
									key={monthIndex}
									type="button"
									onClick={() => {
										setDisplayMonth(
											new Date(displayMonth.getFullYear(), monthIndex, 1),
										);
										setMonthOpen(false);
									}}
									className={cn(
										"rounded-lg px-3 py-1.5 text-left text-sm font-medium transition-colors duration-200",
										isActive
											? "bg-[#0f5384] text-white"
											: "text-slate-700 hover:bg-[#0f5384]/10 hover:text-[#0f5384]",
									)}
								>
									{format(new Date(2026, monthIndex, 1), "MMMM")}
								</button>
							);
						})}
					</div>
				</CaptionMenu>

				<CaptionMenu
					open={yearOpen}
					onOpenChange={(next) => {
						setYearOpen(next);
						if (next) setMonthOpen(false);
					}}
					label={String(displayMonth.getFullYear())}
					ariaLabel="Select year"
				>
					<div className="flex min-w-[5.5rem] flex-col gap-0.5">
						{years.map((year) => {
							const isActive = displayMonth.getFullYear() === year;
							return (
								<button
									key={year}
									type="button"
									onClick={() => {
										setDisplayMonth(new Date(year, displayMonth.getMonth(), 1));
										setYearOpen(false);
									}}
									className={cn(
										"rounded-lg px-3 py-1.5 text-left text-sm font-medium transition-colors duration-200",
										isActive
											? "bg-[#0f5384] text-white"
											: "text-slate-700 hover:bg-[#0f5384]/10 hover:text-[#0f5384]",
									)}
								>
									{year}
								</button>
							);
						})}
					</div>
				</CaptionMenu>
			</div>

			<Calendar
				mode="single"
				selected={selected}
				month={displayMonth}
				onMonthChange={setDisplayMonth}
				startMonth={startMonth}
				endMonth={endMonth}
				hideNavigation
				disabled={(date) => {
					const check = new Date(date);
					check.setHours(0, 0, 0, 0);
					if (
						check.getFullYear() < yearStart ||
						check.getFullYear() > yearEnd
					) {
						return true;
					}
					if (!disablePast) return false;
					const today = new Date();
					today.setHours(0, 0, 0, 0);
					return check < today;
				}}
				onSelect={(date) => {
					if (!date) {
						onSelect(undefined);
						return;
					}
					onSelect(
						new Date(date.getFullYear(), date.getMonth(), date.getDate()),
					);
				}}
			/>
		</div>
	);
}

export type CaalmDatePickerProps = {
	/** ISO date `yyyy-MM-dd`, or empty string when unset. */
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	disablePast?: boolean;
	yearStart?: number;
	yearEnd?: number;
	className?: string;
	id?: string;
	/** Compact trigger height (h-8) for dense panels like the assistant. */
	size?: "default" | "sm";
};

/** Button + popover date field matching New Note → Pick a date. */
export function CaalmDatePicker({
	value,
	onChange,
	placeholder = "Pick a date",
	disabled,
	disablePast = false,
	yearStart,
	yearEnd,
	className,
	id,
	size = "default",
}: CaalmDatePickerProps) {
	const selected = useMemo(() => parseIsoDateLocal(value), [value]);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					id={id}
					type="button"
					variant="outline"
					disabled={disabled}
					className={cn(
						"w-full justify-start bg-white px-3 text-left font-normal text-slate-700 border-[0.25px] border-slate-300 hover:border-blue-300",
						size === "sm" ? "h-8 gap-2 text-xs" : "h-10",
						className,
					)}
				>
					<CalendarIcon
						className={cn(
							"shrink-0 text-slate-500",
							size === "sm" ? "h-3.5 w-3.5" : "mr-2 h-4 w-4",
						)}
					/>
					{selected ? (
						format(selected, "MMM d, yyyy")
					) : (
						<span className="text-slate-500">{placeholder}</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-auto rounded-xl border border-slate-200 bg-white p-0 shadow-lg"
			>
				<CaalmCalendarPanel
					selected={selected}
					disablePast={disablePast}
					yearStart={yearStart}
					yearEnd={yearEnd}
					onSelect={(date) => {
						onChange(date ? toIsoDateLocal(date) : "");
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}
