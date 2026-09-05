"use client";

import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";
import { AlertTriangle, Trash2 } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
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
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) onCancel();
				else onOpenChange(true);
			}}
		>
			<DialogContent className="overflow-hidden p-0 shadow-xl sm:max-w-md">
				<VisuallyHiddenPrimitive.Root>
					<DialogTitle>Delete Event</DialogTitle>
				</VisuallyHiddenPrimitive.Root>
				<div className="h-4 w-full bg-[#d6d7d8] opacity-70 " />

				<div className="border-b border-white/40 bg-white/35 px-6 py-4 backdrop-blur-sm">
					<div className="flex items-start gap-3">
						<div className="w-9 h-9 rounded-fullflex items-center justify-center">
							<AlertTriangle className="w-5 h-5 text-[#f0c974]" />
						</div>
						<div>
							<h2 className="text-base font-semibold sidebar-gradient-text">
								Delete Event
							</h2>
							<DialogDescription className="text-sm text-slate-600 mt-1">
								Are you sure you want to delete &quot;{eventTitle}&quot;? This
								action cannot be undone.
							</DialogDescription>
						</div>
					</div>
				</div>

				<div className="px-6 py-5 space-y-3 bg-white">
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
						className="bg-white border-slate-300 focus:border-[#078FAB] focus:ring-1 focus:ring-[#078FAB] focus-visible:ring-1 focus-visible:ring-[#078FAB] focus-visible:ring-offset-0"
					/>
					<p className="text-xs text-slate-500">
						This helps your team understand why the event was removed.
					</p>
				</div>

				<div className="flex items-center justify-between border-t border-white/40 bg-white/35 px-6 py-4 backdrop-blur-sm">
					<div className="text-xs text-slate-500">
						This action is permanent.
					</div>
					<div className="flex items-center gap-3">
						<Button onClick={onConfirm} className="primary-btn px-3 sm:px-4">
							<Trash2 className="w-4 h-4" />
							Delete Event
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
