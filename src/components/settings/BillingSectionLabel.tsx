"use client";

import { cn } from "@/lib/utils";

export function BillingSectionLabel({
	children,
	className,
}: {
	children: string;
	className?: string;
}) {
	return (
		<p
			className={cn(
				"text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500",
				className,
			)}
		>
			{children}
		</p>
	);
}
