"use client";

import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Confirms Reject Document before the signer permanently declines the envelope.
 */
export function EsignRejectConfirmDialog({
	open,
	onOpenChange,
	title,
	onConfirm,
	submitting,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	onConfirm: () => void;
	submitting?: boolean;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="flex max-h-[90vh] max-w-[600px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl"
				variant="destructive"
				showCloseButton
			>
				<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
				<div className="sticky top-0 z-10 mt-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 py-4">
					<div className="flex items-center gap-3 px-6">
						<Ban className="h-5 w-5 text-[#0f5384]" aria-hidden />
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							Reject this document?
						</DialogTitle>
					</div>
					<p className="mt-1 ml-14 text-sm text-slate-600">
						This stops signing for everyone on this package
					</p>
				</div>
				<div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-6">
					<div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
						{title}
					</div>
					<p className="text-sm text-slate-600">
						<strong className="font-medium text-slate-700">Reject Document</strong>{" "}
						tells the sender you will not sign. The signing link stops working,
						and the sender must start a new CAALM Execute package if they still
						need a signature.
					</p>
					<p className="text-sm text-slate-600">
						This cannot be undone from your side. If you meant to sign, close
						this dialog and continue with your signature instead.
					</p>
				</div>
				<div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
					<Button
						type="button"
						className="delete-btn cursor-pointer gap-2 px-3 sm:px-4"
						disabled={submitting}
						onClick={onConfirm}
					>
						<Ban className="h-4 w-4 shrink-0" />
						{submitting ? "Rejecting..." : "Reject document"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
