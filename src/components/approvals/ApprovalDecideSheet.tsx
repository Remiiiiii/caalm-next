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
import ContractApprovalFlowCanvas from "@/components/contracts/approval/ContractApprovalFlowCanvas";
import DocumentViewer from "@/components/DocumentViewer";
import FormattedDateTime from "@/components/FormattedDateTime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { PERMISSIONS } from "@/constants/permissions";
import { useToast } from "@/hooks/use-toast";
import { useContractApprovalWorkflow } from "@/hooks/useContractApprovalWorkflow";
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
	const {
		workflow,
		decide: decideWorkflow,
		isLoading: workflowLoading,
	} = useContractApprovalWorkflow(contractIdForWorkflow);
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

	const decideLicense = async (status: string) => {
		const res = await fetch(`/api/licenses/${item.decisionId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status }),
		});
		if (!res.ok) throw new Error("Failed to update license");
	};

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

		const nextStatus =
			decision === "approved"
				? "active"
				: decision === "changes_requested"
					? "action-required"
					: "inactive";

		setBusy(true);
		try {
			if (item.entity === "contract") {
				await decideWorkflow({
					decision,
					notes,
					path: pathname || "/contracts/approvals",
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
			} else {
				await decideLicense(nextStatus);
				toast({
					title: "Status Updated",
					description: `License status changed to "${nextStatus}"`,
				});
				router.refresh();
			}
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
		item.entity === "contract"
			? !!(workflow?.canDecide || workflow?.canOverride) && isPending
			: canDecide && isPending;

	return (
		<>
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-md p-0 flex flex-col border-l border-slate-200"
				>
					<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70" />
					<SheetHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4 px-6 text-left space-y-1">
						<div className="flex items-center gap-3">
							<FileText className="w-5 h-5 text-[#0f5384]" />
							<SheetTitle className="text-xl font-semibold sidebar-gradient-text truncate pr-6">
								{item.title}
							</SheetTitle>
						</div>
						<SheetDescription className="text-sm text-slate-600 ml-8">
							{item.subtitle ||
								(item.entity === "contract"
									? "Contract review"
									: "License review")}
						</SheetDescription>
					</SheetHeader>

					<div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4">
						<div className="flex flex-wrap items-center gap-2">
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
								className="border border-slate-200 bg-white text-slate-600"
							>
								Waiting {agingLabel(item)}
							</Badge>
						</div>

						{item.entity === "contract" && (
							<div className="-mx-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-3">
								<p className="mb-2 px-1 text-xs font-medium text-slate-600">
									Approval workflow
								</p>
								{workflowLoading ? (
									<div className="flex h-24 items-center justify-center text-xs text-slate-500">
										<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
										Loading workflow…
									</div>
								) : workflow ? (
									<div className="overflow-x-auto">
										<ContractApprovalFlowCanvas workflow={workflow} />
									</div>
								) : (
									<p className="px-1 text-xs text-slate-500">
										Workflow unavailable
									</p>
								)}
							</div>
						)}

						<div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
							<div className="flex items-start gap-3">
								<Users className="h-4 w-4 text-[#0f5384] mt-0.5 shrink-0" />
								<div className="min-w-0">
									<p className="text-xs text-slate-500">
										Department / Assignees
									</p>
									<p className="text-sm text-slate-900">
										{item.department || "—"}
										{item.assignees.length > 0
											? ` · ${item.assignees.join(", ")}`
											: ""}
									</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<CheckCircle2 className="h-4 w-4 text-[#0f5384] mt-0.5 shrink-0" />
								<div className="min-w-0">
									<p className="text-xs text-slate-500">Type</p>
									<p className="text-sm text-slate-900">
										{item.itemType || "—"}
									</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<AlertTriangle className="h-4 w-4 text-[#0f5384] mt-0.5 shrink-0" />
								<div className="min-w-0">
									<p className="text-xs text-slate-500">Submitted</p>
									<p className="text-sm text-slate-900">
										<FormattedDateTime
											date={item.submittedAt}
											className="body-2"
										/>
									</p>
								</div>
							</div>
							{item.vendor && (
								<div>
									<p className="text-xs text-slate-500">Vendor</p>
									<p className="text-sm text-slate-900">{item.vendor}</p>
								</div>
							)}
							{typeof item.amount === "number" && item.amount > 0 && (
								<div>
									<p className="text-xs text-slate-500">Amount</p>
									<p className="text-sm text-slate-900">
										$
										{new Intl.NumberFormat("en-US", {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										}).format(item.amount)}
									</p>
								</div>
							)}
						</div>

						{canActOnWorkflow && (
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
									className="bg-white min-h-[88px]"
								/>
							</div>
						)}
					</div>

					<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 space-y-3">
						<div className="flex items-center gap-2 flex-wrap">
							{canReview &&
								docUrl &&
								item.entity === "contract" &&
								item.bucketFileId && (
									<Button
										type="button"
										variant="outline"
										className="primary-btn px-3 sm:px-4 cursor-pointer"
										onClick={() => setViewerOpen(true)}
									>
										<FileText className="h-4 w-4" />
										Open document
									</Button>
								)}
							{docUrl && (
								<Button asChild variant="outline" className="cursor-pointer">
									<a href={docUrl} target="_blank" rel="noopener noreferrer">
										<ExternalLink className="h-4 w-4" />
										Open link
									</a>
								</Button>
							)}
						</div>

						{canActOnWorkflow ? (
							<div className="flex items-center justify-between gap-2 flex-wrap">
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
								<div className="flex items-center gap-2">
									<Button
										type="button"
										variant="outline"
										className="cursor-pointer"
										disabled={busy}
										onClick={() => handleDecision("changes_requested")}
									>
										Request changes
									</Button>
									<Button
										type="button"
										className="primary-btn px-3 sm:px-4 cursor-pointer"
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
									className="primary-btn px-3 sm:px-4 cursor-pointer"
									onClick={() => onOpenChange(false)}
								>
									Close
								</Button>
							</div>
						)}
					</div>
				</SheetContent>
			</Sheet>

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
