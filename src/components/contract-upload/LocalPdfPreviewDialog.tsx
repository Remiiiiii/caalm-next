"use client";

import { ChevronLeft, ChevronRight, FileText, Minus, Plus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Use pdf.js (not Chrome’s PDF viewer) so Gemini Summarize never appears.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type LocalPdfPreviewDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	fileName: string;
	/** Object URL or data URL for the PDF */
	pdfUrl: string | null;
};

/**
 * Fixed overlay (not Radix Dialog) so it can sit above the upload dialog
 * without nested-modal focus/dismiss conflicts.
 */
export default function LocalPdfPreviewDialog({
	open,
	onOpenChange,
	fileName,
	pdfUrl,
}: LocalPdfPreviewDialogProps) {
	const [numPages, setNumPages] = useState(0);
	const [pageNumber, setPageNumber] = useState(1);
	const [scale, setScale] = useState(1);
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onOpenChange(false);
		};
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = prevOverflow;
			window.removeEventListener("keydown", onKey);
		};
	}, [open, onOpenChange]);

	useEffect(() => {
		if (!open) return;
		setNumPages(0);
		setPageNumber(1);
		setScale(1);
		setLoadError(null);
	}, [open, pdfUrl]);

	const onDocumentLoadSuccess = useCallback(
		({ numPages: nextNumPages }: { numPages: number }) => {
			setNumPages(nextNumPages);
			setPageNumber(1);
			setLoadError(null);
		},
		[],
	);

	if (!open || typeof document === "undefined") return null;

	return createPortal(
		<div
			className="pointer-events-auto fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6"
			role="dialog"
			aria-modal="true"
			aria-label={fileName || "PDF preview"}
			data-pdf-preview=""
		>
			<div
				className="absolute inset-0 cursor-pointer bg-slate-900/50 backdrop-blur-sm"
				aria-label="Close PDF preview"
				role="button"
				tabIndex={-1}
				onClick={() => onOpenChange(false)}
			/>
			<div className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
				<div className="h-4 w-full shrink-0 bg-[#d6d7d8] opacity-70" />
				<div className="shrink-0 border-b border-slate-200 bg-linear-to-r from-blue-50 to-indigo-50 py-4">
					<div className="flex items-center justify-between gap-3 px-6">
						<div className="flex min-w-0 items-center gap-3">
							<FileText className="h-5 w-5 shrink-0 text-[#0f5384]" />
							<h2 className="truncate text-xl font-semibold sidebar-gradient-text">
								{fileName || "PDF preview"}
							</h2>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="shrink-0 cursor-pointer"
							onClick={() => onOpenChange(false)}
							aria-label="Close PDF preview"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
					<p className="ml-14 mt-1 text-sm text-slate-600">
						Contract file preview
					</p>
				</div>

				{pdfUrl && (
					<div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2">
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
							<span className="min-w-[4.5rem] text-center text-xs text-slate-600">
								{numPages > 0 ? `${pageNumber} / ${numPages}` : "—"}
							</span>
							<Button
								type="button"
								variant="outline"
								size="icon"
								className="h-8 w-8 cursor-pointer"
								disabled={numPages === 0 || pageNumber >= numPages}
								onClick={() =>
									setPageNumber((p) => Math.min(numPages, p + 1))
								}
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
							<span className="min-w-[3rem] text-center text-xs text-slate-600">
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
				)}

				<div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-4">
					{pdfUrl ? (
						<div className="flex min-h-[min(70vh,720px)] justify-center">
							<Document
								file={pdfUrl}
								onLoadSuccess={onDocumentLoadSuccess}
								onLoadError={() =>
									setLoadError("Could not load this PDF for preview.")
								}
								loading={
									<div className="flex h-[min(50vh,480px)] items-center justify-center text-sm text-slate-500">
										Loading PDF…
									</div>
								}
								error={
									<div className="flex h-[min(50vh,480px)] items-center justify-center text-sm text-red">
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
					) : (
						<div className="flex h-[min(50vh,480px)] items-center justify-center text-sm text-slate-500">
							No PDF available to preview
						</div>
					)}
				</div>
			</div>
		</div>,
		document.body,
	);
}
