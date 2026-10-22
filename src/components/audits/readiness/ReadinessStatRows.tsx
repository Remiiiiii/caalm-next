"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ReadinessStatRow {
	label: string;
	value: ReactNode;
	/** Filtered list this count drills into. */
	href?: string;
	dot?: string;
}

/** Label / value rows split by slate-200 lines; each row drills into its list when `href` is set. */
export function ReadinessStatRows({
	top,
	rows,
}: {
	top?: ReactNode;
	rows: ReadinessStatRow[];
}) {
	return (
		<div className="w-full">
			{top ? <div className="mb-3">{top}</div> : null}
			{rows.map((row) => {
				const content = (
					<>
						<span className="inline-flex items-center gap-1.5 text-slate-600">
							{row.dot ? (
								<span
									className={cn("h-1.5 w-1.5 rounded-full", row.dot)}
									aria-hidden
								/>
							) : null}
							{row.label}
						</span>
						<span className="font-semibold tabular-nums text-slate-700">
							{row.value}
						</span>
					</>
				);
				const className =
					"flex items-center justify-between gap-3 border-t border-slate-200 py-2 text-xs";
				return row.href ? (
					<Link
						key={row.label}
						href={row.href}
						className={cn(
							className,
							"rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]",
						)}
					>
						{content}
					</Link>
				) : (
					<div key={row.label} className={className}>
						{content}
					</div>
				);
			})}
		</div>
	);
}
