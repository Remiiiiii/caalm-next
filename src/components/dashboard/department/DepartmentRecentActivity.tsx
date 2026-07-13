"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { DepartmentRecentActivityItem } from "@/lib/dashboard/department-dashboard.types";

interface DepartmentRecentActivityProps {
	activities: DepartmentRecentActivityItem[];
	isLoading?: boolean;
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
		return `${minutes}m ago`;
	}
	if (diffInSeconds < 86400) {
		const hours = Math.floor(diffInSeconds / 3600);
		return `${hours}h ago`;
	}
	const days = Math.floor(diffInSeconds / 86400);
	return `${days}d ago`;
}

export function DepartmentRecentActivity({
	activities,
	isLoading,
}: DepartmentRecentActivityProps) {
	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6">
				<p className="text-sm font-medium sidebar-gradient-text mb-1">
					Recent activity
				</p>
				<p className="text-xs text-slate-600 mb-4">
					Division-scoped updates
				</p>

				{isLoading ? (
					<div className="space-y-3">
						{[1, 2, 3].map((i) => (
							<div
								key={i}
								className="h-12 rounded-lg bg-slate-200/60 animate-pulse"
							/>
						))}
					</div>
				) : activities.length === 0 ? (
					<p className="text-sm text-slate-500 py-6 text-center">
						No recent division activity yet.
					</p>
				) : (
					<ul className="space-y-3">
						{activities.map((activity) => (
							<li
								key={activity.$id}
								className="border-b border-slate-200 pb-3 last:border-0 last:pb-0"
							>
								<p className="text-sm font-medium text-slate-900">
									{activity.action}
								</p>
								{activity.description ? (
									<p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
										{activity.description}
									</p>
								) : null}
								<div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500">
									<span>{activity.userName || "System"}</span>
									<span>{formatTimeAgo(activity.timestamp)}</span>
								</div>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
