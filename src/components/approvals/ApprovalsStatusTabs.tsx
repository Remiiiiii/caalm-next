"use client";

import { useMemo } from "react";
import StatusUnderlineTabs from "@/components/StatusUnderlineTabs";
import { useApprovalsView } from "@/components/approvals/ApprovalsViewContext";
import {
	type ApprovalQueueItem,
	type ApprovalTab,
	matchesApprovalTab,
} from "@/lib/approvals/approvalsListUtils";

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
		<StatusUnderlineTabs
			tabs={tabs}
			value={tab}
			onValueChange={(v) => {
				setTab(v as ApprovalTab);
				scrollToList();
			}}
		/>
	);
}
