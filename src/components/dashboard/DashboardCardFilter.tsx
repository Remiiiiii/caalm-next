"use client";

import { ChevronDown, Filter, ListFilter, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	AppDropdownMenuCheckboxItem,
	AppDropdownMenuContent,
	AppDropdownMenuTrigger,
	DropdownMenu,
	DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export type DashboardCardFilterOption<T extends string> = {
	value: T;
	label: string;
	icon: LucideIcon;
};

type DashboardCardFilterProps<T extends string> = {
	label: string;
	options: DashboardCardFilterOption<T>[];
	selected: T | "all";
	onChange: (value: T | "all") => void;
};

export function DashboardCardFilter<T extends string>({
	label,
	options,
	selected,
	onChange,
}: DashboardCardFilterProps<T>) {
	const active = selected !== "all";

	return (
		<DropdownMenu>
			<AppDropdownMenuTrigger
				asChild
				className="border-0 bg-transparent p-0 shadow-none ring-0 hover:bg-transparent data-[state=open]:bg-transparent"
			>
				<Button
					variant="ghost"
					size="sm"
					className="primary-btn h-8 border-0 px-3 shadow-none focus-visible:ring-0 sm:px-4"
					aria-label={label}
				>
					<Filter className="h-4 w-4" />
					Filter
					{active ? " (1)" : ""}
					<ChevronDown className="h-4 w-4" />
				</Button>
			</AppDropdownMenuTrigger>
			<AppDropdownMenuContent align="end" className="w-56 p-1">
				<DropdownMenuLabel className="sidebar-gradient-text">
					{label}
				</DropdownMenuLabel>
				<AppDropdownMenuCheckboxItem
					icon={ListFilter}
					checked={!active}
					onCheckedChange={() => onChange("all")}
				>
					All
				</AppDropdownMenuCheckboxItem>
				{options.map((option) => (
					<AppDropdownMenuCheckboxItem
						key={option.value}
						icon={option.icon}
						checked={selected === option.value}
						onCheckedChange={(checked) =>
							onChange(checked ? option.value : "all")
						}
					>
						{option.label}
					</AppDropdownMenuCheckboxItem>
				))}
			</AppDropdownMenuContent>
		</DropdownMenu>
	);
}
