"use client";

import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";

// pdf.js only (no Adobe Embed / browser PDF chrome) — same worker as DocumentViewerInner.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type ExpiryFilePdfViewerProps = {
	fileUrl: string;
};

const PANE_CLASS =
	"min-h-[42vh] max-h-[42vh] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3";

/**
 * Minimal, scrollable PDF preview for the expiry modal's "more details" file
 * view — no zoom toolbar, no AI panel (see DocumentViewerInner for the full one).
 */
export default function ExpiryFilePdfViewer({
	fileUrl,
}: ExpiryFilePdfViewerProps) {
	const [pdfViewerFile, setPdfViewerFile] = useState<string | null>(null);
	const [numPages, setNumPages] = useState<number | null>(null);
	const [visiblePages, setVisiblePages] = useState(1);
	const [error, setError] = useState<string | null>(null);

	// Auth-gated PDF URLs: fetch with cookies, then hand a blob URL to pdf.js
	// (avoids application/pdf blob MIME — the Acrobat extension keys off that).
	useEffect(() => {
		setNumPages(null);
		setVisiblePages(1);
		setError(null);
		if (
			fileUrl.startsWith("blob:") ||
			fileUrl.startsWith("data:") ||
			fileUrl.startsWith("file://")
		) {
			setPdfViewerFile(fileUrl);
			return;
		}

		let cancelled = false;
		let blobUrl: string | null = null;
		void (async () => {
			try {
				const response = await fetch(fileUrl, { credentials: "include" });
				if (cancelled || !response.ok) {
					if (!cancelled) setPdfViewerFile(fileUrl);
					return;
				}
				const buffer = await response.arrayBuffer();
				if (cancelled) return;
				blobUrl = URL.createObjectURL(
					new Blob([buffer], { type: "application/octet-stream" }),
				);
				setPdfViewerFile(blobUrl);
			} catch {
				if (!cancelled) setPdfViewerFile(fileUrl);
			}
		})();

		return () => {
			cancelled = true;
			if (blobUrl) URL.revokeObjectURL(blobUrl);
		};
	}, [fileUrl]);

	// Paint page 1 first; mount the rest on the next frame so the modal
	// doesn't grow by N×720px pages in one layout pass.
	useEffect(() => {
		if (numPages == null || numPages <= 1) return;
		const id = window.requestAnimationFrame(() => setVisiblePages(numPages));
		return () => window.cancelAnimationFrame(id);
	}, [numPages]);

	if (!pdfViewerFile) {
		return (
			<div
				className={`${PANE_CLASS} flex items-center justify-center text-sm text-slate-500`}
			>
				Loading document…
			</div>
		);
	}

	return (
		<div className={PANE_CLASS}>
			<Document
				file={pdfViewerFile}
				onLoadSuccess={({ numPages: total }) => setNumPages(total)}
				onLoadError={() => setError("Failed to load this document.")}
				loading={
					<div className="flex min-h-[calc(42vh-1.5rem)] items-center justify-center text-sm text-slate-500">
						Loading document…
					</div>
				}
			>
				{error ? (
					<p className="py-8 text-center text-sm text-red">{error}</p>
				) : (
					Array.from({ length: visiblePages }, (_, index) => (
						<Page
							key={`page-${index + 1}`}
							pageNumber={index + 1}
							width={720}
							renderTextLayer
							renderAnnotationLayer={false}
							className="mx-auto mb-3 shadow-sm last:mb-0"
						/>
					))
				)}
			</Document>
		</div>
	);
}
