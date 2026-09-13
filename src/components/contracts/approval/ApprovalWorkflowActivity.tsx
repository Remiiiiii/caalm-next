"use client";

import { FileText, History, Loader2 } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { ApprovalHistoryEvent } from "@/lib/approvals/approvalHistory";
import type { ApprovalWorkflowViewerPayload } from "@/lib/approvals/contractApprovalWorkflow.types";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { cn } from "@/lib/utils";

interface ApprovalWorkflowActivityProps {
	events: ApprovalHistoryEvent[];
	workflow: ApprovalWorkflowViewerPayload;
	entityType: "contract" | "license";
}

type DotTone = "green" | "orange" | "red" | "teal";

function isCompleteType(type: string): boolean {
	return (
		type === "executive_approved" ||
		type === "stage_advanced" ||
		type === "claimed" ||
		type === "delegated" ||
		type === "resubmitted"
	);
}

function isWarnType(type: string): boolean {
	return (
		type === "pending_review" ||
		type === "needs_executive_assignment" ||
		type === "changes_requested" ||
		type === "sla_at_risk" ||
		type === "sla_due_soon" ||
		type === "sla_escalated"
	);
}

function isFailType(type: string): boolean {
	return type === "rejected" || type === "sla_breached";
}

function toneForType(type: string): DotTone {
	if (isCompleteType(type)) return "green";
	if (isWarnType(type)) return "orange";
	if (isFailType(type)) return "red";
	return "teal";
}

const TONE_HEX: Record<DotTone, string> = {
	green: "#1F9D55",
	orange: "#E8871E",
	red: "#D64545",
	teal: "#0E7C86",
};

export default function ApprovalWorkflowActivity({
	events,
	workflow,
	entityType,
}: ApprovalWorkflowActivityProps) {
	const { toast } = useToast();
	const [exporting, setExporting] = useState(false);

	const canExport =
		workflow.contractStatus === "active" ||
		workflow.contractStatus === "pending-signature";
	const orderedEvents = [...events].reverse();
	const currentStep = workflow.steps[workflow.currentStepIndex];
	const currentEventId =
		currentStep?.status === "current"
			? orderedEvents.find(
					(event) =>
						event.stepId === currentStep.id ||
						event.type === "pending_review" ||
						event.type === "needs_executive_assignment",
				)?.id
			: undefined;

	const exportReport = async () => {
		setExporting(true);
		try {
			const path =
				entityType === "license"
					? `/api/licenses/${workflow.contractId}/approval-workflow/report`
					: `/api/contracts/${workflow.contractId}/approval-workflow/report`;
			const response = await fetch(path, { method: "POST" });
			if (!response.ok) {
				const data = (await response.json().catch(() => null)) as {
					error?: string;
				} | null;
				throw new Error(
					toUserFacingErrorMessage(
						data?.error,
						"Could not generate the report. Please try again.",
					),
				);
			}
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			const safeName = (workflow.contractName || entityType)
				.replace(/[^\w\-]+/g, "-")
				.replace(/-+/g, "-");
			link.download = `${safeName}-approval-audit-report.pdf`;
			link.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			toast({
				title: "Export failed",
				description: toUserFacingErrorMessage(
					error,
					"Could not generate the report. Please try again.",
				),
				variant: "destructive",
			});
		} finally {
			setExporting(false);
		}
	};

	return (
		<div
			id="approval-activity"
			className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
		>
			<div className="mb-3 flex items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<History className="h-4 w-4 text-[#0f5384]" />
					<p className="text-sm font-medium text-slate-700">Activity</p>
				</div>
				{canExport ? (
					<Button
						type="button"
						variant="outline"
						className="primary-btn px-3 sm:px-4"
						disabled={exporting}
						onClick={() => void exportReport()}
					>
						{exporting ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<FileText className="h-4 w-4" />
						)}
						Export Report
					</Button>
				) : null}
			</div>
			{orderedEvents.length === 0 ? (
				<p className="text-sm text-slate-500">No activity recorded yet.</p>
			) : (
				<ol className="relative ml-3 border-l border-slate-200 pl-6">
					{orderedEvents.map((event) => {
						const tone = toneForType(event.type);
						const isCurrent = event.id === currentEventId;
						return (
							<li key={event.id} className="relative pb-4 last:pb-0">
								<span
									className={cn(
										"absolute -left-[1.9rem] top-2 h-3 w-3",
										isCurrent && "approval-activity-sonar",
									)}
									style={
										isCurrent
											? ({
													"--approval-sonar-color": TONE_HEX[tone],
												} as CSSProperties)
											: undefined
									}
								>
									{isCurrent ? (
										<>
											<span className="approval-activity-sonar-ring" />
											<span className="approval-activity-sonar-ring approval-activity-sonar-ring-delay" />
										</>
									) : null}
									<span
										className={cn(
											"absolute inset-0 rounded-full border-2 bg-white",
											tone === "green" && "border-green bg-green",
											tone === "orange" && "border-orange bg-orange",
											tone === "red" && "border-red bg-red",
											tone === "teal" && "border-[#0E7C86] bg-[#0E7C86]",
										)}
									/>
								</span>
								<div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
									<p className="font-medium">{event.label}</p>
									{event.reason ? (
										<p className="mt-0.5 text-xs text-slate-600">
											Reason: {event.reason}
										</p>
									) : null}
									{event.detail ? (
										<p className="mt-0.5 text-xs text-slate-600">{event.detail}</p>
									) : null}
									<p className="text-xs text-slate-500">
										{new Date(event.at).toLocaleString()} · {event.type}
									</p>
								</div>
							</li>
						);
					})}
				</ol>
			)}
		</div>
	);
}
