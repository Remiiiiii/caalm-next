"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
	buildIssueHistoryCalendarWindows,
	findCalendarWindowIndexForMonth,
	type IssueHistoryMonthGroup,
} from "@/lib/tickets/issue-history";
import { IssueHistoryIncidentCard } from "./IssueHistoryIncidentCard";
import { IssueHistoryRangeNav } from "./IssueHistoryRangeNav";

export function IssueHistoryView({
	months,
}: {
	months: IssueHistoryMonthGroup[];
}) {
	const oldestMonthKey = months.at(-1)?.monthKey ?? null;
	const newestMonthKey = months[0]?.monthKey ?? null;

	const calendarWindows = useMemo(
		() =>
			buildIssueHistoryCalendarWindows({
				oldestMonthKey,
			}),
		[oldestMonthKey],
	);

	const defaultWindowIndex = useMemo(
		() => findCalendarWindowIndexForMonth(calendarWindows, newestMonthKey),
		[calendarWindows, newestMonthKey],
	);

	const [windowIndex, setWindowIndex] = useState(defaultWindowIndex);

	useEffect(() => {
		setWindowIndex(defaultWindowIndex);
	}, [defaultWindowIndex]);

	const activeWindow = calendarWindows[windowIndex];
	const monthsByKey = useMemo(
		() => new Map(months.map((month) => [month.monthKey, month])),
		[months],
	);

	const visibleMonths = useMemo(() => {
		if (!activeWindow) return [];
		return activeWindow.monthKeys
			.map((key) => monthsByKey.get(key))
			.filter((month): month is IssueHistoryMonthGroup => Boolean(month));
	}, [activeWindow, monthsByKey]);

	if (months.length === 0) {
		return (
			<div className="issue-history-shell">
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<div className="p-8 text-center">
						<p className="text-sm font-medium text-slate-700">
							No resolved issues yet
						</p>
						<p className="mt-1 text-xs text-slate-600">
							Closed tickets appear here, grouped by month and day.
						</p>
					</div>
				</Card>
			</div>
		);
	}

	return (
		<div className="issue-history-shell">
			{activeWindow ? (
				<IssueHistoryRangeNav
					label={activeWindow.label}
					canGoNewer={windowIndex > 0}
					canGoOlder={windowIndex < calendarWindows.length - 1}
					onGoNewer={() =>
						setWindowIndex((index) => Math.max(0, index - 1))
					}
					onGoOlder={() =>
						setWindowIndex((index) =>
							Math.min(calendarWindows.length - 1, index + 1),
						)
					}
				/>
			) : null}
			{visibleMonths.length === 0 ? (
				<Card className="glass-card issue-history-month-card">
					<div className="glass-card-cap" />
					<div className="p-8 text-center">
						<p className="text-sm font-medium text-slate-700">
							No resolved issues in this period
						</p>
						<p className="mt-1 text-xs text-slate-600">
							Use the arrows to browse other three-month ranges through 2030.
						</p>
					</div>
				</Card>
			) : (
				visibleMonths.map((month) => (
					<Card
						key={month.monthKey}
						className="glass-card issue-history-month-card"
					>
						<div className="glass-card-cap" />
						<h2 className="issue-history-month-title sidebar-gradient-text">
							{month.label}
						</h2>
						<div className="issue-history-month-rule" />
						<div className="space-y-6">
							{month.days.map((day) => (
								<section key={day.dayKey}>
									<div className="issue-history-day-header">
										<span className="min-w-0 truncate">{day.label}</span>
										<span className="shrink-0">
											{day.incidents.length} incident
											{day.incidents.length === 1 ? "" : "s"}
										</span>
									</div>
									<div className="space-y-3">
										{day.incidents.map((incident) => (
											<IssueHistoryIncidentCard
												key={incident.ticket.$id}
												incident={incident}
											/>
										))}
									</div>
								</section>
							))}
						</div>
					</Card>
				))
			)}
		</div>
	);
}
