/**
 * Cancel confirmation dialog
 */

"use client";

import { Ban } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface CancelDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}

export default function CancelDialog({
	open,
	onOpenChange,
	onConfirm,
}: CancelDialogProps) {
	return (
		<ConfirmDialog
			open={open}
			onOpenChange={onOpenChange}
			variant="destructive"
			icon={<Ban className="h-5 w-5" />}
			title="Cancel form?"
			description="Your progress will not be saved."
			note="If you cancel, the form will not be saved and all progress will be lost. You can save your progress using the “Save Progress” button before canceling."
			confirmLabel="Cancel & Discard"
			cancelLabel="Continue editing"
			onConfirm={async () => {
				onConfirm();
			}}
		/>
	);
}
