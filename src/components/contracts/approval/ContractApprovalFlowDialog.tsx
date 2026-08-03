"use client";

import {
	Ban,
	CheckCircle2,
	GitBranch,
	Loader2,
	RefreshCw,
	XCircle,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import ContractApprovalFlowCanvas from "@/components/contracts/approval/ContractApprovalFlowCanvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useContractApprovalWorkflow } from "@/hooks/useContractApprovalWorkflow";
import type { ApprovalDecision } from "@/lib/approvals/contractApprovalWorkflow.types";
import { cn } from "@/lib/utils";

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
	const { workflow, isLoading, error, decide, refresh } =
		useContractApprovalWorkflow(open ? contractId : null);
	const { toast } = useToast();
	const router = useRouter();
	const pathname = usePathname();
	const [notes, setNotes] = useState("");
	const [busy, setBusy] = useState(false);

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
							<div className="flex flex-wrap items-center gap-2">
								<Badge
									variant="outline"
									className="bg-white text-xs text-slate-700"
								>
									Status: {workflow.contractStatus}
								</Badge>
								{workflow.department ? (
									<Badge
										variant="outline"
										className="bg-white text-xs text-slate-600"
									>
										{workflow.department}
										{workflow.subDepartment
											? ` · ${workflow.subDepartment}`
											: ""}
									</Badge>
								) : null}
							</div>
							<ContractApprovalFlowCanvas workflow={workflow} />
							{(workflow.canDecide || workflow.canOverride) && (
								<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
									<p className="mb-2 text-sm font-medium text-slate-800">
										{workflow.canDecide
											? "Your decision on the current step"
											: "Admin override"}
									</p>
									<Textarea
										value={notes}
										onChange={(e) => setNotes(e.target.value)}
										placeholder="Notes (required for reject / request changes)"
										className="mb-3 min-h-[72px] bg-white"
									/>
									<div className="flex flex-wrap gap-2">
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
										<Button
											type="button"
											variant="outline"
											className="primary-btn px-3 sm:px-4"
											disabled={busy}
											onClick={() => void handleDecision("changes_requested")}
										>
											Request changes
										</Button>
										<Button
											type="button"
											variant="outline"
											className={cn(
												"primary-btn px-3 sm:px-4 text-red border-red/30",
											)}
											disabled={busy}
											onClick={() => void handleDecision("rejected")}
										>
											<XCircle className="h-4 w-4" />
											Reject
										</Button>
									</div>
								</div>
							)}
						</div>
					) : null}
				</div>

				<div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
					<Button
						type="button"
						variant="outline"
						className="primary-btn px-3 sm:px-4"
						onClick={() => onOpenChange(false)}
						disabled={busy}
					>
						<Ban className="h-4 w-4" />
						Close
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
