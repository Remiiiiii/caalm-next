"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";
import { ActivityItemSkeleton } from "@/components/ui/skeletons";
import type { DepartmentRecentActivityItem } from "@/lib/dashboard/department-dashboard.types";

interface DepartmentRecentActivityProps {
	activities: DepartmentRecentActivityItem[];
	isLoading?: boolean;
	limit?: number;
}

function formatTimeAgo(timestamp: string) {
	if (!timestamp) return "";
	const now = new Date();
	const activityTime = new Date(timestamp);
	const diffInSeconds = Math.floor(
		(now.getTime() - activityTime.getTime()) / 1000,
	);

	if (Number.isNaN(diffInSeconds) || diffInSeconds < 0) return "";
	if (diffInSeconds < 60) return "Just now";
	if (diffInSeconds < 3600) {
		const minutes = Math.floor(diffInSeconds / 60);
		return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
	}
	if (diffInSeconds < 86400) {
		const hours = Math.floor(diffInSeconds / 3600);
		return `${hours} hour${hours > 1 ? "s" : ""} ago`;
	}
	if (diffInSeconds < 604800) {
		const days = Math.floor(diffInSeconds / 86400);
		return `${days} day${days > 1 ? "s" : ""} ago`;
	}
	const weeks = Math.floor(diffInSeconds / 604800);
	return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
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
							limitedActivities.map((activity) => (
								<div
									key={activity.$id}
									className="flex justify-between items-start bg-white/20 backdrop-blur-md border border-white/30 rounded-lg p-3 shadow-sm transition-all duration-300"
								>
									<div>
										<p className="font-medium text-slate-700 text-sm">
											{activity.action}
										</p>
										<p className="text-xs text-slate-600 mt-1">
											{getActivityDisplayText(activity)}
										</p>
									</div>
									<span className="text-xs text-slate-500 ml-4 shrink-0">
										{formatTimeAgo(activity.timestamp)}
									</span>
								</div>
							))
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
