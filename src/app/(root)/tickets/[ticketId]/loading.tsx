import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function SkeletonCard({ children }: { children: React.ReactNode }) {
	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="space-y-3 p-4 sm:p-6">{children}</CardContent>
		</Card>
	);
}

/** Mirrors the ticket page: header, detail card, then the sidebar cards. */
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
			<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
				<div className="min-w-0 space-y-5">
					<SkeletonCard>
						<div className="grid grid-cols-3 gap-4">
							{Array.from({ length: 6 }).map((_, i) => (
								<Skeleton key={`meta-${i}`} className="h-3 w-[60px]" />
							))}
						</div>
						<div className="flex items-center gap-3 pt-2">
							<Skeleton className="h-[34px] w-[34px] rounded-full" />
							<div className="space-y-1.5">
								<Skeleton className="h-3 w-[120px]" />
								<Skeleton className="h-2.5 w-20" />
							</div>
						</div>
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-4/5" />
						<Skeleton className="h-4 w-3/5" />
					</SkeletonCard>
				</div>
				<div className="space-y-5">
					<SkeletonCard>
						<Skeleton className="h-[38px] w-full" />
						<Skeleton className="h-[38px] w-full" />
					</SkeletonCard>
					<SkeletonCard>
						<Skeleton className="h-5 w-40" />
					</SkeletonCard>
					<SkeletonCard>
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={`audit-${i}`} className="flex items-center gap-2">
								<Skeleton className="h-[22px] w-[22px] rounded-full" />
								<div className="space-y-1.5">
									<Skeleton className="h-3 w-32" />
									<Skeleton className="h-2.5 w-24" />
								</div>
							</div>
						))}
					</SkeletonCard>
				</div>
			</div>
		</div>
	);
}
