import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the ticket page: header, submitter bar, meta table, description, workspace. */
export default function TicketLoading() {
	return (
		<div
			className="w-full px-4 sm:px-6 lg:px-8 xl:px-12"
			role="status"
			aria-busy="true"
			aria-label="Loading ticket"
		>
			<div className="mb-4 space-y-2">
				<Skeleton className="h-3 w-40" />
				<h1 className="h1 capitalize sidebar-gradient-text">Ticket</h1>
				<Skeleton className="h-4 w-64" />
			</div>
			<div className="min-w-0 space-y-4">
				<div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/80 px-[18px] py-3">
					<Skeleton className="h-9 w-9 rounded-full" />
					<div className="space-y-1.5">
						<Skeleton className="h-3 w-[120px]" />
						<Skeleton className="h-2.5 w-20" />
					</div>
				</div>
				<div className="grid grid-cols-3 gap-4 rounded-xl border border-slate-200/80 bg-white/80 p-4 sm:grid-cols-6">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={`meta-${i}`} className="h-3 w-[60px]" />
					))}
				</div>
				<div className="space-y-2 px-0.5">
					<Skeleton className="h-5 w-48" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-3/5" />
				</div>
				<Skeleton className="h-64 w-full rounded-[14px]" />
			</div>
		</div>
	);
}
