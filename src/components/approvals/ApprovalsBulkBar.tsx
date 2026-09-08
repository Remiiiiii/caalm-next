"use client";

import { CheckCircle2, SquareArrowRightExit, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useApprovalsView } from "@/components/approvals/ApprovalsViewContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { ApprovalQueueItem } from "@/lib/approvals/approvalsListUtils";

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
		const headers = [
			"Title",
			"Type",
			"Status",
			"Department",
			"Assigned",
			"Submitted",
			"Entity",
		];
		const rows = selectedItems.map((item) => [
			item.title,
			item.itemType || "",
			item.status,
			item.department || "",
			item.assignees.join("; "),
			item.submittedAt,
			item.entity,
		]);
		const csv = [
			headers.join(","),
			...rows.map((row) =>
				row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
			),
		].join("\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = `approvals-selected-${new Date().toISOString().split("T")[0]}.csv`;
		link.click();
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
				description:
					err instanceof Error
						? err.message
						: "Some items could not be updated.",
				variant: "destructive",
			});
		} finally {
			setBusy(false);
		}
	};

	return (
		<>
			<div className="sticky bottom-4 z-20 mx-4 sm:mx-6 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
				<p className="text-sm font-medium text-slate-700">
					{selectedIds.length} selected
				</p>
				<div className="flex items-center gap-2 flex-wrap">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="cursor-pointer"
						onClick={clearSelection}
					>
						<X className="h-4 w-4" />
						Clear
					</Button>
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
				</div>
			</div>

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
