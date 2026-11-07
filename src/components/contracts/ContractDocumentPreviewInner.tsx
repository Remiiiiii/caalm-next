"use client";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";

// pdf.js only (no Adobe Embed / browser PDF chrome) — same worker as DocumentViewerInner.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type ContractDocumentPreviewInnerProps = {
	file: string;
	pageWidth: number;
	numPages: number | null;
	error: boolean;
	onLoadSuccess: (info: { numPages: number }) => void;
	onLoadError: () => void;
	registerPageRef: (page: number, el: HTMLDivElement | null) => void;
};

/**
 * Raw react-pdf render — split out of ContractPreviewSheet.tsx and loaded via
 * next/dynamic(ssr:false) there, since react-pdf touches DOMMatrix at import
 * time and crashes the server prerender otherwise.
 */
export default function ContractDocumentPreviewInner({
	file,
	pageWidth,
	numPages,
	error,
	onLoadSuccess,
	onLoadError,
	registerPageRef,
}: ContractDocumentPreviewInnerProps) {
	return (
		<Document
			file={file}
			onLoadSuccess={onLoadSuccess}
			onLoadError={onLoadError}
			loading={
				<div className="flex h-32 items-center justify-center text-xs text-slate-400">
					Loading document…
				</div>
			}
		>
			{error ? (
				<p className="pt-8 text-center text-xs text-red">
					Failed to load this document.
				</p>
			) : (
				Array.from({ length: numPages ?? 0 }, (_, index) => (
					<div
						key={`page-${index + 1}`}
						ref={(el) => registerPageRef(index + 1, el)}
						aria-hidden="true"
						className="mb-3 flex justify-center last:mb-0"
					>
						<Page
							pageNumber={index + 1}
							width={pageWidth}
							renderTextLayer={false}
							renderAnnotationLayer={false}
							className="rounded border border-slate-200 bg-white shadow-sm"
						/>
					</div>
				))
			)}
		</Document>
	);
}
