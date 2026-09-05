"use client";

import { SquareArrowRightExit, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useContractsView } from "@/components/ContractsViewContext";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { PERMISSIONS } from "@/constants/permissions";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { deleteFile } from "@/lib/actions/file.actions";
import { refreshStorageUsage } from "@/lib/storage/refreshStorageUsage";
import type { UIFileDoc } from "@/types/files";

interface ContractsBulkBarProps {
	files: UIFileDoc[];
}

export default function ContractsBulkBar({ files }: ContractsBulkBarProps) {
	const path = usePathname();
	const router = useRouter();
	const { toast } = useToast();
	const { selectedIds, clearSelection } = useContractsView();
	const { permissions } = usePermissions();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const canView = permissions.includes(PERMISSIONS.CONTRACTS.VIEW);
	const canDelete =
		permissions.includes(PERMISSIONS.CONTRACTS.EDIT) ||
		permissions.includes(PERMISSIONS.CONTRACTS.APPROVE);

	const selectedFiles = useMemo(
		() => files.filter((f) => selectedIds.includes(f.$id)),
		[files, selectedIds],
	);

	if (selectedIds.length === 0) return null;

	const handleExport = () => {
		if (!canView) return;
		const headers = [
			"Contract Name",
			"Contract Number",
			"Status",
			"Type",
			"Department",
			"Assigned To",
			"Expiry Date",
			"Amount",
			"Vendor",
			"Created Date",
		];
		const rows = selectedFiles.map((file) => [
			file.contractName || file.name || "Untitled",
			file.contractNumber || "",
			file.status || "",
			file.contractType || "",
			file.department || "",
			Array.isArray(file.assignedManagers)
				? file.assignedManagers.join(", ")
				: file.assignedManagers || "",
			file.contractExpiryDate || "",
			file.amount?.toString() || "",
			file.vendor || "",
			file.$createdAt || "",
		]);
		const csvContent = [
			headers.join(","),
			...rows.map((row) =>
				row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
			),
		].join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		link.setAttribute("href", URL.createObjectURL(blob));
		link.setAttribute(
			"download",
			`contracts-selected-${new Date().toISOString().split("T")[0]}.csv`,
		);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const handleBulkDelete = async () => {
		setIsDeleting(true);
		let successCount = 0;
		let failCount = 0;

		for (const file of selectedFiles) {
			try {
				const result = await deleteFile({
					fileId: file.$id,
					bucketFileId: file.bucketFileId || "",
					path,
					contractId: file.contractId || file.$id,
				});
				if (result) {
					successCount += 1;
				} else {
					failCount += 1;
				}
			} catch {
				failCount += 1;
			}
		}

		setIsDeleting(false);
		setConfirmOpen(false);
		clearSelection();
		await refreshStorageUsage(router);

		if (failCount === 0) {
			toast({
				description: `Deleted ${successCount} contract${successCount === 1 ? "" : "s"}.`,
			});
		} else {
			toast({
				variant: "destructive",
				description: `Deleted ${successCount}, failed ${failCount}.`,
			});
		}
	};

	return (
		<>
			<div className="sticky bottom-4 z-20 mx-4 sm:mx-6 mb-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
				<p className="text-sm font-medium text-slate-700">
					{selectedIds.length} selected
				</p>
				<div className="flex items-center gap-2">
					{canView && (
						<Button
							type="button"
							size="sm"
							className="primary-btn px-3 sm:px-4 cursor-pointer"
							onClick={handleExport}
						>
							<SquareArrowRightExit className="h-4 w-4" />
							Export selected
						</Button>
					)}
					{canDelete && (
						<Button
							type="button"
							size="sm"
							className="delete-btn cursor-pointer px-3 sm:px-4"
							onClick={() => setConfirmOpen(true)}
						>
							<Trash2 className="h-4 w-4" />
							Delete selected
						</Button>
					)}
				</div>
			</div>

			<DeleteConfirmationDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title="Delete contracts"
				description="This will permanently remove the contracts below and any linked activity. This action cannot be undone."
				items={selectedFiles.map((file) => ({
					id: file.$id,
					name: file.contractName || file.name || "Untitled",
					subtitle: file.contractNumber
						? `Contract #${file.contractNumber}`
						: undefined,
					status: file.isExpired ? "expired" : file.status,
				}))}
				itemNoun="contract"
				requireConfirmation
				confirmationLabel="I understand this will permanently delete the listed contracts and cannot be undone."
				onConfirm={handleBulkDelete}
				isLoading={isDeleting}
				closeOnConfirm={false}
			/>
		</>
	);
}
