"use client";

import { Bell, CalendarDays, FileText, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActivityFeedItem = {
	$id: string;
	action: string;
	subtitle: string;
	timestamp: string;
	type: string;
};

type CollapsedActivity = ActivityFeedItem & { count: number };

const WEEK_SECONDS = 604800;
const FADE_START_WEEKS = 8;
const FADE_STRONG_WEEKS = 28;

function sentenceCase(value: string) {
	const trimmed = value.trim();
	if (!trimmed) return value;
	return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function collapseKey(item: ActivityFeedItem) {
	return [
		item.type,
		item.action.trim().toLowerCase(),
		item.subtitle.trim().toLowerCase(),
		formatCompactTimeAgo(item.timestamp),
	].join("|");
}

/** Consecutive same file/event at the same displayed time become one row. */
export function collapseConsecutiveActivities(
	items: ActivityFeedItem[],
): CollapsedActivity[] {
	const collapsed: CollapsedActivity[] = [];
	for (const item of items) {
		const prev = collapsed[collapsed.length - 1];
		if (prev && collapseKey(prev) === collapseKey(item)) {
			prev.count += 1;
			continue;
		}
		collapsed.push({ ...item, count: 1 });
	}
	return collapsed;
}

export function formatCompactTimeAgo(timestamp: string) {
	const activityTime = new Date(timestamp);
	const diffInSeconds = Math.floor(
		(Date.now() - activityTime.getTime()) / 1000,
	);

	if (Number.isNaN(diffInSeconds) || diffInSeconds < 0) return "";
	if (diffInSeconds < 60) return "now";
	if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
	if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
	if (diffInSeconds < WEEK_SECONDS) {
		return `${Math.floor(diffInSeconds / 86400)}d ago`;
	}
	return `${Math.floor(diffInSeconds / WEEK_SECONDS)}w ago`;
}

function weeksAgo(timestamp: string) {
	const activityTime = new Date(timestamp);
	const diffInSeconds = Math.floor(
		(Date.now() - activityTime.getTime()) / 1000,
	);
	if (Number.isNaN(diffInSeconds) || diffInSeconds < 0) return 0;
	return diffInSeconds / WEEK_SECONDS;
}

function typeVisual(type: string): {
	icon: LucideIcon;
	iconClass: string;
	tileClass: string;
} {
	switch (type) {
		case "event":
			return {
				icon: CalendarDays,
				iconClass: "text-green",
				tileClass: "bg-green/10",
			};
		case "user":
			return {
				icon: User,
				iconClass: "text-[#0f5384]",
				tileClass: "bg-blue/10",
			};
		case "notification":
			return {
				icon: Bell,
				iconClass: "text-orange",
				tileClass: "bg-orange/10",
			};
		case "file":
		case "contract":
		default:
			return {
				icon: FileText,
				iconClass: "text-[#0f5384]",
				tileClass: "bg-blue/10",
			};
	}
}

interface ActivityFeedListProps {
	items: ActivityFeedItem[];
	emptyLabel?: string;
}

export function ActivityFeedList({
	items,
	emptyLabel = "No recent activities",
}: ActivityFeedListProps) {
	const rows = collapseConsecutiveActivities(items);

	if (rows.length === 0) {
		return (
			<div className="py-8 text-center text-slate-dark">
				<p className="text-sm">{emptyLabel}</p>
			</div>
		);
	}

	return (
		<div className="py-1 pr-2">
			{rows.map((row, index) => {
				const ageWeeks = weeksAgo(row.timestamp);
				const faded = ageWeeks >= FADE_STRONG_WEEKS;
				const muted = !faded && ageWeeks >= FADE_START_WEEKS;
				const { icon: Icon, iconClass, tileClass } = typeVisual(row.type);

				return (
					<div
						key={row.$id}
						className={cn(
							"relative flex items-start gap-3 px-1 py-2.5",
							faded && "opacity-60",
						)}
					>
						{index > 0 ? (
							<div
								aria-hidden
								className="absolute left-11 right-8 top-0 h-px bg-slate-200/80"
							/>
						) : null}
						<div
							className={cn(
								"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
								tileClass,
							)}
						>
							<Icon className={cn("h-4 w-4", iconClass)} />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-1.5">
								<p
									className={cn(
										"truncate text-sm font-medium",
										faded
											? "text-slate-400"
											: muted
												? "text-slate-500"
												: "text-slate-700",
									)}
								>
									{sentenceCase(row.action)}
								</p>
								{row.count > 1 ? (
									<span className="shrink-0 text-xs font-medium text-slate-400">
										×{row.count}
									</span>
								) : null}
							</div>
							<p
								className={cn(
									"mt-0.5 truncate text-xs",
									faded
										? "text-slate-400"
										: muted
											? "text-slate-400"
											: "text-slate-600",
								)}
							>
								{row.subtitle}
							</p>
						</div>
						<span
							className={cn(
								"shrink-0 pt-0.5 text-xs tabular-nums",
								faded || muted ? "text-slate-400" : "text-slate-500",
							)}
						>
							{formatCompactTimeAgo(row.timestamp)}
						</span>
					</div>
				);
			})}
		</div>
	);
}
