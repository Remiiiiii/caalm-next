"use client";

import { FileSearch, RotateCw, Send } from "lucide-react";
import { useState } from "react";
import { WizardPdfPreview } from "@/components/contract-wizard/WizardPdfPreview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface NegotiationPreviewDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	contractId: string;
	fileName: string;
	pdfUrl: string | null;
	/** Letterheaded HTML when Adobe PDF conversion fails. */
	htmlContent?: string | null;
	loading: boolean;
	error: string | null;
	showConfirm: boolean;
	confirming: boolean;
	onConfirm: () => void;
}

export function NegotiationPreviewDialog({
	open,
	onOpenChange,
	contractId,
	fileName,
	pdfUrl,
	htmlContent = null,
	loading,
	error,
	showConfirm,
	confirming,
	onConfirm,
}: NegotiationPreviewDialogProps) {
	const [actionsHost, setActionsHost] = useState<HTMLElement | null>(null);
	const canConfirm =
		!loading && !error && !confirming && Boolean(pdfUrl || htmlContent);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex h-[90vh] max-h-[90vh] max-w-7xl flex-col overflow-hidden border border-slate-200 p-0 shadow-xl">
				<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
				<div className="sticky top-0 z-10 mt-4 shrink-0 border-b border-slate-200 bg-linear-to-r from-blue-50 to-indigo-50 py-4">
					<div className="flex items-start justify-between gap-4 px-6">
						<div className="min-w-0">
							<div className="flex items-center gap-3">
								<FileSearch className="h-5 w-5 shrink-0 text-[#0f5384]" />
								<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
									Review letterheaded PDF
								</DialogTitle>
							</div>
							<p className="mt-1 ml-8 text-sm text-slate-600 sm:ml-14">
								This preview reflects the latest accepted negotiation text.
								{htmlContent && !pdfUrl
									? " Showing a formatted preview (PDF conversion unavailable)."
									: ""}
							</p>
						</div>
						<div
							ref={setActionsHost}
							className="flex shrink-0 flex-wrap items-center justify-end gap-2"
						/>
					</div>
				</div>
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<WizardPdfPreview
						sessionId={contractId}
						fileName={fileName}
						pdfUrl={pdfUrl}
						htmlContent={htmlContent}
						fileId={contractId}
						loading={loading}
						error={error}
						compact
						fillHeight
						actionsHost={actionsHost}
					/>
				</div>
				<div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
					{showConfirm ? (
						<Button
							type="button"
							className="primary-btn px-3 sm:px-4"
							disabled={!canConfirm}
							onClick={onConfirm}
						>
							{confirming ? (
								<RotateCw className="h-4 w-4 animate-spin" />
							) : (
								<Send className="h-4 w-4" />
							)}
							{confirming ? "Sending..." : "Confirm & send"}
						</Button>
					) : (
						<p className="text-xs text-slate-600">
							Review the formatted draft before sharing or approval.
						</p>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
