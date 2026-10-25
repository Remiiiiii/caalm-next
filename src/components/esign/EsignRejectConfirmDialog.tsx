"use client";

import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/app-dialog";

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
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			variant="destructive"
			pending={submitting}
			icon={<Ban className="h-5 w-5" aria-hidden />}
			title="Reject this document?"
			description="This stops signing for everyone on this package"
			footer={
				<>
					<Button
						type="button"
						variant="ghost"
						className="rounded-full px-3 py-1.5 h-[1.65rem] justify-center text-slate-400 hover:text-slate-600 hover:bg-black/[.04]"
						disabled={submitting}
						autoFocus
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						className="delete-btn cursor-pointer gap-2"
						disabled={submitting}
						onClick={onConfirm}
					>
						<Ban className="h-4 w-4 shrink-0" />
						{submitting ? "Rejecting…" : "Reject document"}
					</Button>
				</>
			}
		>
			<div className="flex flex-col gap-3 pb-1">
				<div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
					<div className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
						<span className="text-slate-500">Document</span>
						<span className="text-right font-medium text-slate-700">
							{title}
						</span>
					</div>
				</div>
				<p className="text-sm text-slate-500">
					<strong className="font-medium text-slate-700">Reject Document</strong>{" "}
					tells the sender you will not sign. The signing link stops working, and
					the sender must start a new CAALM Execute package if they still need a
					signature.
				</p>
				<p className="text-sm text-slate-500">
					This cannot be undone from your side. If you meant to sign, close this
					dialog and continue with your signature instead.
				</p>
			</div>
		</AppDialog>
	);
}
