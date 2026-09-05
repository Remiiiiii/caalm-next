"use client";

import {
	CheckCircle2,
	GitBranch,
	InfoIcon,
	Loader2,
	MessageSquareWarning,
	RefreshCw,
	XCircle,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ExpirationAttestationDialog } from "@/components/approvals/ExpirationAttestationDialog";
import { WorkflowFrozenBanner } from "@/components/approvals/WorkflowFrozenBanner";
import { ContractRenewalDialog } from "@/components/contracts/ContractRenewalDialog";
import ApprovalWorkflowActions from "@/components/contracts/approval/ApprovalWorkflowActions";
import ContractApprovalFlowCanvas from "@/components/contracts/approval/ContractApprovalFlowCanvas";
import { WorkflowStatusBadge } from "@/components/contracts/approval/WorkflowStatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useContractApprovalWorkflow } from "@/hooks/useContractApprovalWorkflow";
import type { ApprovalDecision } from "@/lib/approvals/contractApprovalWorkflow.types";

interface ContractApprovalFlowDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	contractId: string;
	contractName?: string;
}

export default function ContractApprovalFlowDialog({
	open,
	onOpenChange,
	contractId,
	contractName,
}: ContractApprovalFlowDialogProps) {
	const { workflow, isLoading, error, decide, reassign, resubmit, refresh } =
		useContractApprovalWorkflow(open ? contractId : null);
	const { toast } = useToast();
	const router = useRouter();
	const pathname = usePathname();
	const [notes, setNotes] = useState("");
	const [busy, setBusy] = useState(false);
	const [attestOpen, setAttestOpen] = useState(false);
	const [renewOpen, setRenewOpen] = useState(false);

	const handleDecision = async (decision: ApprovalDecision) => {
		if (
			(decision === "rejected" || decision === "changes_requested") &&
			!notes.trim()
		) {
			toast({
				title: "Notes required",
				description: "Add a short note for deny or request changes.",
				variant: "destructive",
			});
			return;
		}
		setBusy(true);
		try {
			const result = await decide({
				decision,
				notes,
				path: pathname || "/contracts",
			});
			toast({
				title:
					decision === "approved"
						? "Step approved"
						: decision === "changes_requested"
							? "Changes requested"
							: "Contract rejected",
				description:
					result.contractStatus === "active"
						? "Contract is now active."
						: `Contract status: ${result.contractStatus}`,
			});
			setNotes("");
			router.refresh();
			if (result.contractStatus === "active" || decision === "rejected") {
				onOpenChange(false);
			}
		} catch (err) {
			toast({
				title: "Decision failed",
				description:
					err instanceof Error ? err.message : "Could not record decision",
				variant: "destructive",
			});
		} finally {
			setBusy(false);
		}
	};

	return (
		<>
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[90vh] max-w-[960px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl">
				<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />

				<div className="sticky top-0 z-10 mt-4 border-b border-slate-200 bg-linear-to-r from-blue-50 to-indigo-50 py-4">
					<div className="flex items-center gap-3 px-6">
						<GitBranch className="h-5 w-5 text-[#0f5384]" />
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							Approval workflow
						</DialogTitle>
					</div>
					<p className="mt-1 ml-14 text-sm text-slate-600">
						{contractName || workflow?.contractName || "Contract"} — track
						review steps through executive activation
					</p>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-6">
					{isLoading ? (
						<div className="flex h-48 items-center justify-center text-sm text-slate-500">
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Loading workflow…
						</div>
					) : error ? (
						<div className="rounded-lg border border-red/20 bg-red/5 p-4 text-sm text-red">
							{(error as Error).message || "Failed to load workflow"}
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="ml-3 primary-btn"
								onClick={() => void refresh()}
							>
								<RefreshCw className="h-3.5 w-3.5" />
								Retry
							</Button>
						</div>
					) : workflow ? (
						<div className="space-y-4">
							{workflow.workflowFrozen ? (
								<WorkflowFrozenBanner
									status={workflow.contractStatus}
									attestPending
									onAttest={() => setAttestOpen(true)}
									onRenew={() => setRenewOpen(true)}
								/>
							) : null}
							<div className="flex flex-wrap items-center gap-2">
								<WorkflowStatusBadge status={workflow.contractStatus} />
								{workflow.department ? (
									<span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
										{workflow.department}
										{workflow.subDepartment
											? ` · ${workflow.subDepartment}`
											: ""}
									</span>
								) : null}
							</div>
							<ContractApprovalFlowCanvas workflow={workflow} />
							{workflow.workflowFrozen ? null : (
							<ApprovalWorkflowActions
								workflow={workflow}
								busy={busy}
								onReassign={async (assigneeUserIds) => {
									try {
										await reassign({
											assigneeUserIds,
											path: pathname || "/contracts",
										});
										toast({
											title: "Step reassigned",
											description: "Approval assignees were updated.",
										});
										router.refresh();
									} catch (err) {
										toast({
											title: "Reassign failed",
											description:
												err instanceof Error
													? err.message
													: "Could not reassign",
											variant: "destructive",
										});
										throw err;
									}
								}}
								onResubmit={async () => {
									try {
										await resubmit({ path: pathname || "/contracts" });
										toast({
											title: "Resubmitted",
											description: "Department review restarted.",
										});
										router.refresh();
									} catch (err) {
										toast({
											title: "Resubmit failed",
											description:
												err instanceof Error
													? err.message
													: "Could not resubmit",
											variant: "destructive",
										});
										throw err;
									}
								}}
							/>
							)}
							{(workflow.canDecide || workflow.canOverride) && (
								<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
									<p className="mb-2 text-sm font-medium text-slate-700">
										{workflow.canDecide
											? "Your decision on this step"
											: "Admin override"}
									</p>
									<Textarea
										value={notes}
										onChange={(e) => setNotes(e.target.value)}
										placeholder="Add notes (required for Reject or Request changes)"
										className="min-h-[72px] border-[0.25px] border-slate-300 bg-white shadow-none focus-visible:border-[#078FAB]"
									/>
									<div className="flex items-center gap-2 mt-2">
										<InfoIcon className="h-3.5 w-3.5 text-slate-500 mt-2" />
										<p className="mt-2 text-xs text-slate-500">
											Notes are shared with the submitter log.
										</p>
									</div>
								</div>
							)}
						</div>
					) : null}
				</div>

				<div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
					{workflow && (workflow.canDecide || workflow.canOverride) ? (
						<>
							<Button
								type="button"
								className="primary-btn px-3 sm:px-4"
								disabled={busy}
								onClick={() => void handleDecision("rejected")}
							>
								<XCircle className="h-4 w-4" />
								Reject
							</Button>
							<Button
								type="button"
								className="primary-btn px-3 sm:px-4"
								disabled={busy}
								onClick={() => void handleDecision("changes_requested")}
							>
								<MessageSquareWarning className="h-4 w-4" />
								Request changes
							</Button>
							<Button
								type="button"
								className="primary-btn px-3 sm:px-4"
								disabled={busy}
								onClick={() => void handleDecision("approved")}
							>
								{busy ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<CheckCircle2 className="h-4 w-4" />
								)}
								Approve
							</Button>
						</>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
			<ExpirationAttestationDialog
				open={attestOpen}
				onOpenChange={setAttestOpen}
				entityType="contract"
				entityId={contractId}
				entityName={contractName || workflow?.contractName || "Contract"}
				attestationId={workflow?.expirationAttestationId}
				phase="post_expiry"
				onSuccess={() => void refresh()}
			/>
			<ContractRenewalDialog
				open={renewOpen}
				onOpenChange={setRenewOpen}
				contractId={contractId}
				contractName={contractName || workflow?.contractName || "Contract"}
				onSuccess={() => {
					void refresh();
					router.refresh();
				}}
			/>
		</>
	);
}
