"use client";

import { CheckCircle2, SquareArrowRightExit } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useApprovalsView } from "@/components/approvals/ApprovalsViewContext";
import { BulkActionDock } from "@/components/ui/bulk-action-dock";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
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

			<AppDialog
				open={denyOpen}
				onOpenChange={setDenyOpen}
				variant="destructive"
				pending={busy}
				icon={<SquareArrowRightExit className="h-5 w-5" />}
				title="Deny selected"
				description={`A note is required before denying ${selectedIds.length} item${selectedIds.length === 1 ? "" : "s"}.`}
				footer={
					<>
						<Button
							type="button"
							variant="ghost"
							className="rounded-full px-3 py-1.5 h-[1.65rem] justify-center text-slate-400 hover:text-slate-600 hover:bg-black/[.04]"
							disabled={busy}
							autoFocus
							onClick={() => setDenyOpen(false)}
						>
							Cancel
						</Button>
						<Button
							className="delete-btn cursor-pointer px-3 sm:px-4"
							disabled={busy || !denyNotes.trim()}
							onClick={() => bulkSetStatus("inactive")}
						>
							Confirm deny
						</Button>
					</>
				}
			>
				<Textarea
					value={denyNotes}
					onChange={(e) => setDenyNotes(e.target.value)}
					placeholder="Reason for denial"
					className="min-h-[100px] bg-white pb-1"
				/>
			</AppDialog>
		</>
	);
}
