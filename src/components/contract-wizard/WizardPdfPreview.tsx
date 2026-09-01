"use client";

import {
	ChevronLeft,
	ChevronRight,
	Download,
	Minus,
	Plus,
	Printer,
	Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import DocumentViewer from "@/components/DocumentViewer";
import { Button } from "@/components/ui/button";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Use pdf.js (not Chrome’s PDF viewer) so Adobe/Gemini Summarize never appears.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
	const [viewerFile, setViewerFile] = useState<Blob | string | null>(null);
	const [fileSizeBytes, setFileSizeBytes] = useState<number | null>(null);
	const [numPages, setNumPages] = useState(0);
	const [pageNumber, setPageNumber] = useState(1);
	const [scale, setScale] = useState(1);
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		if (!pdfUrl) {
			setObjectUrl(null);
			setViewerFile(null);
			setFileSizeBytes(null);
			setNumPages(0);
			setPageNumber(1);
			setLoadError(null);
			return;
		}
		const url = pdfUrl.startsWith("/")
			? `${window.location.origin}${pdfUrl}`
			: pdfUrl;
		setObjectUrl(url);
		setNumPages(0);
		setPageNumber(1);
		setScale(1);
		setLoadError(null);

		let cancelled = false;
		let blobUrl: string | null = null;
		void (async () => {
			try {
				// Fetch with cookies, then hand a Blob to pdf.js (auth-gated draft URLs).
				const response = await fetch(url, { credentials: "include" });
				if (cancelled || !response.ok) {
					if (!cancelled) setViewerFile(url);
					return;
				}
				const blob = await response.blob();
				if (cancelled) return;
				if (blob.size > 0) setFileSizeBytes(blob.size);
				blobUrl = URL.createObjectURL(blob);
				setViewerFile(blobUrl);
			} catch {
				if (!cancelled) setViewerFile(url);
			}
		})();

		return () => {
			cancelled = true;
			setObjectUrl(null);
			setViewerFile(null);
			if (blobUrl) URL.revokeObjectURL(blobUrl);
		};
	}, [pdfUrl]);

	const onDocumentLoadSuccess = useCallback(
		({ numPages: nextNumPages }: { numPages: number }) => {
			setNumPages(nextNumPages);
			setPageNumber(1);
			setLoadError(null);
		},
		[],
	);

	const printPdf = useCallback(() => {
		const src =
			typeof viewerFile === "string" ? viewerFile : objectUrl || pdfUrl;
		if (!src) return;

		const iframe = document.createElement("iframe");
		iframe.setAttribute("aria-hidden", "true");
		iframe.style.position = "fixed";
		iframe.style.right = "0";
		iframe.style.bottom = "0";
		iframe.style.width = "0";
		iframe.style.height = "0";
		iframe.style.border = "0";
		iframe.src = src;
		document.body.appendChild(iframe);

		const cleanup = () => {
			iframe.remove();
		};

		iframe.onload = () => {
			try {
				iframe.contentWindow?.focus();
				iframe.contentWindow?.print();
			} catch {
				window.open(src, "_blank")?.print();
			}
			window.setTimeout(cleanup, 1000);
		};
	}, [objectUrl, pdfUrl, viewerFile]);

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
				<div className="flex flex-wrap items-center gap-2">
					{pdfUrl && (
						<Button
							asChild
							variant="outline"
							size="icon"
							className="h-8 w-8 cursor-pointer text-slate-700"
						>
							<a href={pdfUrl} download={fileName} aria-label="Download PDF">
								<Download className="h-4 w-4" />
							</a>
						</Button>
					)}
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="h-8 w-8 cursor-pointer text-slate-700"
						disabled={!pdfUrl}
						onClick={printPdf}
						aria-label="Print PDF"
					>
						<Printer className="h-4 w-4" />
					</Button>
					<Button
						type="button"
						className="primary-btn cursor-pointer px-3 sm:px-4"
						disabled={!pdfUrl}
						onClick={() => setAiOpen(true)}
					>
						<Sparkles className="h-4 w-4" />
						Ask CAALM Contract Assistant
					</Button>
				</div>
			</div>
			{loading && (
				<p className="text-sm text-slate-600">Building the PDF preview…</p>
			)}
			{error && <p className="text-sm text-red">{error}</p>}

			{viewerFile && (
				<div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
					<div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2">
						<div className="flex items-center gap-1">
							<Button
								type="button"
								variant="outline"
								size="icon"
								className="h-8 w-8 cursor-pointer"
								disabled={pageNumber <= 1}
								onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
								aria-label="Previous page"
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<span className="min-w-[4.5rem] text-center text-xs text-slate-600 tabular-nums">
								{numPages > 0 ? `${pageNumber} / ${numPages}` : "—"}
							</span>
							<Button
								type="button"
								variant="outline"
								size="icon"
								className="h-8 w-8 cursor-pointer"
								disabled={numPages === 0 || pageNumber >= numPages}
								onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
								aria-label="Next page"
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
						<div className="flex items-center gap-1">
							<Button
								type="button"
								variant="outline"
								size="icon"
								className="h-8 w-8 cursor-pointer"
								disabled={scale <= 0.6}
								onClick={() =>
									setScale((s) => Math.max(0.6, Number((s - 0.1).toFixed(1))))
								}
								aria-label="Zoom out"
							>
								<Minus className="h-4 w-4" />
							</Button>
							<span className="min-w-[3rem] text-center text-xs text-slate-600 tabular-nums">
								{Math.round(scale * 100)}%
							</span>
							<Button
								type="button"
								variant="outline"
								size="icon"
								className="h-8 w-8 cursor-pointer"
								disabled={scale >= 2}
								onClick={() =>
									setScale((s) => Math.min(2, Number((s + 0.1).toFixed(1))))
								}
								aria-label="Zoom in"
							>
								<Plus className="h-4 w-4" />
							</Button>
						</div>
					</div>
					<div className="max-h-[70vh] overflow-auto bg-slate-50 p-4">
						<div className="flex min-h-[min(50vh,480px)] justify-center">
							<Document
								file={viewerFile}
								onLoadSuccess={onDocumentLoadSuccess}
								onLoadError={() =>
									setLoadError("Could not load this PDF for preview.")
								}
								loading={
									<div className="flex h-[min(40vh,360px)] items-center justify-center text-sm text-slate-500">
										Loading PDF…
									</div>
								}
								error={
									<div className="flex h-[min(40vh,360px)] items-center justify-center text-sm text-red">
										{loadError || "Could not load this PDF for preview."}
									</div>
								}
								className="rounded-md border border-slate-200 bg-white shadow-sm"
							>
								<Page
									pageNumber={pageNumber}
									scale={scale}
									renderTextLayer
									renderAnnotationLayer={false}
									className="mx-auto"
								/>
							</Document>
						</div>
					</div>
				</div>
			)}

			<DocumentViewer
				isOpen={aiOpen}
				onClose={() => setAiOpen(false)}
				assistantMode="contract"
				file={{
					id: fileId || sessionId,
					name: fileName,
					type: "pdf",
					size:
						fileSizeBytes != null && fileSizeBytes > 0
							? String(fileSizeBytes)
							: "",
					url: objectUrl || "",
					createdAt: new Date().toISOString(),
					createdBy: "wizard",
					description: "Wizard PDF preview",
				}}
			/>
		</div>
	);
}
