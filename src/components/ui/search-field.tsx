"use client";

import { Search } from "lucide-react";
import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SearchFieldProps = Omit<ComponentProps<typeof Input>, "type"> & {
	containerClassName?: string;
};

/**
 * Canonical search input. Always use this instead of overlaying a Search icon
 * on `shad-input` — that class zeros horizontal padding and hides placeholder text.
 */
export function SearchField({
	className,
	containerClassName,
	...props
}: SearchFieldProps) {
	return (
		<div
			className={cn(
				"relative rounded-md border border-slate-300 bg-white/70",
				containerClassName,
			)}
		>
			<Search
				className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500"
				aria-hidden
			/>
			<Input
				type="search"
				data-with-leading-icon="true"
				className={cn(
					"h-12 border-0 bg-transparent pl-12! shadow-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
					className,
				)}
				{...props}
			/>
		</div>
	);
}
