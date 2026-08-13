"use client";

import { AlertTriangle, Ban, Trash2, X } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
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
	const path = usePathname();
	const router = useRouter();
	const { toast } = useToast();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const selectedFiles = useMemo(
		() => files.filter((f) => selectedIds.includes(f.$id)),
		[files, selectedIds],
	);

	if (selectedIds.length === 0) return null;

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
			<div className="mb-4 mt-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
				<p className="text-sm font-medium text-slate-700">
					{selectedIds.length} selected
				</p>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="cursor-pointer"
						onClick={onClearSelection}
					>
						<X className="h-4 w-4" />
						Clear
					</Button>
					<Button
						type="button"
						size="sm"
						className="primary-btn cursor-pointer px-3 sm:px-4"
						onClick={() => setConfirmOpen(true)}
					>
						<Trash2 className="h-4 w-4" />
						Delete selected
					</Button>
				</div>
			</div>

			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent className="gap-0 overflow-hidden border border-slate-200 p-0 shadow-xl sm:max-w-md">
					<DialogTitle className="sr-only">Delete Files</DialogTitle>
					<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />

					<div className="mt-4 border-b border-slate-200 bg-white px-6 py-4">
						<div className="flex items-center gap-2">
							<AlertTriangle className="h-5 w-5 shrink-0 text-[#f7d333]" />
							<h2 className="text-base font-semibold sidebar-gradient-text">
								Delete Files
							</h2>
						</div>
						<DialogDescription className="mt-1 ml-7 text-sm text-slate-600">
							Are you sure you want to delete {selectedIds.length} selected file
							{selectedIds.length === 1 ? "" : "s"}? This action cannot be
							undone.
						</DialogDescription>
					</div>

					<div className="space-y-3 bg-white px-6 py-5">
						<p className="text-sm text-slate-600">
							This will permanently remove the selected files from the system.
						</p>
						<p className="text-xs font-medium text-slate-500">
							This action is permanent.
						</p>
					</div>

					<div className="flex items-center justify-center gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
						<Button
							type="button"
							variant="ghost"
							onClick={() => setConfirmOpen(false)}
							disabled={isDeleting}
							className="primary-btn gap-2 px-3 sm:px-4"
						>
							<Ban className="h-4 w-4 shrink-0" />
							Cancel
						</Button>
						<Button
							type="button"
							onClick={handleBulkDelete}
							disabled={isDeleting}
							className="primary-btn gap-2 px-3 sm:px-4"
						>
							<Trash2 className="h-4 w-4 shrink-0" />
							{isDeleting ? "Deleting..." : "Delete Files"}
							{isDeleting && (
								<Image
									src="/assets/icons/loader.svg"
									alt="loader"
									width={16}
									height={16}
									className="ml-2 animate-spin"
								/>
							)}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
