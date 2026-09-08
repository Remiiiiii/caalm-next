"use client";

import { agingLabel } from "@/components/approvals/ApprovalsAttentionStrip";
import FormattedDateTime from "@/components/FormattedDateTime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	type ApprovalQueueItem,
	isSlaAtRisk,
	isSlaBreached,
	slaBadgeClasses,
	slaBadgeLabel,
	statusBadgeClasses,
	statusLabel,
} from "@/lib/approvals/approvalsListUtils";
import { cn } from "@/lib/utils";

interface ApprovalsMobileListProps {
	items: ApprovalQueueItem[];
	selectedIds: string[];
	busyId: string | null;
	canReview: boolean;
	canDecide: boolean;
	onToggleSelected: (id: string) => void;
	onPreview: (item: ApprovalQueueItem) => void;
	onQuickApprove: (item: ApprovalQueueItem) => void;
}

/** Phone companion cards — same actions as the desktop table, no side-scroll. */
export default function ApprovalsMobileList({
	items,
	selectedIds,
	busyId,
	canReview,
	canDecide,
	onToggleSelected,
	onPreview,
	onQuickApprove,
}: ApprovalsMobileListProps) {
	return (
		<div className="space-y-3 px-3 pb-4 md:hidden">
			{items.map((item) => (
				<Card
					key={item.id}
					className={cn(
						"glass-card interactive-glass-card cursor-pointer transition-all duration-200 hover:border-blue-300 hover:shadow-md",
						selectedIds.includes(item.id) && "border-blue-300 bg-blue-50/40",
					)}
					tabIndex={0}
					role="button"
					onClick={() => canReview && onPreview(item)}
					onKeyDown={(e) => {
						if ((e.key === "Enter" || e.key === " ") && canReview) {
							e.preventDefault();
							onPreview(item);
						}
					}}
				>
					<div className="glass-card-cap" />
					<CardContent className="p-4">
						<div className="flex items-start gap-3">
							<div
								className="pt-1"
								onClick={(e) => e.stopPropagation()}
								onKeyDown={(e) => e.stopPropagation()}
							>
								<Checkbox
									checked={selectedIds.includes(item.id)}
									onCheckedChange={() => onToggleSelected(item.id)}
									aria-label={`Select ${item.title}`}
									className="cursor-pointer"
								/>
							</div>
							<div className="min-w-0 flex-1">
								<p className="text-sm font-medium sidebar-gradient-text truncate">
									{item.title}
								</p>
								{item.subtitle ? (
									<p className="mt-0.5 text-xs text-slate-500 truncate">
										{item.subtitle}
									</p>
								) : null}
								<p className="mt-1 text-xs text-slate-600">
									{[item.itemType, item.department]
										.filter(Boolean)
										.join(" · ") || "—"}
								</p>
								<div className="mt-2 flex flex-wrap items-center gap-2">
									<Badge
										variant="outline"
										className={cn(
											"border capitalize",
											statusBadgeClasses(item.status),
										)}
									>
										{statusLabel(item.status)}
									</Badge>
									{item.slaStatus || item.dueAt ? (
										<span
											className={cn(
												"inline-block px-2 py-0.5 text-xs rounded-full font-medium border",
												slaBadgeClasses(item.slaStatus),
											)}
										>
											{slaBadgeLabel(item) || agingLabel(item)}
										</span>
									) : (
										<span
											className={cn(
												"text-xs",
												isSlaAtRisk(item) || isSlaBreached(item)
													? "text-orange font-medium"
													: "text-slate-600",
											)}
										>
											{agingLabel(item)}
										</span>
									)}
									<span className="text-xs text-slate-500">
										<FormattedDateTime
											date={item.submittedAt}
											className="text-xs text-slate-500"
										/>
									</span>
								</div>
								<div
									className="mt-3 flex flex-wrap gap-2"
									onClick={(e) => e.stopPropagation()}
									onKeyDown={(e) => e.stopPropagation()}
								>
									{canReview && (
										<Button
											type="button"
											variant="outline"
											className="cursor-pointer h-10 min-w-[5.5rem] px-4"
											onClick={() => onPreview(item)}
										>
											Review
										</Button>
									)}
									{canDecide &&
										(item.status === "pending-review" ||
											item.status === "action-required") && (
											<Button
												type="button"
												className="primary-btn h-10 min-w-[5.5rem] px-4 cursor-pointer"
												disabled={busyId === item.id}
												onClick={() => onQuickApprove(item)}
											>
												Approve
											</Button>
										)}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
