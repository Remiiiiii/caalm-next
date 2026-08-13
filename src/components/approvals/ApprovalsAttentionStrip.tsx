"use client";

import { AlertTriangle, Calendar } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useApprovalsView } from "@/components/approvals/ApprovalsViewContext";
import { Button } from "@/components/ui/button";
import {
	type ApprovalQueueItem,
	daysSince,
	isActionRequired,
	isAgingUrgent,
} from "@/lib/approvals/approvalsListUtils";

interface ApprovalsAttentionStripProps {
	items: ApprovalQueueItem[];
}

export default function ApprovalsAttentionStrip({
	items,
}: ApprovalsAttentionStripProps) {
	const { setTab, scrollToList } = useApprovalsView();

	const counts = useMemo(() => {
		let aging = 0;
		let actionRequired = 0;
		items.forEach((item) => {
			if (isAgingUrgent(item)) aging++;
			if (isActionRequired(item)) actionRequired++;
		});
		return { aging, actionRequired };
	}, [items]);

	const total = counts.aging + counts.actionRequired;
	if (total === 0) return null;

	return (
		<div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-orange/20 bg-orange/10 px-4 py-3">
			<div className="flex items-start gap-3 min-w-0">
				<AlertTriangle className="h-5 w-5 text-orange shrink-0 mt-0.5" />
				<div>
					<p className="text-sm font-semibold text-slate-700">
						Needs attention
					</p>
					<p className="text-xs text-slate-600 mt-0.5">
						{counts.aging > 0 && <span>{counts.aging} waiting 5+ days</span>}
						{counts.aging > 0 && counts.actionRequired > 0 && " · "}
						{counts.actionRequired > 0 && (
							<span>{counts.actionRequired} action required</span>
						)}
					</p>
				</div>
			</div>
			<div className="flex items-center gap-2 flex-wrap">
				{counts.actionRequired > 0 && (
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="cursor-pointer border-orange/30 hover:bg-orange/10"
						onClick={() => {
							setTab("action-required");
							scrollToList();
						}}
					>
						View action required
					</Button>
				)}
				{counts.aging > 0 && (
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="cursor-pointer border-orange/30 hover:bg-orange/10"
						onClick={() => {
							setTab("needs-me");
							scrollToList();
						}}
					>
						View aging
					</Button>
				)}
				<Button
					asChild
					type="button"
					size="sm"
					variant="outline"
					className="cursor-pointer border-slate-200"
				>
					<Link href="/calendar">
						<Calendar className="h-3.5 w-3.5" />
						Calendar pending
					</Link>
				</Button>
			</div>
		</div>
	);
}

export function agingLabel(item: ApprovalQueueItem): string {
	const days = daysSince(item.submittedAt);
	if (days === 0) return "Today";
	if (days === 1) return "1 day";
	return `${days} days`;
}
