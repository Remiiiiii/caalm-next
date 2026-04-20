"use client";

import { AlertTriangle, Ban } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface DeleteConfirmationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	itemName: string;
	onConfirm: () => void;
	onCancel?: () => void;
	isLoading?: boolean;
}

export const DeleteConfirmationDialog: React.FC<
	DeleteConfirmationDialogProps
> = ({
	open,
	onOpenChange,
	title,
	description,
	itemName,
	onConfirm,
	onCancel,
	isLoading = false,
}) => {
	const handleCancel = () => {
		onCancel?.();
		onOpenChange(false);
	};

	const handleConfirm = () => {
		onConfirm();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[90vh] max-w-[600px] flex-col overflow-hidden p-0 shadow-xl">
				{/* Professional Cap */}
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

				{/* Header with gradient background */}
				<div className="glass-dialog-wizard-header mt-4">
					<div className="flex items-center gap-3 px-6">
						<div className="flex items-center gap-3">
							<AlertTriangle className="w-5 h-5 text-[#0f5384]" />
							<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
								{title}
							</DialogTitle>
						</div>
					</div>
					{description && (
						<p className="text-sm text-slate-600 mt-1 ml-14">{description}</p>
					)}
				</div>

				{/* Scrollable Content */}
				<div className="flex-1 overflow-y-auto p-6 bg-slate-50">
					<p className="text-sm text-slate-700">
						Are you sure you want to delete{" "}
						<span className="font-medium text-slate-900">"{itemName}"</span>?
						This action cannot be undone.
					</p>
				</div>

				{/* Professional Footer */}
				<div className="glass-dialog-alert-footer">
					<div className="text-xs text-slate-500"></div>
					<div className="flex items-center gap-3">
						<Button
							variant="outline"
							onClick={handleCancel}
							disabled={isLoading}
							className="primary-btn px-3 sm:px-4"
						>
							<Ban className="w-4 h-4 mr-2" />
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleConfirm}
							disabled={isLoading}
							className="px-3 sm:px-4"
						>
							{isLoading ? "Deleting..." : "Delete"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
