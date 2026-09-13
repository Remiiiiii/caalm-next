"use client";

import {
	CheckCircle2,
	Info,
	Loader2,
	MessageSquareWarning,
	ShieldAlert,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Textarea } from "@/components/ui/textarea";
import type {
	ApprovalDecision,
	ApprovalWorkflowViewerPayload,
} from "@/lib/approvals/contractApprovalWorkflow.types";
import { cn } from "@/lib/utils";

interface ApprovalDecisionControlsProps {
	workflow: ApprovalWorkflowViewerPayload;
	notes: string;
	onNotesChange: (value: string) => void;
	busy: boolean;
	onDecide: (decision: ApprovalDecision) => void;
}

export function canShowActiveDecisions(
	workflow: ApprovalWorkflowViewerPayload,
): boolean {
	return workflow.canDecideAsAssignee || workflow.canAdminOverrideActiveStep;
}

export default function ApprovalDecisionControls({
	workflow,
	notes,
	onNotesChange,
	busy,
	onDecide,
}: ApprovalDecisionControlsProps) {
	const [overrideOpen, setOverrideOpen] = useState(false);
	const [overrideUnlocked, setOverrideUnlocked] = useState(false);
	const showActive = canShowActiveDecisions(workflow);
	const showCompletedOverride = workflow.canAdminOverrideCompleted;

	if (!showActive && !showCompletedOverride) return null;

	const buttons = (
		<div className="flex flex-wrap items-center justify-end gap-3">
			{workflow.canReject ? (
				<Button
					type="button"
					className="primary-btn px-3 sm:px-4"
					disabled={busy}
					title={workflow.decisionBlockReason}
					onClick={() => void onDecide("rejected")}
				>
					<XCircle className="h-4 w-4" />
					Reject
				</Button>
			) : null}
			<Button
				type="button"
				className="primary-btn px-3 sm:px-4"
				disabled={busy}
				title={workflow.decisionBlockReason}
				onClick={() => void onDecide("changes_requested")}
			>
				<MessageSquareWarning className="h-4 w-4" />
				Request changes
			</Button>
			<Button
				type="button"
				className="primary-btn px-3 sm:px-4"
				disabled={busy}
				title={workflow.decisionBlockReason}
				onClick={() => void onDecide("approved")}
			>
				{busy ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					<CheckCircle2 className="h-4 w-4" />
				)}
				{busy ? "Processing…" : "Approve"}
			</Button>
		</div>
	);

	return (
		<>
			{showActive ? (
				<div
					className={cn(
						"rounded-xl bg-white p-4 shadow-sm",
						workflow.canDecideAsAssignee
							? "border border-slate-200"
							: "border border-red/40",
					)}
				>
					<p className="mb-2 text-sm font-medium text-slate-700">
						{workflow.canDecideAsAssignee
							? "Your decision on this step"
							: "Admin override"}
					</p>
					<Textarea
						value={notes}
						onChange={(e) => onNotesChange(e.target.value)}
						placeholder="Add notes (required for Reject or Request changes)"
						className="min-h-[72px] border-[0.25px] border-slate-300 bg-white shadow-none focus-visible:border-[#078FAB]"
					/>
					<p className="mt-2 flex items-start gap-2 text-xs text-slate-500">
						<Info
							className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500"
							aria-hidden
						/>
						<span>Notes are shared with the submitter log.</span>
					</p>
					<div className="mt-3">{buttons}</div>
				</div>
			) : null}

			{showCompletedOverride ? (
				<div className="overflow-hidden rounded-xl border border-orange/20 bg-orange/5">
					{overrideUnlocked ? (
						<div className="space-y-3 p-4">
							<p className="flex items-center gap-2 text-sm font-medium text-slate-700">
								<ShieldAlert className="h-4 w-4 text-orange" />
								Admin override
							</p>
							<p className="text-xs text-slate-600">
								This workflow is complete. Override is a separate action and
								requires confirmation.
							</p>
							<Textarea
								value={notes}
								onChange={(e) => onNotesChange(e.target.value)}
								placeholder="Override notes are required"
								className="min-h-[72px] border-[0.25px] border-slate-300 bg-white shadow-none focus-visible:border-[#078FAB]"
							/>
							<div className="mt-3">{buttons}</div>
						</div>
					) : (
						<div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] items-center">
							<div className="min-w-0 px-5 py-4">
								<p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
									<ShieldAlert className="h-4 w-4 text-orange" />
									Admin override
								</p>
								<p className="mt-1 ml-6 text-xs leading-relaxed text-slate-600">
									This workflow is complete. Override is a separate action and
									requires confirmation.
								</p>
							</div>
							<div className="relative min-w-0 self-stretch px-5 py-4 flex flex-col justify-center">
								<span
									aria-hidden
									className="pointer-events-none absolute top-3 bottom-3 left-0 w-px bg-slate-200"
								/>
								<span
									aria-hidden
									className="pointer-events-none absolute top-3 bottom-3 right-0 w-px bg-slate-200"
								/>
								<p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
									Audit note
								</p>
								<p className="mt-1 text-xs leading-relaxed text-slate-600">
									This action will be logged with your name and timestamp in
									the audit trail.
								</p>
							</div>
							<div className="flex items-center px-5 py-4">
								<Button
									type="button"
									className="primary-btn px-3 sm:px-4"
									onClick={() => setOverrideOpen(true)}
								>
									<ShieldAlert className="h-4 w-4" />
									Unlock override
								</Button>
							</div>
						</div>
					)}
				</div>
			) : null}

			<DeleteConfirmationDialog
				open={overrideOpen}
				onOpenChange={setOverrideOpen}
				title="Unlock admin override"
				description="Type the item name to confirm. This can reject or send a completed item back."
				itemName={workflow.contractName}
				requireConfirmation
				confirmLabel="Unlock override"
				onConfirm={() => {
					setOverrideUnlocked(true);
					setOverrideOpen(false);
				}}
			/>
		</>
	);
}
