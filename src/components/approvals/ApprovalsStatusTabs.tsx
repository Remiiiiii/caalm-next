"use client";

import { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApprovalsView } from "@/components/approvals/ApprovalsViewContext";
import {
	type ApprovalQueueItem,
	type ApprovalTab,
	matchesApprovalTab,
} from "@/lib/approvals/approvalsListUtils";
import { cn } from "@/lib/utils";

interface ApprovalsStatusTabsProps {
	items: ApprovalQueueItem[];
}

export default function ApprovalsStatusTabs({
	items,
}: ApprovalsStatusTabsProps) {
	const { tab, setTab, scrollToList } = useApprovalsView();

	const counts = useMemo(() => {
		return {
			"needs-me": items.filter((i) => matchesApprovalTab(i, "needs-me")).length,
			"pending-review": items.filter((i) =>
				matchesApprovalTab(i, "pending-review"),
			).length,
			"action-required": items.filter((i) =>
				matchesApprovalTab(i, "action-required"),
			).length,
			"recently-decided": items.filter((i) =>
				matchesApprovalTab(i, "recently-decided"),
			).length,
		};
	}, [items]);

	const tabs: { value: ApprovalTab; label: string; count: number }[] = [
		{ value: "needs-me", label: "Needs me", count: counts["needs-me"] },
		{
			value: "pending-review",
			label: "Pending",
			count: counts["pending-review"],
		},
		{
			value: "action-required",
			label: "Action required",
			count: counts["action-required"],
		},
		{
			value: "recently-decided",
			label: "Decided",
			count: counts["recently-decided"],
		},
	];

	return (
		<div className="px-4 sm:px-6 pt-4 border-b border-slate-200/80">
			<Tabs
				value={tab}
				onValueChange={(v) => {
					setTab(v as ApprovalTab);
					scrollToList();
				}}
			>
				<TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-1 bg-slate-100/80 p-1">
					{tabs.map((t) => (
						<TabsTrigger
							key={t.value}
							value={t.value}
							className={cn(
								"cursor-pointer text-xs sm:text-sm py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm",
							)}
						>
							<span className="sidebar-gradient-text font-medium">
								{t.label}
							</span>
							<span className="ml-1.5 text-slate-500 tabular-nums">
								{t.count}
							</span>
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>
		</div>
	);
}
