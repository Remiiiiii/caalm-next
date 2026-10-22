"use client";

import { SquareArrowRightExit, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useContractsView } from "@/components/ContractsViewContext";
import { BulkActionDock } from "@/components/ui/bulk-action-dock";
import { BusyIcon } from "@/components/ui/busy-icon";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { PERMISSIONS } from "@/constants/permissions";
import { useStepUp } from "@/contexts/StepUpContext";
import { useToast } from "@/hooks/use-toast";
import { useBusyAction } from "@/hooks/useBusyAction";
import { usePermissions } from "@/hooks/usePermissions";
import { deleteFile } from "@/lib/actions/file.actions";
import { downloadXlsx } from "@/lib/export/download-xlsx";
import { refreshStorageUsage } from "@/lib/storage/refreshStorageUsage";
import type { UIFileDoc } from "@/types/files";

interface ContractsBulkBarProps {
	files: UIFileDoc[];
}

export default function ContractsBulkBar({ files }: ContractsBulkBarProps) {
	const path = usePathname() || "";
	const router = useRouter();
	const { toast } = useToast();
	const { selectedIds, clearSelection } = useContractsView();
	const { permissions } = usePermissions();
	const { ensureStepUp } = useStepUp();
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

	const [runExporting, exporting] = useBusyAction(() => handleExport());

	if (selectedIds.length === 0) return null;

	const handleExport = () => {
		if (!canView) return;
		const stamp = new Date().toISOString().slice(0, 10);
		downloadXlsx(`contracts-selected-${stamp}.xlsx`, {
			sheetName: "Contracts",
			title: "Contracts — Selected",
			subtitle: `CAALM · ${selectedFiles.length} contract${selectedFiles.length === 1 ? "" : "s"} · Generated ${stamp}`,
			columns: [
				{ header: "Contract Name", width: 40 },
				{ header: "Contract Number", width: 18 },
				{ header: "Status", width: 16 },
				{ header: "Type", width: 18 },
				{ header: "Department", width: 20 },
				{ header: "Assigned To", width: 26 },
				{ header: "Expiry Date", type: "date", width: 16 },
				{ header: "Amount", type: "currency", width: 16 },
				{ header: "Vendor", width: 24 },
				{ header: "Created Date", type: "date", width: 16 },
			],
			rows: selectedFiles.map((file) => [
				file.contractName || file.name || "Untitled",
				file.contractNumber,
				file.status,
				file.contractType,
				file.department,
				Array.isArray(file.assignedManagers)
					? file.assignedManagers.join(", ")
					: file.assignedManagers,
				file.contractExpiryDate,
				file.amount == null ? null : Number(file.amount),
				file.vendor,
				file.$createdAt,
			]),
		});
	};

	const handleBulkDelete = async () => {
		if (!(await ensureStepUp())) return;

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
			<BulkActionDock
				count={selectedIds.length}
				noun="contract"
				onClear={clearSelection}
			>
				{canView && (
					<Button
						type="button"
						size="sm"
						className="primary-btn px-3 sm:px-4 cursor-pointer"
						disabled={exporting}
						onClick={() => void runExporting()}
					>
						<BusyIcon busy={exporting} icon={SquareArrowRightExit} />
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
			</BulkActionDock>

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
