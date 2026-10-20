"use client";

import { CheckCircle2, SquareArrowRightExit } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useApprovalsView } from "@/components/approvals/ApprovalsViewContext";
import { BulkActionDock } from "@/components/ui/bulk-action-dock";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { ApprovalQueueItem } from "@/lib/approvals/approvalsListUtils";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { downloadXlsx } from "@/lib/export/download-xlsx";

interface ApprovalsBulkBarProps {
	items: ApprovalQueueItem[];
	canDecide: boolean;
}

export default function ApprovalsBulkBar({
	items,
	canDecide,
}: ApprovalsBulkBarProps) {
	const { selectedIds, clearSelection } = useApprovalsView();
	const router = useRouter();
	const pathname = usePathname();
	const { toast } = useToast();
	const [denyOpen, setDenyOpen] = useState(false);
	const [denyNotes, setDenyNotes] = useState("");
	const [busy, setBusy] = useState(false);

	const selectedItems = useMemo(
		() => items.filter((i) => selectedIds.includes(i.id)),
		[items, selectedIds],
	);

	if (selectedIds.length === 0) return null;

	const exportSelected = () => {
		const stamp = new Date().toISOString().slice(0, 10);
		downloadXlsx(`approvals-selected-${stamp}.xlsx`, {
			sheetName: "Approvals",
			title: "Approvals — Selected",
			subtitle: `CAALM · ${selectedItems.length} item${selectedItems.length === 1 ? "" : "s"} · Generated ${stamp}`,
			columns: [
				{ header: "Title", width: 40 },
				{ header: "Type", width: 16 },
				{ header: "Status", width: 16 },
				{ header: "Department", width: 20 },
				{ header: "Assigned", width: 28 },
				{ header: "Submitted", type: "date", width: 16 },
				{ header: "Entity", width: 28 },
			],
			rows: selectedItems.map((item) => [
				item.title,
				item.itemType,
				item.status,
				item.department,
				item.assignees.join("; "),
				item.submittedAt,
				item.entity,
			]),
		});
	};

	const decideLicense = async (
		licenseId: string,
		decision: "approved" | "rejected" | "changes_requested",
		notes?: string,
	) => {
		const res = await fetch(
			`/api/licenses/${licenseId}/approval-workflow/decide`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					decision,
					notes,
					path: pathname || "/licenses/approvals",
				}),
			},
		);
		const json = await res.json();
		if (!res.ok || !json.success) {
			throw new Error(json.error || "Failed");
		}
	};

	const decideContract = async (
		contractId: string,
		decision: "approved" | "rejected" | "changes_requested",
		notes?: string,
	) => {
		const res = await fetch(
			`/api/contracts/${contractId}/approval-workflow/decide`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					decision,
					notes,
					path: pathname || "/contracts/approvals",
				}),
			},
		);
		const json = await res.json();
		if (!res.ok || !json.success) {
			throw new Error(json.error || "Failed");
		}
	};

	const bulkSetStatus = async (status: string) => {
		setBusy(true);
		let ok = 0;
		try {
			for (const item of selectedItems) {
				if (
					item.status !== "pending-review" &&
					item.status !== "action-required"
				) {
					continue;
				}
				const decision =
					status === "active"
						? "approved"
						: status === "action-required"
							? "changes_requested"
							: "rejected";
				const notes =
					decision === "approved" ? undefined : denyNotes || "Bulk decision";
				if (item.entity === "contract") {
					await decideContract(item.decisionId, decision, notes);
				} else {
					await decideLicense(item.decisionId, decision, notes);
				}
				ok++;
			}
			toast({
				title: "Bulk update complete",
				description: `Updated ${ok} item${ok === 1 ? "" : "s"}.`,
			});
			router.refresh();
			clearSelection();
			setDenyOpen(false);
			setDenyNotes("");
		} catch (err) {
			toast({
				title: "Error",
				description: toUserFacingErrorMessage(
					err,
					"Some items could not be updated. Please try again.",
				),
				variant: "destructive",
			});
		} finally {
			setBusy(false);
		}
	};

	return (
		<>
			<BulkActionDock
				count={selectedIds.length}
				noun="approval"
				onClear={clearSelection}
			>
				<Button
					type="button"
					size="sm"
					variant="outline"
					className="cursor-pointer"
					onClick={exportSelected}
				>
					<SquareArrowRightExit className="h-4 w-4" />
					Export
				</Button>
				{canDecide && (
					<>
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="cursor-pointer text-red border-red/20"
							disabled={busy}
							onClick={() => setDenyOpen(true)}
						>
							Deny
						</Button>
						<Button
							type="button"
							size="sm"
							className="primary-btn px-3 sm:px-4 cursor-pointer"
							disabled={busy}
							onClick={() => bulkSetStatus("active")}
						>
							<CheckCircle2 className="h-4 w-4" />
							Approve selected
						</Button>
					</>
				)}
			</BulkActionDock>

			<Dialog open={denyOpen} onOpenChange={setDenyOpen}>
				<DialogContent className="w-[calc(100%-1.5rem)] sm:w-full max-w-[480px] p-0 overflow-hidden border border-slate-200 shadow-xl">
					<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
					<div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4 px-6">
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							Deny selected
						</DialogTitle>
						<p className="text-sm text-slate-600 mt-1">
							A note is required before denying {selectedIds.length} item
							{selectedIds.length === 1 ? "" : "s"}.
						</p>
					</div>
					<div className="p-6 bg-slate-50">
						<Textarea
							value={denyNotes}
							onChange={(e) => setDenyNotes(e.target.value)}
							placeholder="Reason for denial"
							className="bg-white min-h-[100px]"
						/>
					</div>
					<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
						<Button
							className="primary-btn px-3 sm:px-4 cursor-pointer"
							disabled={busy || !denyNotes.trim()}
							onClick={() => bulkSetStatus("inactive")}
						>
							Confirm deny
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
