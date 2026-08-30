"use client";

import { Download, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import DocumentViewer from "@/components/DocumentViewer";
import { Button } from "@/components/ui/button";

type WizardPdfPreviewProps = {
	sessionId: string;
	fileName: string;
	pdfUrl: string | null;
	fileId: string | null;
	loading: boolean;
	error: string | null;
};

export function WizardPdfPreview({
	sessionId,
	fileName,
	pdfUrl,
	fileId,
	loading,
	error,
}: WizardPdfPreviewProps) {
	const [aiOpen, setAiOpen] = useState(false);
	const [objectUrl, setObjectUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!pdfUrl) {
			setObjectUrl(null);
			return;
		}
		let revoked = false;
		const url = pdfUrl.startsWith("/")
			? `${window.location.origin}${pdfUrl}`
			: pdfUrl;
		setObjectUrl(url);
		return () => {
			revoked = true;
			if (revoked) setObjectUrl(null);
		};
	}, [pdfUrl]);

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="text-xl font-semibold sidebar-gradient-text">
						Preview the PDF
					</h2>
					<p className="mt-1 text-sm text-slate-600">
						This is the file reviewers will see. Ask the AI assistant about
						clauses, then create the draft to start pending review.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					{pdfUrl && (
						<Button asChild className="primary-btn cursor-pointer px-3 sm:px-4">
							<a href={pdfUrl} download={fileName}>
								<Download className="h-4 w-4" />
								Download PDF
							</a>
						</Button>
					)}
					<Button
						type="button"
						className="primary-btn cursor-pointer px-3 sm:px-4"
						disabled={!pdfUrl}
						onClick={() => setAiOpen(true)}
					>
						<Sparkles className="h-4 w-4" />
						Ask CAALM AI
					</Button>
				</div>
			</div>
			{loading && (
				<p className="text-sm text-slate-600">Building the PDF preview…</p>
			)}
			{error && <p className="text-sm text-red">{error}</p>}
			{objectUrl && (
				<iframe
					title={fileName}
					src={`${objectUrl}#toolbar=1`}
					className="h-[70vh] w-full rounded-lg border border-slate-200 bg-white"
				/>
			)}
			<DocumentViewer
				isOpen={aiOpen}
				onClose={() => setAiOpen(false)}
				file={{
					id: fileId || sessionId,
					name: fileName,
					type: "pdf",
					size: "",
					url: objectUrl || "",
					createdAt: new Date().toISOString(),
					createdBy: "wizard",
					description: "Wizard PDF preview",
				}}
			/>
		</div>
	);
}
