"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useApprovalsView } from "@/components/approvals/ApprovalsViewContext";
import { agingLabel } from "@/components/approvals/ApprovalsAttentionStrip";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useUpdateContractStatus } from "@/hooks/useUpdateContractStatus";
import {
	type ApprovalQueueItem,
	isAgingUrgent,
	statusBadgeClasses,
	statusLabel,
} from "@/lib/approvals/approvalsListUtils";
import {
	DATA_TABLE_BODY_ROW_CLICKABLE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/lib/ui/data-table-styles";
import { cn } from "@/lib/utils";
import FormattedDateTime from "@/components/FormattedDateTime";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";

interface ApprovalsTableProps {
	items: ApprovalQueueItem[];
	canDecide: boolean;
}

export default function ApprovalsTable({
	items,
	canDecide,
}: ApprovalsTableProps) {
	const {
		selectedIds,
		toggleSelected,
		selectAll,
		clearSelection,
		setPreviewItem,
		entity,
	} = useApprovalsView();
	const { permissions } = usePermissions();
	const router = useRouter();
	const pathname = usePathname();
	const { toast } = useToast();
	const { updateStatus } = useUpdateContractStatus({
		onStatusChange: () => router.refresh(),
	});
	const [busyId, setBusyId] = useState<string | null>(null);

	const allSelected =
		items.length > 0 && items.every((i) => selectedIds.includes(i.id));

	const canReview =
		entity === "contract"
			? permissions.includes(PERMISSIONS.CONTRACTS.REVIEW) || canDecide
			: canDecide;

	const decideLicense = async (id: string, status: string) => {
		const res = await fetch(`/api/licenses/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status }),
		});
		if (!res.ok) throw new Error("Failed to update license");
	};

	const quickApprove = async (item: ApprovalQueueItem) => {
		if (!canDecide) return;
		setBusyId(item.id);
		try {
			if (item.entity === "contract") {
				await updateStatus({
					fileId: item.decisionId,
					status: "active",
					path: pathname || "/contracts/approvals",
				});
			} else {
				await decideLicense(item.decisionId, "active");
				toast({
					title: "Status Updated",
					description: 'License status changed to "active"',
				});
				router.refresh();
			}
		} catch {
			toast({
				title: "Error",
				description: "Failed to approve item.",
				variant: "destructive",
			});
		} finally {
			setBusyId(null);
		}
	};

	if (items.length === 0) {
		return (
			<div className="text-center py-12 px-4">
				<Image
					src="/assets/icons/no-data.svg"
					alt="No approvals found"
					width={200}
					height={200}
					className="mx-auto mb-4 opacity-60"
				/>
				<p className="body-1 text-slate-700">No items in this queue</p>
			</div>
		);
	}

	return (
		<div className="w-full overflow-x-auto px-2 sm:px-4 pb-4">
			<Table className="border-separate border-spacing-0">
				<TableHeader className="[&_tr]:border-b-0">
					<TableRow className={DATA_TABLE_HEADER_ROW}>
						<TableHead className={`${DATA_TABLE_HEADER_CELL} pl-4 pr-2 w-10`}>
							<Checkbox
								checked={allSelected}
								onCheckedChange={(checked) => {
									if (checked) selectAll(items.map((i) => i.id));
									else clearSelection();
								}}
								aria-label="Select all"
								className="cursor-pointer"
							/>
						</TableHead>
						<TableHead
							className={`${DATA_TABLE_HEADER_CELL} px-3 sticky left-10 z-10 backdrop-blur-md bg-transparent`}
						>
							Item
						</TableHead>
						<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
							Type
						</TableHead>
						<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
							Department
						</TableHead>
						<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
							Assigned
						</TableHead>
						<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
							Submitted
						</TableHead>
						<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
							Aging
						</TableHead>
						<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
							Status
						</TableHead>
						<TableHead
							className={`${DATA_TABLE_HEADER_CELL} pl-3 pr-4 text-right`}
						>
							Actions
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className="[&_tr:last-child>td]:border-b-0">
					{items.map((item) => (
						<TableRow
							key={item.id}
							className={cn(
								DATA_TABLE_BODY_ROW_CLICKABLE,
								"group",
								selectedIds.includes(item.id) && "bg-blue-50/50",
							)}
							onClick={() => canReview && setPreviewItem(item)}
						>
							<TableCell
								className="py-3 pl-4 pr-2"
								onClick={(e) => e.stopPropagation()}
							>
								<Checkbox
									checked={selectedIds.includes(item.id)}
									onCheckedChange={() => toggleSelected(item.id)}
									aria-label={`Select ${item.title}`}
									className="cursor-pointer"
								/>
							</TableCell>
							<TableCell className="py-3 sticky left-10 z-10 backdrop-blur-md bg-white/10 group-hover:bg-white/25 border-r border-white/30">
								<div className="min-w-0 max-w-[220px]">
									<p
										className="subtitle-2 text-slate-900 truncate"
										title={item.title}
									>
										{item.title}
									</p>
									{item.subtitle && (
										<p className="text-xs text-slate-500 truncate">
											{item.subtitle}
										</p>
									)}
								</div>
							</TableCell>
							<TableCell className="py-3 text-slate-700 whitespace-nowrap text-sm">
								{item.itemType || "—"}
							</TableCell>
							<TableCell className="py-3 text-slate-700 whitespace-nowrap text-sm">
								{item.department || "—"}
							</TableCell>
							<TableCell className="py-3 text-slate-700 whitespace-nowrap text-sm max-w-[140px] truncate">
								{item.assignees.length > 0
									? item.assignees.join(", ")
									: "—"}
							</TableCell>
							<TableCell className="py-3 text-slate-700 whitespace-nowrap">
								<FormattedDateTime date={item.submittedAt} className="body-2" />
							</TableCell>
							<TableCell className="py-3 whitespace-nowrap">
								<span
									className={cn(
										"text-sm",
										isAgingUrgent(item) ? "text-orange font-medium" : "text-slate-600",
									)}
								>
									{agingLabel(item)}
								</span>
							</TableCell>
							<TableCell className="py-3 whitespace-nowrap">
								<Badge
									variant="outline"
									className={cn(
										"border capitalize",
										statusBadgeClasses(item.status),
									)}
								>
									{statusLabel(item.status)}
								</Badge>
							</TableCell>
							<TableCell
								className="py-3 text-right"
								onClick={(e) => e.stopPropagation()}
							>
								<div className="flex items-center justify-end gap-2">
									{canReview && (
										<Button
											type="button"
											size="sm"
											variant="outline"
											className="cursor-pointer h-8"
											onClick={() => setPreviewItem(item)}
										>
											Review
										</Button>
									)}
									{canDecide &&
										(item.status === "pending-review" ||
											item.status === "action-required") && (
											<Button
												type="button"
												size="sm"
												className="primary-btn px-3 h-8 cursor-pointer"
												disabled={busyId === item.id}
												onClick={() => quickApprove(item)}
											>
												Approve
											</Button>
										)}
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
