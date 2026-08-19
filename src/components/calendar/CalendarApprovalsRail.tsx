"use client";

import { formatDistanceToNow } from "date-fns";
import {
	AlertCircle,
	CalendarPlus,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	ClipboardClock,
	Clock,
	Edit,
	FileCheck,
	Loader2,
	Trash2,
} from "lucide-react";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import { type CalendarSensitivity, SENSITIVITY_LABELS } from "@/constants/rbac";
import type {
	CalendarApprovalChangeSummary,
	CalendarApprovalRequest,
} from "@/lib/actions/calendar-approval.actions";
import { useOrgTimezone } from "@/hooks/useOrgTimezone";
import { formatInTimezone } from "@/lib/timezone";
import { cn } from "@/lib/utils";

function getSensitivityBadgeClasses(
	sensitivityLevel: CalendarSensitivity,
): string {
	switch (sensitivityLevel) {
		case "standard":
			return "bg-[#d4fcee] text-[#10b981] border-[#10b981]";
		case "restricted":
			return "bg-[#f5f2f9] text-[#a06ce2] border-[#a06ce2]";
		case "confidential":
			return "bg-[#d9e3f9] text-[#0033A0] border-[#0033A0]";
		default:
			return "bg-slate-50 text-slate-700 border-slate-200";
	}
}

interface CalendarApprovalsRailProps {
	approvals: CalendarApprovalRequest[];
	isLoading: boolean;
	isExpanded: boolean;
	onExpandedChange: (expanded: boolean) => void;
	onSelectApproval: (approval: CalendarApprovalRequest) => void;
	className?: string;
}

export function CalendarApprovalsRail({
	approvals,
	isLoading,
	isExpanded,
	onExpandedChange,
	onSelectApproval,
	className,
}: CalendarApprovalsRailProps) {
	const timeZone = useOrgTimezone();
	const getChangeTypeConfig = (
		type: string,
	): {
		icon: React.ReactNode;
		color: string;
		bgColor: string;
	} => {
		switch (type) {
			case "create":
				return {
					icon: <CalendarPlus className="h-4 w-4" />,
					color: "text-green-600",
					bgColor: "bg-green-50",
				};
			case "update":
				return {
					icon: <Edit className="h-4 w-4" />,
					color: "text-blue-600",
					bgColor: "bg-blue-50",
				};
			case "cancel":
				return {
					icon: <Trash2 className="h-4 w-4" />,
					color: "text-red-600",
					bgColor: "bg-red-50",
				};
			default:
				return {
					icon: <FileCheck className="h-4 w-4" />,
					color: "text-slate-600",
					bgColor: "bg-slate-50",
				};
		}
	};

	if (!isExpanded) {
		return (
			<aside
				className={cn(
					"hidden lg:flex flex-col items-center border-l border-slate-200 bg-white/70 w-12 shrink-0 py-4",
					className,
				)}
			>
				<button
					type="button"
					onClick={() => onExpandedChange(true)}
					className="flex flex-col items-center gap-2 cursor-pointer hover:bg-blue-50 rounded-lg p-2 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
					aria-label="Expand approvals"
				>
					<ClipboardClock className="h-5 w-5 text-[#0f5384]" />
					{approvals.length > 0 && (
						<span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
							{approvals.length}
						</span>
					)}
					<ChevronLeft className="h-4 w-4 text-slate-500" />
				</button>
			</aside>
		);
	}

	return (
		<aside
			className={cn(
				"w-full lg:w-72 lg:min-w-[260px] lg:max-w-[300px] border-t lg:border-t-0 lg:border-l border-slate-200 bg-white/70 flex flex-col shrink-0 max-h-[480px] lg:max-h-none",
				className,
			)}
		>
			<div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50/90 to-white/90">
				<div className="flex items-center gap-2 min-w-0">
					<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 shrink-0">
						<ClipboardClock className="h-5 w-5 text-[#0f5384]" />
					</div>
					<div className="min-w-0">
						<h3 className="text-sm font-semibold sidebar-gradient-text truncate">
							Pending Approvals
						</h3>
						<p className="text-xs text-slate-600 truncate">
							{isLoading ? (
								<span className="flex items-center gap-1">
									<Loader2 className="h-3 w-3 animate-spin" />
									Loading...
								</span>
							) : approvals.length > 0 ? (
								<span className="flex items-center gap-1">
									<AlertCircle className="h-3 w-3 text-amber-500" />
									{approvals.length} awaiting review
								</span>
							) : (
								<span className="flex items-center gap-1 text-green-600">
									<CheckCircle2 className="h-3 w-3 text-green" />
									All caught up
								</span>
							)}
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={() => onExpandedChange(false)}
					className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 cursor-pointer transition-colors duration-200"
					aria-label="Collapse approvals"
				>
					<ChevronRight className="h-4 w-4 text-slate-600" />
				</button>
			</div>

			<div className="flex-1 overflow-y-auto p-3 space-y-2.5">
				{!isLoading &&
					approvals.length > 0 &&
					approvals.map((approval) => {
						const summary =
							(approval.changeSummary as CalendarApprovalChangeSummary) || {};
						const after = (summary.after || {}) as Record<string, unknown>;
						const before = (summary.before || {}) as Record<string, unknown>;
						const title =
							(after.title as string) ||
							(before.title as string) ||
							"Untitled Event";
						const sensitivityLevel =
							(after.sensitivityLevel as CalendarSensitivity) ||
							approval.sensitivityLevel ||
							"standard";
						const submittedTime = approval.submittedAt
							? new Date(approval.submittedAt)
							: null;
						const timeAgo = submittedTime
							? formatDistanceToNow(submittedTime, { addSuffix: true })
							: "recently";
						const changeTypeConfig = getChangeTypeConfig(approval.changeType);

						return (
							<button
								key={approval.$id}
								type="button"
								className="group w-full text-left relative rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
								onClick={() => onSelectApproval(approval)}
							>
								<div className="flex items-start gap-2.5">
									<div
										className={cn(
											"flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0",
											changeTypeConfig.bgColor,
										)}
									>
										<div className={changeTypeConfig.color}>
											{changeTypeConfig.icon}
										</div>
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-start justify-between gap-1 mb-1">
											<h4 className="text-sm font-semibold text-slate-700 line-clamp-2 group-hover:text-blue-600 transition-colors">
												{title}
											</h4>
										</div>
										<div className="flex flex-wrap items-center gap-1.5 mb-1.5">
											<Badge
												variant="outline"
												className="text-[10px] font-medium px-1.5 py-0 uppercase tracking-wide border-slate-300 text-slate-700"
											>
												{approval.changeType}
											</Badge>
											{sensitivityLevel !== "standard" && (
												<Badge
													className={cn(
														"text-[10px] font-medium px-1.5 py-0 border pointer-events-none",
														getSensitivityBadgeClasses(sensitivityLevel),
													)}
												>
													{SENSITIVITY_LABELS[sensitivityLevel]}
												</Badge>
											)}
										</div>
										<div className="flex items-center gap-2 text-xs text-slate-500">
											<span className="flex items-center gap-1">
												<Clock className="h-3 w-3" />
												{timeAgo}
											</span>
											{submittedTime && (
												<span className="text-slate-400">
													{formatInTimezone(
														submittedTime,
														"MMM d, h:mm a",
														timeZone,
													)}
												</span>
											)}
										</div>
									</div>
								</div>
							</button>
						);
					})}

				{!isLoading && approvals.length === 0 && (
					<div className="flex flex-col items-center justify-center py-10 px-3 text-center">
						<div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
							<CheckCircle2 className="h-8 w-8 text-green" />
						</div>
						<p className="text-sm font-medium text-slate-700 mb-1">
							All caught up
						</p>
						<p className="text-xs text-slate-500">
							No pending approval requests
						</p>
					</div>
				)}

				{isLoading && (
					<div className="flex items-center justify-center py-10">
						<div className="flex items-center gap-2 text-sm text-slate-500">
							<Loader2 className="h-4 w-4 animate-spin" />
							<span>Loading...</span>
						</div>
					</div>
				)}
			</div>
		</aside>
	);
}

export default CalendarApprovalsRail;
