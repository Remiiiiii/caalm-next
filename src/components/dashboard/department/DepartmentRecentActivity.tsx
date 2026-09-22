"use client";

import { ActivityFeedList } from "@/components/dashboard/ActivityFeedList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";
import { ActivityItemSkeleton } from "@/components/ui/skeletons";
import type { DepartmentRecentActivityItem } from "@/lib/dashboard/department-dashboard.types";

interface DepartmentRecentActivityProps {
	activities: DepartmentRecentActivityItem[];
	isLoading?: boolean;
	limit?: number;
}

function getActivityDisplayText(activity: DepartmentRecentActivityItem) {
	switch (activity.type) {
		case "contract":
			return activity.description || "Contract";
		case "user":
			return activity.userName || "User";
		case "event":
			return activity.description || "Event";
		case "file":
			return activity.description;
		case "notification":
			return activity.description;
		default:
			return activity.description || activity.userName || "Update";
	}
}

export function DepartmentRecentActivity({
	activities,
	isLoading,
	limit = 15,
}: DepartmentRecentActivityProps) {
	const limitedActivities = activities.slice(0, limit);

	if (isLoading) {
		return (
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardHeader className="pb-3">
					<CardTitle className="flex left-0 text-lg font-bold text-center sidebar-gradient-text">
						Recent Activity
					</CardTitle>
				</CardHeader>
				<CardContent className="pt-0">
					<div className="flex justify-center py-3">
						<LoadingSpinner
							size="sm"
							label="Loading activity..."
							className="!p-0"
						/>
					</div>
					<div className="h-[400px] overflow-y-auto">
						<div className="space-y-3 py-2">
							{[1, 2, 3, 4, 5].map((i) => (
								<ActivityItemSkeleton key={i} />
							))}
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardHeader className="pb-3">
				<CardTitle className="flex left-0 text-lg font-bold text-center sidebar-gradient-text">
					Recent Activity
				</CardTitle>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="h-[400px] overflow-y-auto">
					<div className="space-y-3 py-4 pr-2">
						{limitedActivities.length === 0 ? (
							<div className="text-center text-slate-dark py-8">
								<p className="text-sm">No recent activities</p>
							</div>
						) : (
							<ActivityFeedList
								items={limitedActivities.map((activity) => ({
									$id: activity.$id,
									action: activity.action,
									subtitle: getActivityDisplayText(activity),
									timestamp: activity.timestamp,
									type: activity.type,
								}))}
							/>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
