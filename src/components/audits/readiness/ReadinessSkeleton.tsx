import { Card, CardContent } from "@/components/ui/card";
import {
	BarRowsSkeleton,
	GlassCardSkeleton,
	MetricCardSkeleton,
	TableCardSkeleton,
} from "@/components/ui/glass-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Page-load placeholder with the same grid as the real Audit Readiness page. */
export function ReadinessSkeleton() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Loading readiness"
			className="space-y-6"
		>
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-[1.7fr_1fr_1fr_1fr]">
				<Card className="glass-card h-full" aria-hidden>
					<div className="glass-card-cap" />
					<CardContent className="mt-4 flex h-full flex-col gap-3 px-4 pb-6 pt-6">
						<div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
							<div className="flex items-center gap-2.5">
								<Skeleton className="h-8 w-8 rounded-lg" />
								<Skeleton className="h-5 w-32" />
							</div>
							<Skeleton className="h-3 w-36" />
						</div>
						<div className="flex flex-wrap items-center gap-5">
							<Skeleton className="h-24 w-48 rounded-t-full" />
							<div className="flex min-w-0 flex-1 basis-56 flex-col gap-3">
								<Skeleton className="h-5 w-40" />
								<Skeleton className="h-3 w-full" />
								<Skeleton className="h-3 w-full" />
							</div>
						</div>
						<Skeleton className="mt-auto h-3 w-64 max-w-full" />
					</CardContent>
				</Card>
				<MetricCardSkeleton bar />
				<MetricCardSkeleton />
				<MetricCardSkeleton />
			</div>

			<div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
				<TableCardSkeleton columns={6} rows={3} />
				<GlassCardSkeleton subtitle={false}>
					<Skeleton className="h-3 w-full" />
					<Skeleton className="h-3 w-3/4" />
					<Skeleton className="min-h-32 w-full flex-1 rounded-lg" />
					<div className="flex flex-wrap gap-2">
						<Skeleton className="h-5 w-48 rounded-md" />
						<Skeleton className="h-5 w-40 rounded-md" />
					</div>
					<Skeleton className="h-10 w-full rounded-lg" />
				</GlassCardSkeleton>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				{[0, 1, 2].map((key) => (
					<GlassCardSkeleton key={key}>
						<BarRowsSkeleton rows={key === 2 ? 2 : 3} />
					</GlassCardSkeleton>
				))}
			</div>

			<div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-3">
				<div className="xl:col-span-2">
					<TableCardSkeleton columns={5} rows={4} toolbar />
				</div>
				<GlassCardSkeleton subtitle={false}>
					<Skeleton className="h-4 w-48" />
					<Skeleton className="h-5 w-28 rounded-full" />
					<div className="mt-auto space-y-2">
						{[0, 1, 2].map((key) => (
							<div
								key={key}
								className="flex items-center justify-between border-t border-slate-200 pt-2"
							>
								<Skeleton className="h-3 w-28" />
								<Skeleton className="h-3 w-12" />
							</div>
						))}
					</div>
				</GlassCardSkeleton>
			</div>

			<TableCardSkeleton columns={7} rows={2} toolbar />
		</div>
	);
}
