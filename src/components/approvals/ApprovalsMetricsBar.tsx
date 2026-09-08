"use client";

import { AlertTriangle, CheckCircle, ClipboardList, Clock } from "lucide-react";
import { useMemo } from "react";
import { useApprovalsView } from "@/components/approvals/ApprovalsViewContext";
import { Card, CardContent } from "@/components/ui/card";
import { StatCardIcon } from "@/components/ui/stat-card-icon";
import {
	type ApprovalQueueItem,
	type ApprovalTab,
	isSlaAtRisk,
	isSlaBreached,
	matchesApprovalTab,
} from "@/lib/approvals/approvalsListUtils";
import { cn } from "@/lib/utils";

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

	const interactiveCard =
		"glass-card interactive-glass-card cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 transition-all duration-200";

	const go = (tab: ApprovalTab) => {
		setTab(tab);
		scrollToList();
	};

	return (
		<section className="mb-6 w-full">
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<button
					type="button"
					className="text-left"
					onClick={() => go("needs-me")}
				>
					<Card className={cn(interactiveCard)}>
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<p className="text-sm font-medium sidebar-gradient-text">
								Needs decision
							</p>
							<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
								<span>{counts.needsMe}</span>
								<StatCardIcon className="ml-2" icon={ClipboardList} />
							</div>
							<p className="text-xs text-slate-600 mt-1">Click to show queue</p>
						</CardContent>
					</Card>
				</button>

				<button
					type="button"
					className="text-left"
					onClick={() => go("pending-review")}
				>
					<Card className={cn(interactiveCard)}>
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<p className="text-sm font-medium sidebar-gradient-text">
								Pending review
							</p>
							<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
								<span>{counts.pendingReview}</span>
								<StatCardIcon className="ml-2" icon={Clock} />
							</div>
							<p className="text-xs text-slate-600 mt-1">Awaiting review</p>
						</CardContent>
					</Card>
				</button>

				<button
					type="button"
					className="text-left"
					onClick={() => go("action-required")}
				>
					<Card className={cn(interactiveCard)}>
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<p className="text-sm font-medium sidebar-gradient-text">
								Action required
							</p>
							<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
								<span>{counts.actionRequired}</span>
								<StatCardIcon className="ml-2" icon={AlertTriangle} />
							</div>
							<p className="text-xs text-slate-600 mt-1">Needs follow-up</p>
						</CardContent>
					</Card>
				</button>

				<button
					type="button"
					className="text-left"
					onClick={() => go("recently-decided")}
				>
					<Card className={cn(interactiveCard)}>
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<p className="text-sm font-medium sidebar-gradient-text">
								Recently decided
							</p>
							<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
								<span>{counts.recentlyDecided}</span>
								<StatCardIcon className="ml-2" icon={CheckCircle} />
							</div>
							<p className="text-xs text-slate-600 mt-1">Last 14 days</p>
						</CardContent>
					</Card>
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
					<Card className={cn(interactiveCard)}>
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<p className="text-sm font-medium sidebar-gradient-text">
								At risk
							</p>
							<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
								<span>{counts.atRisk}</span>
								<StatCardIcon className="ml-2" icon={AlertTriangle} />
							</div>
							<p className="text-xs text-slate-600 mt-1">
								Past halfway to the SLA
							</p>
						</CardContent>
					</Card>
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
					<Card className={cn(interactiveCard)}>
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<p className="text-sm font-medium sidebar-gradient-text">
								SLA breached
							</p>
							<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
								<span>{counts.breached}</span>
								<StatCardIcon className="ml-2" icon={AlertTriangle} />
							</div>
							<p className="text-xs text-slate-600 mt-1">Past the due time</p>
						</CardContent>
					</Card>
				</button>

				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<p className="text-sm font-medium sidebar-gradient-text">
							Breach rate
						</p>
						<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
							<span>{counts.breachRate}%</span>
							<StatCardIcon className="ml-2" icon={Clock} />
						</div>
						<p className="text-xs text-slate-600 mt-1">
							Of open approval steps
						</p>
					</CardContent>
				</Card>

				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<p className="text-sm font-medium sidebar-gradient-text">
							Avg hours left
						</p>
						<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
							<span>{counts.avgHoursLeft ?? "—"}</span>
							<StatCardIcon className="ml-2" icon={Clock} />
						</div>
						<p className="text-xs text-slate-600 mt-1">
							Until current-step due time
						</p>
					</CardContent>
				</Card>
			</div>
		</section>
	);
}
