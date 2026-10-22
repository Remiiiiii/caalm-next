"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BulkActionDock } from "@/components/ui/bulk-action-dock";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useStepUp } from "@/contexts/StepUpContext";
import { useToast } from "@/hooks/use-toast";
import { deleteFile } from "@/lib/actions/file.actions";
import { refreshStorageUsage } from "@/lib/storage/refreshStorageUsage";
import type { UIFileDoc } from "@/types/files";

interface FilesBulkBarProps {
	files: UIFileDoc[];
	selectedIds: string[];
	onClearSelection: () => void;
}

export default function FilesBulkBar({
	files,
	selectedIds,
	onClearSelection,
}: FilesBulkBarProps) {
	const path = usePathname() || "";
	const router = useRouter();
	const { toast } = useToast();
	const { ensureStepUp } = useStepUp();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const selectedFiles = useMemo(
		() => files.filter((f) => selectedIds.includes(f.$id)),
		[files, selectedIds],
	);

	if (selectedIds.length === 0) return null;

	const handleBulkDelete = async () => {
		// Deleting linked contracts requires OTP step-up (same as contracts list).
		if (
			selectedFiles.some((file) => Boolean(file.contractId)) &&
			!(await ensureStepUp())
		) {
			return;
		}

		setIsDeleting(true);
		let successCount = 0;
		let failCount = 0;

		for (const file of selectedFiles) {
			try {
				const result = await deleteFile({
					fileId: file.$id,
					bucketFileId: file.bucketFileId || "",
					path,
					contractId: file.contractId,
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
		onClearSelection();
		await refreshStorageUsage(router);

		if (failCount === 0) {
			toast({
				description: `Deleted ${successCount} file${successCount === 1 ? "" : "s"}.`,
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
				noun="file"
				onClear={onClearSelection}
			>
				<Button
					type="button"
					size="sm"
					className="delete-btn cursor-pointer px-3 sm:px-4"
					onClick={() => setConfirmOpen(true)}
				>
					<Trash2 className="h-4 w-4" />
					Delete selected
				</Button>
			</BulkActionDock>

			<ConfirmDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				variant="destructive"
				icon={<AlertTriangle className="h-5 w-5" />}
				title="Delete Files"
				description={`Are you sure you want to delete ${selectedIds.length} selected file${selectedIds.length === 1 ? "" : "s"}? This action cannot be undone.`}
				helperText="This will permanently remove the selected files from the system."
				note="This action is permanent."
				confirmLabel="Delete Files"
				confirmIcon={<Trash2 className="h-4 w-4" />}
				pendingLabel="Deleting…"
				onConfirm={handleBulkDelete}
			/>
		</>
	);
}
