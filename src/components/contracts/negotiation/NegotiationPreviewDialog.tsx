"use client";

import { FileSearch, RotateCw, Send } from "lucide-react";
import { useState } from "react";
import { WizardPdfPreview } from "@/components/contract-wizard/WizardPdfPreview";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";

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

	const description =
		`This preview reflects the latest accepted negotiation text.` +
		(htmlContent && !pdfUrl
			? " Showing a formatted preview (PDF conversion unavailable)."
			: "");

	return (
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			size="form"
			className="h-[90vh] max-h-[90vh] max-w-7xl"
			pending={confirming}
			icon={<FileSearch className="h-5 w-5" />}
			title="Review letterheaded PDF"
			description={description}
			footer={
				showConfirm ? (
					<>
						<Button
							type="button"
							variant="outline"
							className="rounded-full border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
							disabled={confirming}
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							className="btn-primary px-3 sm:px-4"
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
					</>
				) : (
					<p className="text-xs text-slate-600">
						Review the formatted draft before sharing or approval.
					</p>
				)
			}
		>
			<div className="flex min-h-0 flex-col gap-2 pb-1">
				<div
					ref={setActionsHost}
					className="flex shrink-0 flex-wrap items-center justify-end gap-2"
				/>
				<div className="flex min-h-[50vh] flex-1 flex-col overflow-hidden">
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
			</div>
		</AppDialog>
	);
}
