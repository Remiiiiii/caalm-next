"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchField } from "@/components/ui/search-field";
import { cn } from "@/lib/utils";
import {
	getTimezoneOffsetLabel,
	listIanaTimezones,
} from "@/lib/timezone";

type TimezoneSelectProps = {
	id?: string;
	value: string;
	onValueChange: (value: string) => void;
	disabled?: boolean;
};

export function TimezoneSelect({
	id,
	value,
	onValueChange,
	disabled,
}: TimezoneSelectProps) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const options = useMemo(() => listIanaTimezones(), []);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return options;
		return options.filter(
			(opt) =>
				opt.value.toLowerCase().includes(q) ||
				opt.city.toLowerCase().includes(q) ||
				opt.region.toLowerCase().includes(q) ||
				opt.label.toLowerCase().includes(q),
		);
	}, [options, query]);

	const grouped = useMemo(() => {
		const map = new Map<string, typeof filtered>();
		for (const opt of filtered) {
			const list = map.get(opt.region) ?? [];
			list.push(opt);
			map.set(opt.region, list);
		}
		return Array.from(map.entries());
	}, [filtered]);

	const selectedLabel = value
		? getTimezoneOffsetLabel(value)
		: "Select timezone";

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					id={id}
					type="button"
					variant="outline"
					disabled={disabled}
					role="combobox"
					aria-expanded={open}
					className="h-10 w-full justify-between bg-white !border !border-solid !border-slate-200 font-normal text-slate-700 cursor-pointer"
				>
					<span className="truncate">{selectedLabel}</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-500" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-[var(--radix-popover-trigger-width)] p-2 bg-white"
			>
				<SearchField
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search timezones..."
					className="h-10"
				/>
				<div className="mt-2 max-h-64 overflow-y-auto">
					{grouped.length === 0 && (
						<p className="px-2 py-3 text-sm text-slate-500">No matches.</p>
					)}
					{grouped.map(([region, items]) => (
						<div key={region} className="mb-2">
							<p className="px-2 py-1 text-xs font-medium text-slate-500">
								{region}
							</p>
							{items.map((opt) => {
								const selected = opt.value === value;
								return (
									<button
										key={opt.value}
										type="button"
										className={cn(
											"flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-blue-50",
											selected && "bg-blue-50",
										)}
										onClick={() => {
											onValueChange(opt.value);
											setOpen(false);
											setQuery("");
										}}
									>
										<Check
											className={cn(
												"h-4 w-4 shrink-0 text-[#0f5384]",
												selected ? "opacity-100" : "opacity-0",
											)}
										/>
										<span className="truncate">{opt.label}</span>
									</button>
								);
							})}
						</div>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
