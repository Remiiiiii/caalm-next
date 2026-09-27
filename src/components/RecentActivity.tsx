"use client";

import {
	Activity,
	Bell,
	CalendarDays,
	FileText,
	FileUp,
	User,
} from "lucide-react";
import { useMemo, useState, type FC } from "react";
import {
	ActivityFeedList,
	collapseConsecutiveActivities,
} from "@/components/dashboard/ActivityFeedList";
import {
	DashboardCardFilter,
	type DashboardCardFilterOption,
} from "@/components/dashboard/DashboardCardFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";
import { ActivityItemSkeleton } from "@/components/ui/skeletons";
import { StatCardIcon } from "@/components/ui/stat-card-icon";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useUnifiedDashboardData } from "@/hooks/useUnifiedDashboardData";
import { cn } from "@/lib/utils";

/** Viewport height for 10 activity rows. */
const ACTIVITY_VIEWPORT_CLASS = "h-[35rem]";
const ACTIVITY_VISIBLE_COUNT = 10;
const ACTIVITY_PAGE_SIZE = 10;

interface RecentActivity {
	$id: string;
	action: string;
	description: string;
	userId?: string;
	userName?: string;
	contractId?: string;
	contractName?: string;
	eventId?: string;
	eventTitle?: string;
	department?: string;
	timestamp: string;
	type: "contract" | "user" | "event" | "notification" | "file";
}

type ActivityType = RecentActivity["type"];

const ACTIVITY_TYPE_OPTIONS: DashboardCardFilterOption<ActivityType>[] = [
	{ value: "file", label: "Files", icon: FileUp },
	{ value: "event", label: "Calendar", icon: CalendarDays },
	{ value: "contract", label: "Contracts", icon: FileText },
	{ value: "user", label: "Users", icon: User },
	{ value: "notification", label: "Notifications", icon: Bell },
];

interface RecentActivityProps {
	limit?: number;
	className?: string;
}

function getActivityDisplayText(activity: RecentActivity) {
	switch (activity.type) {
		case "contract":
			return activity.contractName || "Contract";
		case "user":
			return activity.userName || "User";
		case "event":
			return activity.eventTitle || "Event";
		case "file":
			return activity.description;
		case "notification":
			return activity.description;
		default:
			return activity.description;
	}
}

const RecentActivity: FC<RecentActivityProps> = ({
	limit = ACTIVITY_PAGE_SIZE,
	className,
}) => {
	const { orgId } = useOrganization();
	const { recentActivities, isLoading } = useUnifiedDashboardData(
		orgId || "default_organization",
	);

	const [typeFilter, setTypeFilter] = useState<ActivityType | "all">("all");

	const activities: RecentActivity[] = (recentActivities ||
		[]) as RecentActivity[];
	const feedItems = useMemo(() => {
		const scoped =
			typeFilter === "all"
				? activities
				: activities.filter((activity) => activity.type === typeFilter);

		return collapseConsecutiveActivities(
			scoped.map((activity) => ({
				$id: activity.$id,
				action: activity.action,
				subtitle: getActivityDisplayText(activity),
				timestamp: activity.timestamp,
				type: activity.type,
			})),
		).slice(0, limit);
	}, [activities, limit, typeFilter]);

	const filterButton = (
		<DashboardCardFilter
			label="Filter by type"
			options={ACTIVITY_TYPE_OPTIONS}
			selected={typeFilter}
			onChange={setTypeFilter}
		/>
	);

	if (isLoading) {
		return (
			<Card className={cn("glass-card", className)}>
				<div className="glass-card-cap" />
				<CardHeader className="mb-4 border-b border-slate-200/80 pb-4">
					<div className="flex items-center justify-between gap-3">
						<CardTitle className="flex items-center gap-2.5 text-lg font-bold sidebar-gradient-text">
							<StatCardIcon icon={Activity} />
							Recent Activity
						</CardTitle>
						{filterButton}
					</div>
				</CardHeader>
				<CardContent className="pt-0">
					<div className="flex justify-center py-3">
						<LoadingSpinner
							size="sm"
							label="Loading activity..."
							className="!p-0"
						/>
					</div>
					<div className={cn(ACTIVITY_VIEWPORT_CLASS, "overflow-y-auto")}>
						<div className="py-1 pr-2">
							{Array.from(
								{ length: ACTIVITY_VISIBLE_COUNT },
								(_, i) => i + 1,
							).map((i) => (
								<ActivityItemSkeleton key={i} />
							))}
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className={cn("glass-card", className)}>
			<div className="glass-card-cap" />
			<CardHeader className="mb-4 border-b border-slate-200/80 pb-4">
				<div className="flex items-center justify-between gap-3">
					<CardTitle className="flex items-center gap-2.5 text-lg font-bold sidebar-gradient-text">
						<StatCardIcon icon={Activity} />
						Recent Activity
					</CardTitle>
					{filterButton}
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				<div className={cn(ACTIVITY_VIEWPORT_CLASS, "overflow-y-auto")}>
					<ActivityFeedList
						items={feedItems}
						emptyLabel={
							typeFilter === "all"
								? "No recent activities"
								: "No activities match this filter"
						}
					/>
				</div>
			</CardContent>
		</Card>
	);
};

export default RecentActivity;
