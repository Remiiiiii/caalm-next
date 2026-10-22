import type { ReactNode } from "react";
import { CaalmDataTableSkeleton } from "@/components/ui/caalm-data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Loading placeholders that follow the real layout: the same glass card shell
 * (cap + padding) with inner skeleton lines where the title, values, rows and
 * tables will be. Never a single large blank block.
 */

/** Glass card shell with a skeleton title (and optional sub-label) above `children`. */
export function GlassCardSkeleton({
	title = true,
	subtitle = true,
	className,
	children,
}: {
	title?: boolean;
	subtitle?: boolean;
	className?: string;
	children?: ReactNode;
}) {
	return (
		<Card className={cn("glass-card h-full", className)} aria-hidden>
			<div className="glass-card-cap" />
			<CardContent className="flex h-full flex-col gap-4 p-4 sm:p-6">
				{title ? (
					<div className="space-y-2">
						<Skeleton className="h-5 w-40" />
						{subtitle ? <Skeleton className="h-3 w-56 max-w-full" /> : null}
					</div>
				) : null}
				{children}
			</CardContent>
		</Card>
	);
}

/** Mirrors `MetricStatCard`: icon + title, big value, description, optional bar, rows. */
export function MetricCardSkeleton({
	rows = 3,
	bar = false,
}: {
	rows?: number;
	bar?: boolean;
}) {
	return (
		<Card className="glass-card h-full" aria-hidden>
			<div className="glass-card-cap" />
			<CardContent className="mt-4 flex h-full flex-col gap-2 px-4 pb-6 pt-6">
				<div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
					<Skeleton className="h-8 w-8 rounded-lg" />
					<Skeleton className="h-5 w-32" />
				</div>
				<Skeleton className="mt-1 h-8 w-28" />
				<Skeleton className="h-3 w-44 max-w-full" />
				<div className="mt-auto space-y-2 pt-3">
					{bar ? <Skeleton className="h-2 w-full rounded-full" /> : null}
					{Array.from({ length: rows }).map((_, i) => (
						<div
							key={`row-${i}`}
							className="flex items-center justify-between border-t border-slate-200 pt-2"
						>
							<Skeleton className="h-3 w-28" />
							<Skeleton className="h-3 w-8" />
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

/** Label + value line with a bar underneath, repeated. */
export function BarRowsSkeleton({ rows = 3 }: { rows?: number }) {
	return (
		<div className="flex flex-col gap-4">
			{Array.from({ length: rows }).map((_, i) => (
				<div key={`bar-${i}`} className="space-y-1.5">
					<div className="flex items-center justify-between">
						<Skeleton className="h-3 w-32" />
						<Skeleton className="h-3 w-8" />
					</div>
					<Skeleton className="h-3 w-full rounded-full" />
				</div>
			))}
		</div>
	);
}

/** Glass card holding a table skeleton (the Assign Tasks table loading style). */
export function TableCardSkeleton({
	columns,
	rows = 4,
	toolbar = false,
}: {
	columns: number;
	rows?: number;
	toolbar?: boolean;
}) {
	return (
		<GlassCardSkeleton>
			{toolbar ? (
				<div className="flex items-center justify-between gap-3">
					<Skeleton className="h-9 w-64 max-w-full rounded-lg" />
					<Skeleton className="h-8 w-56 rounded-full" />
				</div>
			) : null}
			<CaalmDataTableSkeleton columns={columns} rows={rows} className="pt-0" />
		</GlassCardSkeleton>
	);
}
