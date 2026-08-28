"use client";

import {
	AlertTriangle,
	CheckCircle2,
	ExternalLink,
	FileText,
	Loader2,
	Users,
	X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { agingLabel } from "@/components/approvals/ApprovalsAttentionStrip";
import { useApprovalsView } from "@/components/approvals/ApprovalsViewContext";
import ApprovalWorkflowActions from "@/components/contracts/approval/ApprovalWorkflowActions";
import ContractApprovalFlowCanvas from "@/components/contracts/approval/ContractApprovalFlowCanvas";
import DocumentViewer from "@/components/DocumentViewer";
import FormattedDateTime from "@/components/FormattedDateTime";
import EntityPreviewSheetShell from "@/components/preview/EntityPreviewSheetShell";
import {
	previewSectionClass,
	previewSectionHeaderClass,
} from "@/components/preview/previewSheetParts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PERMISSIONS } from "@/constants/permissions";
import { useToast } from "@/hooks/use-toast";
import { useContractApprovalWorkflow } from "@/hooks/useContractApprovalWorkflow";
import { useLicenseApprovalWorkflow } from "@/hooks/useLicenseApprovalWorkflow";
import { usePermissions } from "@/hooks/usePermissions";
import {
	type ApprovalQueueItem,
	statusBadgeClasses,
	statusLabel,
} from "@/lib/approvals/approvalsListUtils";
import { cn, constructFileUrl } from "@/lib/utils";

interface ApprovalDecideSheetProps {
	item: ApprovalQueueItem | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	canDecide: boolean;
}

type Decision = "approved" | "rejected" | "changes_requested";

export default function ApprovalDecideSheet({
	item,
	open,
	onOpenChange,
	canDecide,
}: ApprovalDecideSheetProps) {
	const { permissions } = usePermissions();
	const router = useRouter();
	const pathname = usePathname();
	const { toast } = useToast();
	const { setPreviewItem } = useApprovalsView();
	const contractIdForWorkflow =
		open && item?.entity === "contract" ? item.decisionId : null;
	const licenseIdForWorkflow =
		open && item?.entity === "license" ? item.decisionId : null;
	const {
		workflow: contractWorkflow,
		decide: decideContractWorkflow,
		reassign: reassignContractWorkflow,
		resubmit: resubmitContractWorkflow,
		isLoading: contractWorkflowLoading,
	} = useContractApprovalWorkflow(contractIdForWorkflow);
	const {
		workflow: licenseWorkflow,
		decide: decideLicenseWorkflow,
		reassign: reassignLicenseWorkflow,
		resubmit: resubmitLicenseWorkflow,
		isLoading: licenseWorkflowLoading,
	} = useLicenseApprovalWorkflow(licenseIdForWorkflow);
	const workflow =
		item?.entity === "contract" ? contractWorkflow : licenseWorkflow;
	const decideWorkflow =
		item?.entity === "contract"
			? decideContractWorkflow
			: decideLicenseWorkflow;
	const reassignWorkflow =
		item?.entity === "contract"
			? reassignContractWorkflow
			: reassignLicenseWorkflow;
	const resubmitWorkflow =
		item?.entity === "contract"
			? resubmitContractWorkflow
			: resubmitLicenseWorkflow;
	const workflowLoading =
		item?.entity === "contract"
			? contractWorkflowLoading
			: licenseWorkflowLoading;
	const [notes, setNotes] = useState("");
	const [busy, setBusy] = useState(false);
	const [viewerOpen, setViewerOpen] = useState(false);

	if (!item) return null;

	const canReview =
		item.entity === "contract"
			? permissions.includes(PERMISSIONS.CONTRACTS.REVIEW) || canDecide
			: canDecide;

	const docUrl =
		item.bucketFileId && item.entity === "contract"
			? constructFileUrl(item.bucketFileId)
			: item.documentUrl;

	const handleDecision = async (decision: Decision) => {
		if (!canDecide && !(workflow?.canDecide || workflow?.canOverride)) return;
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
			await decideWorkflow({
				decision,
				notes,
				path:
					pathname ||
					(item.entity === "contract"
						? "/contracts/approvals"
						: "/licenses/approvals"),
			});
			toast({
				title:
					decision === "approved"
						? "Step approved"
						: decision === "changes_requested"
							? "Changes requested"
							: "Rejected",
				description: "Approval workflow updated.",
			});
			router.refresh();
			if (notes.trim()) {
				toast({
					title: "Decision recorded",
					description: `Notes: ${notes.trim().slice(0, 80)}${notes.trim().length > 80 ? "…" : ""}`,
				});
			}
			setNotes("");
			setPreviewItem(null);
			onOpenChange(false);
		} catch (err) {
			toast({
				title: "Error",
				description:
					err instanceof Error ? err.message : "Could not complete decision.",
				variant: "destructive",
			});
		} finally {
			setBusy(false);
		}
	};

	const isPending =
		item.status === "pending-review" || item.status === "action-required";

	const canActOnWorkflow =
		!!(workflow?.canDecide || workflow?.canOverride || canDecide) && isPending;

	return (
		<>
			<EntityPreviewSheetShell
				open={open}
				onOpenChange={onOpenChange}
				title={item.title}
				description={
					item.subtitle ||
					(item.entity === "contract" ? "Contract review" : "License review")
				}
				icon={FileText}
				statusBanner={
					<div className="flex flex-wrap items-center justify-center gap-2 border-b border-white/45 px-5 py-2.5">
						<Badge
							variant="outline"
							className={cn(
								"border capitalize",
								statusBadgeClasses(item.status),
							)}
						>
							{statusLabel(item.status)}
						</Badge>
						<Badge
							variant="outline"
							className="border border-white/50 bg-white/60 text-slate-600"
						>
							Waiting {agingLabel(item)}
						</Badge>
					</div>
				}
				footer={
					<div className="flex w-full flex-col gap-3">
						{(canReview &&
							docUrl &&
							item.entity === "contract" &&
							item.bucketFileId) ||
						docUrl ? (
							<div className="flex flex-wrap items-center gap-2">
								{canReview &&
									docUrl &&
									item.entity === "contract" &&
									item.bucketFileId && (
										<Button
											type="button"
											variant="outline"
											className="primary-btn cursor-pointer px-3 sm:px-4"
											onClick={() => setViewerOpen(true)}
										>
											<FileText className="h-4 w-4" />
											Open document
										</Button>
									)}
								{docUrl ? (
									<Button
										asChild
										variant="outline"
										className="primary-btn cursor-pointer px-3 sm:px-4"
									>
										<a href={docUrl} target="_blank" rel="noopener noreferrer">
											<ExternalLink className="h-4 w-4" />
											Open link
										</a>
									</Button>
								) : null}
							</div>
						) : null}

						{canActOnWorkflow ? (
							<div className="flex flex-wrap items-center justify-between gap-2">
								<Button
									type="button"
									variant="outline"
									className="cursor-pointer text-red border-red/20 hover:bg-red/10"
									disabled={busy}
									onClick={() => handleDecision("rejected")}
								>
									{busy ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<X className="h-4 w-4" />
									)}
									Deny
								</Button>
								<div className="flex flex-wrap items-center gap-2">
									<Button
										type="button"
										variant="outline"
										className="primary-btn cursor-pointer px-3 sm:px-4"
										disabled={busy}
										onClick={() => handleDecision("changes_requested")}
									>
										Request changes
									</Button>
									<Button
										type="button"
										className="primary-btn cursor-pointer px-3 sm:px-4"
										disabled={busy}
										onClick={() => handleDecision("approved")}
									>
										{busy ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<CheckCircle2 className="h-4 w-4" />
										)}
										Approve
									</Button>
								</div>
							</div>
						) : (
							<div className="flex justify-end">
								<Button
									variant="outline"
									className="primary-btn cursor-pointer px-3 sm:px-4"
									onClick={() => onOpenChange(false)}
								>
									<X className="h-4 w-4" />
									Close
								</Button>
							</div>
						)}
					</div>
				}
			>
				{(item.entity === "contract" || item.entity === "license") && (
					<section className={cn(previewSectionClass, "overflow-hidden p-0")}>
						<div className={previewSectionHeaderClass}>
							<p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
								Approval workflow
							</p>
						</div>
						<div className="p-3">
							{workflowLoading ? (
								<div className="flex h-24 items-center justify-center text-xs text-slate-500">
									<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
									Loading workflow…
								</div>
							) : workflow ? (
								<div className="space-y-3">
									<div className="overflow-x-auto">
										<ContractApprovalFlowCanvas workflow={workflow} />
									</div>
									<ApprovalWorkflowActions
										workflow={workflow}
										busy={busy}
										onReassign={async (assigneeUserIds) => {
											await reassignWorkflow({
												assigneeUserIds,
												path:
													pathname ||
													(item.entity === "contract"
														? "/contracts/approvals"
														: "/licenses/approvals"),
											});
											toast({
												title: "Step reassigned",
												description: "Approval assignees were updated.",
											});
											router.refresh();
										}}
										onResubmit={async () => {
											await resubmitWorkflow({
												path:
													pathname ||
													(item.entity === "contract"
														? "/contracts/approvals"
														: "/licenses/approvals"),
											});
											toast({
												title: "Resubmitted",
												description: "Department review restarted.",
											});
											router.refresh();
										}}
									/>
								</div>
							) : (
								<p className="text-xs text-slate-500">Workflow unavailable</p>
							)}
						</div>
					</section>
				)}

				<section className={cn(previewSectionClass, "space-y-3 p-4")}>
					<div className="flex items-start gap-3">
						<Users className="mt-0.5 h-4 w-4 shrink-0 text-[#0f5384]" />
						<div className="min-w-0">
							<p className="text-xs text-slate-500">Department / Assignees</p>
							<p className="text-sm text-slate-700">
								{item.department || "—"}
								{item.assignees.length > 0
									? ` · ${item.assignees.join(", ")}`
									: ""}
							</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0f5384]" />
						<div className="min-w-0">
							<p className="text-xs text-slate-500">Type</p>
							<p className="text-sm text-slate-700">{item.itemType || "—"}</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#0f5384]" />
						<div className="min-w-0">
							<p className="text-xs text-slate-500">Submitted</p>
							<p className="text-sm text-slate-700">
								<FormattedDateTime date={item.submittedAt} className="body-2" />
							</p>
						</div>
					</div>
					{item.vendor ? (
						<div>
							<p className="text-xs text-slate-500">Vendor</p>
							<p className="text-sm text-slate-700">{item.vendor}</p>
						</div>
					) : null}
					{typeof item.amount === "number" && item.amount > 0 ? (
						<div>
							<p className="text-xs text-slate-500">Amount</p>
							<p className="text-sm text-slate-700">
								$
								{new Intl.NumberFormat("en-US", {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								}).format(item.amount)}
							</p>
						</div>
					) : null}
				</section>

				{canActOnWorkflow ? (
					<div className="space-y-2">
						<label
							htmlFor="approval-notes"
							className="text-sm font-medium text-slate-700"
						>
							Decision notes
						</label>
						<Textarea
							id="approval-notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Required for deny or request changes"
							className="min-h-[88px] border-[0.25px] border-slate-300 bg-white shadow-none focus-visible:border-[#078FAB]"
						/>
					</div>
				) : null}
			</EntityPreviewSheetShell>

			{item.entity === "contract" && item.bucketFileId && (
				<DocumentViewer
					isOpen={viewerOpen}
					onClose={() => setViewerOpen(false)}
					file={{
						id: item.id,
						name: item.title,
						type: item.fileExtension || "pdf",
						size: String(item.fileSize ?? "Unknown"),
						url: constructFileUrl(item.bucketFileId),
						createdAt: item.submittedAt,
						createdBy: item.ownerLabel || "Unknown",
					}}
				/>
			)}
		</>
	);
}
