"use client";

import {
	ChevronLeft,
	ChevronRight,
	FileText,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "@/lib/templates/docx-preview.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { ReviewSourceRegion } from "./types";
import { middleTruncateFileName } from "./reviewFieldUtils";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const BASE_PAGE_WIDTH = 420;
const MIN_SCALE = 0.6;
const MAX_SCALE = 2;
const SCALE_STEP = 0.1;

type UploadReviewDocumentPaneProps = {
	fileName?: string;
	pdfUrl: string | null;
	htmlContent?: string | null;
	textContent?: string | null;
	downloadOnly?: boolean;
	activeRegion: ReviewSourceRegion | null;
};

export function UploadReviewDocumentPane({
	fileName,
	pdfUrl,
	htmlContent = null,
	textContent = null,
	downloadOnly = false,
	activeRegion,
}: UploadReviewDocumentPaneProps) {
	const [pageNumber, setPageNumber] = useState(1);
	const [numPages, setNumPages] = useState(0);
	const [scale, setScale] = useState(1);

	const onDocumentLoadSuccess = useCallback(
		({ numPages: next }: { numPages: number }) => {
			setNumPages(next);
			setPageNumber(1);
		},
		[],
	);

	const displayPage =
		activeRegion && activeRegion.page >= 1 ? activeRegion.page : pageNumber;

	const showPdfToolbar =
		Boolean(pdfUrl) && !downloadOnly && !htmlContent && textContent == null;

	const iconBtn =
		"inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded text-slate-500 transition-colors hover:text-[#078FAB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]/40 disabled:cursor-not-allowed disabled:opacity-40";

	return (
		<div className="flex h-full min-h-0 flex-col">
			{showPdfToolbar ? (
				<div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-2 py-1.5">
					<div className="flex items-center gap-0.5">
						<button
							type="button"
							className={iconBtn}
							disabled={displayPage <= 1}
							aria-label="Previous page"
							onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
						>
							<ChevronLeft className="h-4 w-4" aria-hidden />
						</button>
						<span className="min-w-[3.5rem] text-center text-xs tabular-nums text-slate-600">
							{numPages > 0 ? `${displayPage} / ${numPages}` : "—"}
						</span>
						<button
							type="button"
							className={iconBtn}
							disabled={numPages === 0 || displayPage >= numPages}
							aria-label="Next page"
							onClick={() =>
								setPageNumber((p) => Math.min(numPages, p + 1))
							}
						>
							<ChevronRight className="h-4 w-4" aria-hidden />
						</button>
					</div>
					<div className="flex items-center gap-0.5">
						<button
							type="button"
							className={iconBtn}
							disabled={scale <= MIN_SCALE}
							aria-label="Zoom out"
							onClick={() =>
								setScale((s) =>
									Math.max(MIN_SCALE, Number((s - SCALE_STEP).toFixed(1))),
								)
							}
						>
							<ZoomOut className="h-4 w-4" aria-hidden />
						</button>
						<button
							type="button"
							className={iconBtn}
							disabled={scale >= MAX_SCALE}
							aria-label="Zoom in"
							onClick={() =>
								setScale((s) =>
									Math.min(MAX_SCALE, Number((s + SCALE_STEP).toFixed(1))),
								)
							}
						>
							<ZoomIn className="h-4 w-4" aria-hidden />
						</button>
					</div>
				</div>
			) : null}

			<div className="review-hover-scroll min-h-0 flex-1 overscroll-contain px-4 py-3 pb-20">
				{downloadOnly ? (
					<div className="flex min-h-[240px] items-center justify-center px-4 text-center text-sm text-slate-600">
						This file type can&apos;t be shown inline. Download it from the
						upload step to view it on your computer.
					</div>
				) : htmlContent ? (
					<div
						className="docx-preview rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700"
						dangerouslySetInnerHTML={{ __html: htmlContent }}
					/>
				) : textContent != null ? (
					<pre className="whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">
						{textContent || "This file is empty."}
					</pre>
				) : pdfUrl ? (
					<div
						className="relative flex justify-center"
						role="img"
						aria-label={fileName || "Uploaded document preview"}
					>
						<Document
							file={pdfUrl}
							onLoadSuccess={onDocumentLoadSuccess}
							loading={
								<div className="flex h-48 items-center justify-center text-sm text-slate-500">
									Loading document…
								</div>
							}
							error={
								<div className="flex h-48 items-center justify-center text-sm text-red">
									Could not load this PDF.
								</div>
							}
							className="rounded-md border border-slate-200 bg-white shadow-sm"
						>
							<Page
								pageNumber={displayPage}
								width={BASE_PAGE_WIDTH * scale}
								renderTextLayer
								renderAnnotationLayer={false}
								className="mx-auto"
							/>
						</Document>
						{activeRegion ? (
							<div
								className="pointer-events-none absolute inset-0"
								aria-hidden
							>
								<div
									className="absolute border-2 border-[#078FAB] bg-[#078FAB]/15"
									style={{
										left: `${activeRegion.x * 100}%`,
										top: `${activeRegion.y * 100}%`,
										width: `${activeRegion.w * 100}%`,
										height: `${activeRegion.h * 100}%`,
									}}
								/>
							</div>
						) : null}
					</div>
				) : (
					<div className="flex min-h-[240px] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-slate-500">
						<FileText className="h-8 w-8 text-slate-400" aria-hidden />
						No document available to preview
					</div>
				)}
				{fileName ? (
					<p
						className="mt-2 text-center text-xs text-slate-600"
						title={fileName}
						aria-label={fileName}
					>
						{middleTruncateFileName(fileName)}
					</p>
				) : null}
			</div>
		</div>
	);
}