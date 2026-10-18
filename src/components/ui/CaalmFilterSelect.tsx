"use client";

/**
 * Design-system filter dropdown — same as Assign Tasks filter pills.
 * Use for toolbar / filter-row selects. Prefer this over raw `Select` there.
 * Glass panel comes from shared `DropdownMenuContent` (no card-cap).
 */
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { useState } from "react";
import {
	DROPDOWN_ITEM_LABEL_CLASS,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	FILTER_DOCK_TRIGGER,
	FILTER_PILL_TRIGGER,
} from "@/components/ui/filter-pill";
import { cn } from "@/lib/utils";

export type CaalmFilterOption<T extends string> = {
	value: T;
	label: string;
};

export function CaalmFilterSelect<T extends string>({
	value,
	options,
	onChange,
	ariaLabel,
	triggerLabel,
	icon: Icon,
	variant = "filter",
	open: openProp,
	onOpenChange,
}: {
	value: T;
	options: Array<CaalmFilterOption<T>>;
	onChange: (value: T) => void;
	ariaLabel: string;
	/** When set, always show this label on the trigger (e.g. bulk “Set status”) */
	triggerLabel?: string;
	icon?: LucideIcon;
	variant?: "filter" | "dock";
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const controlled = openProp !== undefined;
	const open = controlled ? openProp : uncontrolledOpen;
	const setOpen = (next: boolean) => {
		if (!controlled) setUncontrolledOpen(next);
		onOpenChange?.(next);
	};
	const selected =
		triggerLabel ||
		options.find((o) => o.value === value)?.label ||
		options[0]?.label;

	const isDock = variant === "dock";

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label={ariaLabel}
					className={isDock ? FILTER_DOCK_TRIGGER : FILTER_PILL_TRIGGER}
				>
					{Icon ? (
						<Icon className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
					) : null}
					<span className="max-w-[10rem] truncate">{selected}</span>
					<ChevronDown
						className={cn(
							"h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-200",
							open && "rotate-180",
						)}
						aria-hidden
					/>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="min-w-[10rem]">
				{options.map((opt) => (
					<DropdownMenuItem
						key={opt.value}
						className="cursor-pointer gap-2"
						onSelect={() => {
							onChange(opt.value);
							setOpen(false);
						}}
					>
						<span className={cn("flex-1", DROPDOWN_ITEM_LABEL_CLASS)}>
							{opt.label}
						</span>
						{opt.value === value && !triggerLabel ? (
							<Check className="h-4 w-4 text-[#0f5384]" aria-hidden />
						) : null}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
