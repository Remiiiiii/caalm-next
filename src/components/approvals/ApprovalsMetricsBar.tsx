"use client";

import {
	AlertTriangle,
	CheckCircle,
	ClipboardList,
	Clock,
	TrendingDown,
} from "lucide-react";
import { useMemo } from "react";
import { useApprovalsView } from "@/components/approvals/ApprovalsViewContext";
import {
	complianceMetricTone,
	MetricStatCard,
} from "@/components/ui/metric-stat-card";
import {
	type ApprovalQueueItem,
	type ApprovalTab,
	isSlaAtRisk,
	isSlaBreached,
	matchesApprovalTab,
} from "@/lib/approvals/approvalsListUtils";

interface ApprovalsMetricsBarProps {
	items: ApprovalQueueItem[];
}

export default function ApprovalsMetricsBar({
	items,
}: ApprovalsMetricsBarProps) {
	const { setTab, setFilters, scrollToList } = useApprovalsView();

	const counts = useMemo(() => {
		const open = items.filter((i) => matchesApprovalTab(i, "needs-me"));
		const atRisk = open.filter(isSlaAtRisk).length;
		const breached = open.filter(isSlaBreached).length;
		const timed = open.filter((i) => typeof i.hoursRemaining === "number");
		const avgHoursLeft =
			timed.length > 0
				? Math.round(
						timed.reduce((sum, i) => sum + (i.hoursRemaining || 0), 0) /
							timed.length,
					)
				: null;
		return {
			needsMe: open.length,
			pendingReview: items.filter((i) =>
				matchesApprovalTab(i, "pending-review"),
			).length,
			actionRequired: items.filter((i) =>
				matchesApprovalTab(i, "action-required"),
			).length,
			recentlyDecided: items.filter((i) =>
				matchesApprovalTab(i, "recently-decided"),
			).length,
			atRisk,
			breached,
			breachRate:
				open.length > 0 ? Math.round((breached / open.length) * 100) : 0,
			avgHoursLeft,
		};
	}, [items]);

	const go = (tab: ApprovalTab) => {
		setTab(tab);
		scrollToList();
	};

	const breachTone = complianceMetricTone(100 - counts.breachRate);

	return (
		<section className="mb-6 w-full">
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<button
					type="button"
					className="text-left"
					onClick={() => go("needs-me")}
				>
					<MetricStatCard
						interactive
						title="Needs decision"
						value={counts.needsMe}
						description="Click to show queue"
						icon={ClipboardList}
						dynamicIcon={counts.needsMe > 0 ? Clock : undefined}
						dynamicTone="warning"
					/>
				</button>

				<button
					type="button"
					className="text-left"
					onClick={() => go("pending-review")}
				>
					<MetricStatCard
						interactive
						title="Pending review"
						value={counts.pendingReview}
						description="Awaiting review"
						icon={Clock}
					/>
				</button>

				<button
					type="button"
					className="text-left"
					onClick={() => go("action-required")}
				>
					<MetricStatCard
						interactive
						title="Action required"
						value={counts.actionRequired}
						description="Needs follow-up"
						icon={AlertTriangle}
						iconTone={counts.actionRequired > 0 ? "warning" : "default"}
						dynamicIcon={counts.actionRequired > 0 ? Clock : undefined}
						dynamicTone="warning"
						valueTone={counts.actionRequired > 0 ? "warning" : "default"}
					/>
				</button>

				<button
					type="button"
					className="text-left"
					onClick={() => go("recently-decided")}
				>
					<MetricStatCard
						interactive
						title="Recently decided"
						value={counts.recentlyDecided}
						description="Last 14 days"
						icon={CheckCircle}
						iconTone="success"
					/>
				</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
				<button
					type="button"
					className="text-left"
					onClick={() => {
						setFilters((prev) => ({ ...prev, slaStatus: "at_risk" }));
						setTab("needs-me");
						scrollToList();
					}}
				>
					<MetricStatCard
						interactive
						title="At risk"
						value={counts.atRisk}
						description="Past halfway to the SLA"
						icon={AlertTriangle}
						iconTone={counts.atRisk > 0 ? "warning" : "default"}
						dynamicIcon={counts.atRisk > 0 ? Clock : undefined}
						dynamicTone="warning"
						valueTone={counts.atRisk > 0 ? "warning" : "default"}
					/>
				</button>

				<button
					type="button"
					className="text-left"
					onClick={() => {
						setFilters((prev) => ({ ...prev, slaStatus: "breached" }));
						setTab("needs-me");
						scrollToList();
					}}
				>
					<MetricStatCard
						interactive
						title="SLA breached"
						value={counts.breached}
						description="Past the due time"
						icon={AlertTriangle}
						iconTone={counts.breached > 0 ? "danger" : "default"}
						dynamicIcon={counts.breached > 0 ? TrendingDown : undefined}
						dynamicTone="danger"
						valueTone={counts.breached > 0 ? "danger" : "default"}
					/>
				</button>

				<MetricStatCard
					title="Breach rate"
					value={`${counts.breachRate}%`}
					description="Of open approval steps"
					icon={Clock}
					iconTone={breachTone}
					dynamicIcon={counts.breachRate > 0 ? TrendingDown : undefined}
					dynamicTone={breachTone}
					valueTone={breachTone}
				/>

				<MetricStatCard
					title="Avg hours left"
					value={counts.avgHoursLeft ?? "—"}
					description="Until current-step due time"
					icon={Clock}
					dynamicIcon={
						counts.avgHoursLeft != null && counts.avgHoursLeft < 8
							? AlertTriangle
							: undefined
					}
					dynamicTone="warning"
					valueTone={
						counts.avgHoursLeft != null && counts.avgHoursLeft < 8
							? "warning"
							: "default"
					}
				/>
			</div>
		</section>
	);
}
