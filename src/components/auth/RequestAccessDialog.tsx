"use client";

import { DoorClosedLocked, ThumbsUp } from "lucide-react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";

export default function RequestAccessDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			icon={<DoorClosedLocked className="h-5 w-5" aria-hidden />}
			title="How to get access"
			footer={
				<Button
					type="button"
					className="btn-primary flex items-center justify-center"
					autoFocus
					onClick={() => onOpenChange(false)}
				>
					<ThumbsUp className="h-5 w-5" aria-hidden />
					Got it
				</Button>
			}
		>
			<div className="flex flex-col gap-3 pb-1 text-sm text-slate-600 pt-4">
				<p>
					Access is granted by <strong>invitation-only</strong> from an
					organization that already uses CAALM.
				</p>
				<p>
					If you are a member of one of those organizations, contact your
					administrator to request an invitation for your role.
				</p>
				<p>
					Invitations are sent by email. Use the registration link in that
					message to continue here.
				</p>
			</div>
		</AppDialog>
	);
}
