import {
	MetricCardSkeleton,
	TableCardSkeleton,
} from "@/components/ui/glass-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the queue: header, 4 stat cards, then the table card with its toolbar. */
export default function TicketsLoading() {
	return (
		<div
			className="w-full px-4 sm:px-6 lg:px-8 xl:px-12"
			role="status"
			aria-busy="true"
			aria-label="Loading tickets"
		>
			<div className="mb-6 space-y-2">
				<h1 className="h1 capitalize sidebar-gradient-text">Tickets</h1>
				<Skeleton className="h-4 w-96 max-w-full" />
			</div>
			<div className="space-y-6">
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<MetricCardSkeleton key={`stat-${i}`} rows={0} />
					))}
				</div>
				<TableCardSkeleton columns={7} rows={6} toolbar />
			</div>
		</div>
	);
}
