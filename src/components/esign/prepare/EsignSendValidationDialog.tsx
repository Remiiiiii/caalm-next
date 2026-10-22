"use client";

import { AlertTriangle } from "lucide-react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import type { MissingSignatureSigner } from "@/lib/esign/validate-envelope";

export function EsignSendValidationDialog({
	open,
	onOpenChange,
	missing,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	missing: MissingSignatureSigner[];
}) {
	return (
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			size="form"
			className="max-h-[90vh]"
			icon={<AlertTriangle className="h-5 w-5" />}
			title="Send Document"
			description="Recipients will be able to sign the document once sent"
			footer={
				<Button
					type="button"
					className="btn-primary px-3 sm:px-4"
					onClick={() => onOpenChange(false)}
				>
					Close
				</Button>
			}
		>
			<div className="rounded-lg border border-orange/20 bg-orange/10 p-4 text-sm text-orange pb-1">
				<p className="font-medium">
					The following signers are missing signature fields:
				</p>
				<ul className="mt-2 list-disc pl-5">
					{missing.map((signer) => (
						<li key={signer.id || signer.email}>{signer.email}</li>
					))}
				</ul>
			</div>
		</AppDialog>
	);
}
