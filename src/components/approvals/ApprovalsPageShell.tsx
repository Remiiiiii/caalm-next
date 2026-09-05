"use client";

import { Calendar } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import ApprovalDecideSheet from "@/components/approvals/ApprovalDecideSheet";
import { AccountabilityAttentionStrip } from "@/components/approvals/AccountabilityAttentionStrip";
import ApprovalsAttentionStrip from "@/components/approvals/ApprovalsAttentionStrip";
import ApprovalsBulkBar from "@/components/approvals/ApprovalsBulkBar";
import ApprovalsControlBar from "@/components/approvals/ApprovalsControlBar";
import ApprovalsMetricsBar from "@/components/approvals/ApprovalsMetricsBar";
import ApprovalsTable from "@/components/approvals/ApprovalsTable";
import {
	ApprovalsViewProvider,
	useApprovalsView,
} from "@/components/approvals/ApprovalsViewContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	type ApprovalQueueItem,
	applyApprovalFilters,
	matchesApprovalTab,
} from "@/lib/approvals/approvalsListUtils";

interface ApprovalsPageShellProps {
	entity: "contract" | "license";
	title: string;
	items: ApprovalQueueItem[];
	departments: string[];
	assignedManagers: string[];
	itemTypes: string[];
	canDecide: boolean;
}

function ApprovalsPageBody({
	title,
	items,
	departments,
	assignedManagers,
	itemTypes,
	canDecide,
}: Omit<ApprovalsPageShellProps, "entity">) {
	const { tab, filters, previewItem, setPreviewItem } = useApprovalsView();

	const filtered = useMemo(() => {
		const byTab = items.filter((i) => matchesApprovalTab(i, tab));
		return applyApprovalFilters(byTab, filters);
	}, [items, tab, filters]);

	return (
		<>
			<div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
				<h1 className="h1 capitalize sidebar-gradient-text">{title}</h1>
			</div>
			<div className="mb-6 flex items-center justify-end gap-2 flex-wrap">
				<Button
					asChild
					variant="outline"
					size="sm"
					className="primary-btn px-3 sm:px-4 cursor-pointer"
				>
					<Link href="/calendar">
						<Calendar className="h-4 w-4" />
						Calendar pending
					</Link>
				</Button>
			</div>

			<AccountabilityAttentionStrip />
			<ApprovalsAttentionStrip items={items} />
			<ApprovalsMetricsBar items={items} />

			<Card className="glass-card mb-6">
				<div className="glass-card-cap" />
				<CardContent className="p-0">
					<ApprovalsControlBar
						items={items}
						departments={departments}
						assignedManagers={assignedManagers}
						itemTypes={itemTypes}
					/>
					<ApprovalsTable items={filtered} canDecide={canDecide} />
					<ApprovalsBulkBar items={filtered} canDecide={canDecide} />
				</CardContent>
			</Card>

			<ApprovalDecideSheet
				item={previewItem}
				open={Boolean(previewItem)}
				onOpenChange={(open) => {
					if (!open) setPreviewItem(null);
				}}
				canDecide={canDecide}
			/>
		</>
	);
}

export default function ApprovalsPageShell(props: ApprovalsPageShellProps) {
	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<ApprovalsViewProvider entity={props.entity}>
				<ApprovalsPageBody {...props} />
			</ApprovalsViewProvider>
		</div>
	);
}
