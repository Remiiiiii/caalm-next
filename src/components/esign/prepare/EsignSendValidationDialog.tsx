"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[600px] p-0 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl">
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
				<div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4">
					<div className="flex items-center gap-3 px-6">
						<AlertTriangle className="w-5 h-5 text-[#0f5384]" />
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							Send Document
						</DialogTitle>
					</div>
					<p className="text-sm text-slate-600 mt-1 ml-14">
						Recipients will be able to sign the document once sent
					</p>
				</div>
				<div className="flex-1 overflow-y-auto p-6 bg-slate-50">
					<div className="rounded-lg border border-orange/20 bg-orange/10 p-4 text-sm text-orange">
						<p className="font-medium">
							The following signers are missing signature fields:
						</p>
						<ul className="mt-2 list-disc pl-5">
							{missing.map((signer) => (
								<li key={signer.id || signer.email}>{signer.email}</li>
							))}
						</ul>
					</div>
				</div>
				<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
					<Button
						className="primary-btn px-3 sm:px-4"
						onClick={() => onOpenChange(false)}
					>
						Close
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
