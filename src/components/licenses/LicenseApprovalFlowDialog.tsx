"use client";

import {
	ArrowLeftToLine,
	Eye,
	FileText,
	GitBranch,
	Info,
	Loader2,
	PenLine,
	RefreshCw,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ExpirationAttestationDialog } from "@/components/approvals/ExpirationAttestationDialog";
import { WorkflowFrozenBanner } from "@/components/approvals/WorkflowFrozenBanner";
import ApprovalDecisionControls from "@/components/contracts/approval/ApprovalDecisionControls";
import ApprovalWorkflowActions from "@/components/contracts/approval/ApprovalWorkflowActions";
import ApprovalWorkflowActivity from "@/components/contracts/approval/ApprovalWorkflowActivity";
import ApprovalWaitingBanner from "@/components/contracts/approval/ApprovalWaitingBanner";
import ContractApprovalFlowCanvas from "@/components/contracts/approval/ContractApprovalFlowCanvas";
import { WorkflowStatusBadge } from "@/components/contracts/approval/WorkflowStatusBadge";
import { WizardPdfPreview } from "@/components/contract-wizard/WizardPdfPreview";
import LicenseRenewalDialog from "@/components/licenses/LicenseRenewalDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PERMISSIONS } from "@/constants/permissions";
import { useToast } from "@/hooks/use-toast";
import { useLicenseApprovalWorkflow } from "@/hooks/useLicenseApprovalWorkflow";
import { usePermissions } from "@/hooks/usePermissions";
import { historyFromNotifications } from "@/lib/approvals/approvalHistory";
import type { ApprovalDecision } from "@/lib/approvals/contractApprovalWorkflow.types";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { cn, constructFileUrl } from "@/lib/utils";
import type { License } from "@/types/licenses";

interface LicenseApprovalFlowDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	licenseId: string;
	licenseName?: string;
}

export default function LicenseApprovalFlowDialog({
	open,
	onOpenChange,
	licenseId,
	licenseName,
}: LicenseApprovalFlowDialogProps) {
	const { workflow, isLoading, error, decide, reassign, resubmit, claim, refresh } =
		useLicenseApprovalWorkflow(open ? licenseId : null);
	const { toast } = useToast();
	const { permissions } = usePermissions();
	const router = useRouter();
	const pathname = usePathname();
	const [notes, setNotes] = useState("");
	const [busy, setBusy] = useState(false);
	const [attestOpen, setAttestOpen] = useState(false);
	const [renewOpen, setRenewOpen] = useState(false);
	const [documentSplit, setDocumentSplit] = useState(false);

	const isPendingSignature = workflow?.contractStatus === "pending-signature";
	const canStartEsign =
		isPendingSignature && permissions.includes(PERMISSIONS.LICENSES.SIGN);
	const documentUrl =
		workflow?.documentUrl ||
		(workflow?.fileRef ? constructFileUrl(workflow.fileRef) : null);
	const documentLabel =
		workflow?.documentFileName ||
		licenseName ||
		workflow?.contractName ||
		"Document";
	const documentSplitOpen = Boolean(documentUrl && documentSplit);

	useEffect(() => {
		if (!open) setDocumentSplit(false);
	}, [open]);

	const handleDecision = async (decision: ApprovalDecision) => {
		if (decision === "rejected" && workflow && !workflow.canReject) return;
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
				path: pathname || "/licenses",
			});
			toast({
				title:
					decision === "approved"
						? "Step approved"
						: decision === "changes_requested"
							? "Changes requested"
							: "License rejected",
				description:
					result.contractStatus === "active"
						? "License is now active."
						: `License status: ${result.contractStatus}`,
			});
			setNotes("");
			router.refresh();
			if (result.contractStatus === "active" || decision === "rejected") {
				onOpenChange(false);
			}
		} catch (err) {
			toast({
				title: "Decision failed",
				description: toUserFacingErrorMessage(
					err,
					"Could not record your decision. Please try again.",
				),
				variant: "destructive",
			});
		} finally {
			setBusy(false);
		}
	};

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					overlayClassName="z-[60]"
					className={cn(
						"z-[60] flex max-h-[90vh] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl",
						documentSplitOpen
							? "w-[min(98vw,1700px)] max-w-[1700px]"
							: "max-w-[960px]",
					)}
				>
					<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />

					<div className="sticky top-0 z-10 mt-4 border-b border-slate-200 bg-linear-to-r from-blue-50 to-indigo-50 py-4">
						<div className="flex items-center gap-3 px-6">
							<GitBranch className="h-5 w-5 text-[#0f5384]" />
							<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
								Approval workflow
							</DialogTitle>
						</div>
						<p className="mt-1 ml-14 text-sm text-slate-600">
							{licenseName || workflow?.contractName || "License"} — Track
							review steps through executive activation
						</p>
					</div>

					<div
						className={cn(
							"min-h-0 flex-1 bg-slate-50",
							documentSplitOpen ? "flex overflow-hidden" : "overflow-y-auto p-6",
						)}
					>
						<div
							className={cn(
								documentSplitOpen &&
									"min-h-0 w-[min(900px,52%)] shrink-0 overflow-y-auto p-6",
							)}
						>
						{isLoading ? (
							<div className="flex h-48 items-center justify-center text-sm text-slate-500">
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Loading workflow…
							</div>
						) : error ? (
							<div className="rounded-lg border border-red/20 bg-red/5 p-4 text-sm text-red">
								{toUserFacingErrorMessage(
									error,
									"Could not load the approval workflow. Please try again.",
								)}
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
								{documentUrl ? (
									<button
										type="button"
										onClick={() => setDocumentSplit((value) => !value)}
										className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 text-left text-xs text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]"
										aria-expanded={documentSplit}
										aria-label={
											documentSplit
												? `Hide ${documentLabel}`
												: `View ${documentLabel}`
										}
									>
										<FileText className="h-4 w-4 shrink-0 text-[#0f5384]" />
										<span className="min-w-0 flex-1 truncate font-medium text-slate-800">
											{documentLabel}
										</span>
										<span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-[#0f5384]">
											<Eye className="h-3.5 w-3.5" />
											{documentSplit ? "Hide document" : "View document"}
										</span>
									</button>
								) : null}
								<ContractApprovalFlowCanvas workflow={workflow} />
								{workflow.workflowFrozen ? null : (
									<ApprovalWaitingBanner
										workflow={workflow}
										entityLabel="license"
									/>
								)}
								{workflow.workflowFrozen ? null : (
									<ApprovalWorkflowActions
										workflow={workflow}
										busy={busy}
										onClaim={async () => {
											try {
												await claim({ path: pathname || "/licenses" });
												toast({
													title: "Step claimed",
													description: "You are now assigned to this step.",
												});
												router.refresh();
											} catch (err) {
												toast({
													title: "Claim failed",
													description: toUserFacingErrorMessage(
														err,
														"Could not claim this step. Please try again.",
													),
													variant: "destructive",
												});
												throw err;
											}
										}}
										onReassign={async (assigneeUserIds, reason) => {
											try {
												await reassign({
													assigneeUserIds,
													reason,
													path: pathname || "/licenses",
												});
												toast({
													title: "Step reassigned",
													description: "Approval assignees were updated.",
												});
												router.refresh();
											} catch (err) {
												toast({
													title: "Reassign failed",
													description: toUserFacingErrorMessage(
														err,
														"Could not reassign this step. Please try again.",
													),
													variant: "destructive",
												});
												throw err;
											}
										}}
										onResubmit={async () => {
											try {
												await resubmit({ path: pathname || "/licenses" });
												toast({
													title: "Resubmitted",
													description: "Department review restarted.",
												});
												router.refresh();
											} catch (err) {
												toast({
													title: "Resubmit failed",
													description: toUserFacingErrorMessage(
														err,
														"Could not resubmit. Please try again.",
													),
													variant: "destructive",
												});
												throw err;
											}
										}}
									/>
								)}
								<ApprovalWorkflowActivity
									events={historyFromNotifications(workflow.notifications)}
									workflow={workflow}
									entityType="license"
								/>
								<ApprovalDecisionControls
									workflow={workflow}
									notes={notes}
									onNotesChange={setNotes}
									busy={busy}
									onDecide={(decision) => void handleDecision(decision)}
								/>
							</div>
						) : null}
						</div>
						{documentSplitOpen && documentUrl ? (
							<>
								<div className="w-px shrink-0 bg-slate-200" />
								<div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
									<div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2">
										<p className="truncate text-xs font-medium text-slate-600">
											{documentLabel}
										</p>
										<button
											type="button"
											className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
											onClick={() => setDocumentSplit(false)}
											aria-label="Collapse document view"
										>
											<ArrowLeftToLine className="h-4 w-4" />
										</button>
									</div>
									<div className="min-h-0 flex-1 overflow-hidden">
										<WizardPdfPreview
											sessionId={licenseId}
											fileName={documentLabel}
											pdfUrl={documentUrl}
											fileId={licenseId}
											loading={false}
											error={null}
											compact
											fillHeight
										/>
									</div>
								</div>
							</>
						) : null}
					</div>

					<div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
						{!workflow?.canDecideAsAssignee &&
						!workflow?.canAdminOverrideActiveStep ? (
							<p className="flex min-w-0 flex-1 items-start gap-2 text-xs text-slate-500">
								<Info
									className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500"
									aria-hidden
								/>
								<span>
									{workflow?.decisionBlockReason ||
										"Decision buttons appear when you are assigned to the current step."}
								</span>
							</p>
						) : (
							<span className="flex-1" />
						)}
						{canStartEsign ? (
							<Button
								type="button"
								className="primary-btn px-3 sm:px-4"
								onClick={() =>
									router.push(`/esign/prepare/license/${licenseId}`)
								}
							>
								<PenLine className="h-4 w-4" />
								Send for signature
							</Button>
						) : null}
					</div>
				</DialogContent>
			</Dialog>
			<ExpirationAttestationDialog
				open={attestOpen}
				onOpenChange={setAttestOpen}
				entityType="license"
				entityId={licenseId}
				entityName={licenseName || workflow?.contractName || "License"}
				attestationId={workflow?.expirationAttestationId}
				phase="post_expiry"
				onSuccess={() => void refresh()}
			/>
			<LicenseRenewalDialog
				license={
					{
						$id: licenseId,
						$createdAt: "",
						$updatedAt: "",
						licenseName: licenseName || workflow?.contractName || "License",
						licenseNumber: "",
						licenseType: "",
						licenseExpiryDate: new Date().toISOString().split("T")[0],
						issuingAuthority: "",
						issueDate: "",
						status:
							(workflow?.contractStatus as License["status"]) || "expired",
						orgId: "",
					} satisfies License
				}
				open={renewOpen}
				onOpenChange={setRenewOpen}
				onSuccess={() => {
					void refresh();
					router.refresh();
				}}
			/>
		</>
	);
}
