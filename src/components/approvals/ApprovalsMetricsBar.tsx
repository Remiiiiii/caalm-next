"use client";

import {
	AlertTriangle,
	CheckCircle,
	ClipboardList,
	Clock,
} from "lucide-react";
import { useMemo } from "react";
import { useApprovalsView } from "@/components/approvals/ApprovalsViewContext";
import { Card, CardContent } from "@/components/ui/card";
import {
	type ApprovalQueueItem,
	type ApprovalTab,
	matchesApprovalTab,
} from "@/lib/approvals/approvalsListUtils";
import { cn } from "@/lib/utils";

interface ApprovalsMetricsBarProps {
	items: ApprovalQueueItem[];
}

export default function ApprovalsMetricsBar({
	items,
}: ApprovalsMetricsBarProps) {
	const { setTab, scrollToList } = useApprovalsView();

	const counts = useMemo(() => {
		return {
			needsMe: items.filter((i) => matchesApprovalTab(i, "needs-me")).length,
			pendingReview: items.filter((i) =>
				matchesApprovalTab(i, "pending-review"),
			).length,
			actionRequired: items.filter((i) =>
				matchesApprovalTab(i, "action-required"),
			).length,
			recentlyDecided: items.filter((i) =>
				matchesApprovalTab(i, "recently-decided"),
			).length,
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
				<button type="button" className="text-left" onClick={() => go("needs-me")}>
					<Card className={cn(interactiveCard)}>
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<p className="text-sm font-medium sidebar-gradient-text">
								Needs decision
							</p>
							<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
								<span>{counts.needsMe}</span>
								<span className="inline-block ml-2 pb-1">
									<ClipboardList className="h-8 w-8 text-slate-600" />
								</span>
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
								<span className="inline-block ml-2 pb-1">
									<Clock className="h-8 w-8 text-slate-600" />
								</span>
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
								<span className="inline-block ml-2 pb-1">
									<AlertTriangle className="h-8 w-8 text-slate-600" />
								</span>
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
								<span className="inline-block ml-2 pb-1">
									<CheckCircle className="h-8 w-8 text-slate-600" />
								</span>
							</div>
							<p className="text-xs text-slate-600 mt-1">Last 14 days</p>
						</CardContent>
					</Card>
				</button>
			</div>
		</section>
	);
}
