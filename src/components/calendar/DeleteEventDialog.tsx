"use client";

import { AlertTriangle } from "lucide-react";
import type React from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface DeleteEventDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	eventTitle?: string;
	deleteReason: string;
	onDeleteReasonChange: (value: string) => void;
	onCancel: () => void;
	onConfirm: () => void;
}

export function DeleteEventDialog({
	open,
	onOpenChange,
	eventTitle,
	deleteReason,
	onDeleteReasonChange,
	onCancel,
	onConfirm,
}: DeleteEventDialogProps): React.ReactElement {
	return (
		<AppDialog
			open={open}
			onOpenChange={(next) => {
				if (!next) onCancel();
				else onOpenChange(true);
			}}
			variant="destructive"
			icon={<AlertTriangle className="h-5 w-5" />}
			title="Delete event"
			description={`Are you sure you want to delete “${eventTitle}”? This action cannot be undone.`}
			footer={
				<>
					<Button
						type="button"
						variant="ghost"
						className="rounded-full px-3 py-1.5 h-[1.65rem] justify-center text-slate-400 hover:text-slate-600 hover:bg-black/[.04]"
						autoFocus
						onClick={onCancel}
					>
						Cancel
					</Button>
					<Button
						type="button"
						className="delete-btn"
						onClick={onConfirm}
					>
						Delete event
					</Button>
				</>
			}
		>
			<div className="flex flex-col gap-3 pb-1">
				<div className="space-y-2">
					<Label
						htmlFor="deleteReason"
						className="text-sm font-medium text-slate-700"
					>
						Reason for deletion (optional)
					</Label>
					<Textarea
						id="deleteReason"
						placeholder="Please provide a reason for deleting this event..."
						value={deleteReason}
						onChange={(e) => onDeleteReasonChange(e.target.value)}
						rows={4}
						className="border-slate-300 bg-white focus:border-[#078FAB] focus:ring-1 focus:ring-[#078FAB] focus-visible:ring-1 focus-visible:ring-[#078FAB] focus-visible:ring-offset-0"
					/>
				</div>
				<p className="text-sm text-slate-500">
					This helps your team understand why the event was removed.
				</p>
			</div>
		</AppDialog>
	);
}
