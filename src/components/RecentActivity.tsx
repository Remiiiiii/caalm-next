"use client";

import type { FC } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";
import { ActivityItemSkeleton } from "@/components/ui/skeletons";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useUnifiedDashboardData } from "@/hooks/useUnifiedDashboardData";
import { cn } from "@/lib/utils";

/** Viewport height for ~7 activity rows (item + gap). */
const ACTIVITY_VIEWPORT_CLASS = "h-[33rem]";
const ACTIVITY_VISIBLE_COUNT = 7;

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

interface RecentActivityProps {
	limit?: number;
	className?: string;
}

const RecentActivity: FC<RecentActivityProps> = ({
	limit = 25,
	className,
}) => {
	const { orgId } = useOrganization();
	const { recentActivities, isLoading } = useUnifiedDashboardData(
		orgId || "default_organization",
	);

	const activities: RecentActivity[] = (recentActivities ||
		[]) as RecentActivity[];
	const limitedActivities = activities.slice(0, limit);

	const formatTimeAgo = (timestamp: string) => {
		const now = new Date();
		const activityTime = new Date(timestamp);
		const diffInSeconds = Math.floor(
			(now.getTime() - activityTime.getTime()) / 1000,
		);

		if (diffInSeconds < 60) {
			return "Just now";
		} else if (diffInSeconds < 3600) {
			const minutes = Math.floor(diffInSeconds / 60);
			return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
		} else if (diffInSeconds < 86400) {
			const hours = Math.floor(diffInSeconds / 3600);
			return `${hours} hour${hours > 1 ? "s" : ""} ago`;
		} else if (diffInSeconds < 604800) {
			const days = Math.floor(diffInSeconds / 86400);
			return `${days} day${days > 1 ? "s" : ""} ago`;
		} else {
			const weeks = Math.floor(diffInSeconds / 604800);
			return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
		}
	};

	const getActivityDisplayText = (activity: RecentActivity) => {
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
	};

	if (isLoading) {
		return (
			<Card className={cn("glass-card", className)}>
				<div className="glass-card-cap" />
				<CardHeader className="pb-3">
					<CardTitle className="flex left-0 text-center text-lg font-bold sidebar-gradient-text">
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
					<div className={cn(ACTIVITY_VIEWPORT_CLASS, "overflow-y-auto")}>
						<div className="space-y-3 py-2 pr-2">
							{Array.from({ length: ACTIVITY_VISIBLE_COUNT }, (_, i) => i + 1).map(
								(i) => (
									<ActivityItemSkeleton key={i} />
								),
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className={cn("glass-card", className)}>
			<div className="glass-card-cap" />
			<CardHeader className="pb-3">
				<CardTitle className="flex left-0 text-center text-lg font-bold sidebar-gradient-text">
					Recent Activity
				</CardTitle>
			</CardHeader>
			<CardContent className="pt-0">
				<div className={cn(ACTIVITY_VIEWPORT_CLASS, "overflow-y-auto")}>
					<div className="space-y-3 py-2 pr-2">
						{limitedActivities.length === 0 ? (
							<div className="py-8 text-center text-slate-dark">
								<p className="text-sm">No recent activities</p>
							</div>
						) : (
							limitedActivities.map((activity) => (
								<div
									key={activity.$id}
									className="flex items-start justify-between rounded-lg border border-white/30 bg-white/20 p-3 shadow-sm backdrop-blur-md transition-all duration-300"
								>
									<div>
										<p className="text-sm font-medium text-slate-700">
											{activity.action}
										</p>
										<p className="mt-1 text-xs text-slate-600">
											{getActivityDisplayText(activity)}
										</p>
									</div>
									<span className="ml-4 shrink-0 text-xs text-slate-500">
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
};

export default RecentActivity;
