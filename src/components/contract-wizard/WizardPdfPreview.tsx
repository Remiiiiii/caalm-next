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
import {
	useCallback,
	useEffect,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { Document, Page, pdfjs } from "react-pdf";
import DocumentViewer from "@/components/DocumentViewer";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import "@/lib/templates/docx-preview.css";
import "react-pdf/dist/Page/TextLayer.css";

// pdf.js only — avoid Adobe / browser PDF chrome in the wizard preview.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type WizardPdfPreviewProps = {
	sessionId: string;
	fileName: string;
	pdfUrl: string | null;
	/** Letterheaded HTML fallback when PDF bytes are unavailable. */
	htmlContent?: string | null;
	fileId: string | null;
	loading: boolean;
	error: string | null;
	/** Hide the wizard title/copy; used inside negotiation dialog. */
	compact?: boolean;
	/** Mount download/print/assistant into this header element. */
	actionsHost?: HTMLElement | null;
	/** Grow to fill the parent and use one scroll area for the page. */
	fillHeight?: boolean;
};

/** Spinner + page skeleton: honest feedback when PDF build has no % progress. */
function PdfPreviewLoadingState({
	label = "Building the PDF preview…",
	fillHeight = false,
}: {
	label?: string;
	fillHeight?: boolean;
}) {
	return (
		<div
			className={cn(
				"overflow-hidden bg-white",
				fillHeight
					? "flex min-h-0 flex-1 flex-col"
					: "rounded-lg border border-slate-200",
			)}
			role="status"
			aria-live="polite"
			aria-busy="true"
		>
			<div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2">
				<div className="flex items-center gap-2">
					<Skeleton className="h-8 w-8 rounded-md" />
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-8 w-8 rounded-md" />
				</div>
				<div className="flex items-center gap-2">
					<Skeleton className="h-8 w-8 rounded-md" />
					<Skeleton className="h-4 w-12" />
					<Skeleton className="h-8 w-8 rounded-md" />
				</div>
			</div>
			<div
				className={cn(
					"flex flex-col items-center justify-center gap-4 bg-slate-50 p-6",
					fillHeight ? "min-h-0 flex-1" : "min-h-[min(50vh,480px)]",
				)}
			>
				<LoadingSpinner size="md" label={label} className="p-0" />
				<div className="w-full max-w-md space-y-3 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
					<Skeleton className="mx-auto h-5 w-2/3" />
					<Skeleton className="h-3 w-full" />
					<Skeleton className="h-3 w-11/12" />
					<Skeleton className="h-3 w-full" />
					<Skeleton className="h-3 w-4/5" />
					<Skeleton className="mt-4 h-3 w-full" />
					<Skeleton className="h-3 w-10/12" />
					<Skeleton className="h-3 w-full" />
					<Skeleton className="h-24 w-full" />
				</div>
			</div>
		</div>
	);
}

export function WizardPdfPreview({
	sessionId,
	fileName,
	pdfUrl,
	htmlContent = null,
	fileId,
	loading,
	error,
	compact = false,
	actionsHost = null,
	fillHeight = false,
}: WizardPdfPreviewProps) {
	const [aiOpen, setAiOpen] = useState(false);
	const [objectUrl, setObjectUrl] = useState<string | null>(null);
	const [viewerFile, setViewerFile] = useState<Blob | string | null>(null);
	const [fileSizeBytes, setFileSizeBytes] = useState<number | null>(null);
	const [numPages, setNumPages] = useState(0);
	const [pageNumber, setPageNumber] = useState(1);
	const [scale, setScale] = useState(1);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [fetchingPdf, setFetchingPdf] = useState(false);

	useEffect(() => {
		if (!pdfUrl) {
			setObjectUrl(null);
			setViewerFile(null);
			setFileSizeBytes(null);
			setNumPages(0);
			setPageNumber(1);
			setLoadError(null);
			setFetchingPdf(false);
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
		setFetchingPdf(true);

		let cancelled = false;
		let blobUrl: string | null = null;
		void (async () => {
			try {
				// Fetch with cookies, then hand a Blob to pdf.js (auth-gated draft URLs).
				const response = await fetch(url, { credentials: "include" });
				if (cancelled || !response.ok) {
					if (!cancelled) {
						setViewerFile(url);
						setFetchingPdf(false);
					}
					return;
				}
				const buffer = await response.arrayBuffer();
				if (cancelled) return;
				if (buffer.byteLength > 0) setFileSizeBytes(buffer.byteLength);
				// Octet-stream MIME reduces Adobe Acrobat extension injection
				blobUrl = URL.createObjectURL(
					new Blob([buffer], { type: "application/octet-stream" }),
				);
				setViewerFile(blobUrl);
			} catch {
				if (!cancelled) setViewerFile(url);
			} finally {
				if (!cancelled) setFetchingPdf(false);
			}
		})();

		return () => {
			cancelled = true;
			setObjectUrl(null);
			setViewerFile(null);
			setFetchingPdf(false);
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

	// Print the full PDF (every page), not only the visible canvas. Prefer PDF
	// bytes so Chrome prints document pages instead of the negotiate SPA shell.
	const printPdf = useCallback(() => {
		const runHtmlPrint = (title: string, bodyHtml: string) => {
			const iframe = document.createElement("iframe");
			iframe.setAttribute("aria-hidden", "true");
			iframe.style.cssText =
				"position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
			document.body.appendChild(iframe);
			const doc = iframe.contentDocument;
			const win = iframe.contentWindow;
			if (!doc || !win) {
				iframe.remove();
				return;
			}
			doc.open();
			doc.write(
				`<!doctype html><html><head><title>${title}</title>
				<style>
					@page { size: letter; margin: 0.75in; }
					html, body { margin: 0; background: #fff; }
					body {
						color: #111;
						font-family: "Times New Roman", Times, serif;
						font-size: 15px;
						line-height: 1.45;
					}
					img { display: block; max-width: 100%; height: auto; page-break-after: always; }
					img:last-child { page-break-after: auto; }
					.docx-letterhead { display: flex; justify-content: space-between; gap: 1.5rem; margin: 0 0 1.5rem; }
					.docx-letterhead-org { text-align: right; max-width: 55%; margin-left: auto; line-height: 1.05; }
					.docx-title { text-align: center; font-weight: 700; margin: 0 0 1rem; }
					.docx-heading { font-weight: 700; margin: 1rem 0 0.5rem; }
					.docx-rule { border: 0; border-top: 1px solid #111; margin: 1rem 0 1.25rem; }
					.docx-preview p { margin: 0 0 0.75rem; }
					.docx-preview ul { margin: 0 0 0.75rem; padding-left: 1.25rem; }
				</style></head><body><div class="docx-preview">${bodyHtml}</div></body></html>`,
			);
			doc.close();
			const cleanup = () => iframe.remove();
			win.addEventListener("afterprint", cleanup);
			window.setTimeout(cleanup, 60_000);
			const images = Array.from(doc.images);
			const startPrint = () => {
				win.focus();
				win.print();
			};
			if (images.length === 0 || images.every((img) => img.complete)) {
				startPrint();
				return;
			}
			let remaining = images.length;
			for (const img of images) {
				if (img.complete) {
					remaining -= 1;
					continue;
				}
				img.addEventListener(
					"load",
					() => {
						remaining -= 1;
						if (remaining <= 0) startPrint();
					},
					{ once: true },
				);
				img.addEventListener(
					"error",
					() => {
						remaining -= 1;
						if (remaining <= 0) startPrint();
					},
					{ once: true },
				);
			}
			if (remaining <= 0) startPrint();
		};

		const printPdfBytes = async (source: ArrayBuffer) => {
			// Prefer Chrome's PDF printer (no negotiate URL in the footer).
			try {
				const blobUrl = URL.createObjectURL(
					new Blob([source], { type: "application/pdf" }),
				);
				const iframe = document.createElement("iframe");
				iframe.setAttribute("aria-hidden", "true");
				iframe.style.cssText =
					"position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
				iframe.src = blobUrl;
				document.body.appendChild(iframe);
				await new Promise<void>((resolve, reject) => {
					const timer = window.setTimeout(
						() => reject(new Error("PDF print iframe timed out")),
						8_000,
					);
					iframe.onload = () => {
						window.clearTimeout(timer);
						resolve();
					};
					iframe.onerror = () => {
						window.clearTimeout(timer);
						reject(new Error("PDF print iframe failed"));
					};
				});
				await new Promise((resolve) => window.setTimeout(resolve, 300));
				const win = iframe.contentWindow;
				if (!win) throw new Error("PDF print window missing");
				const cleanup = () => {
					iframe.remove();
					URL.revokeObjectURL(blobUrl);
				};
				win.addEventListener("afterprint", cleanup);
				window.setTimeout(cleanup, 60_000);
				win.focus();
				win.print();
				return true;
			} catch {
				/* Fall back to pdf.js page images (avoids Adobe iframe quirks). */
			}

			const pdf = await pdfjs.getDocument({ data: source }).promise;
			const images: string[] = [];
			for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
				const page = await pdf.getPage(pageNum);
				const viewport = page.getViewport({ scale: 2 });
				const canvas = document.createElement("canvas");
				canvas.width = viewport.width;
				canvas.height = viewport.height;
				const context = canvas.getContext("2d");
				if (!context) continue;
				await page.render({ canvasContext: context, viewport }).promise;
				images.push(canvas.toDataURL("image/png"));
			}
			if (images.length === 0) return false;
			runHtmlPrint(
				fileName,
				images.map((src) => `<img src="${src}" alt="" />`).join(""),
			);
			return true;
		};

		void (async () => {
			const src =
				typeof viewerFile === "string"
					? viewerFile
					: objectUrl || pdfUrl;
			if (src) {
				try {
					const response = await fetch(src, { credentials: "include" });
					if (response.ok) {
						const buffer = await response.arrayBuffer();
						if (buffer.byteLength > 0 && (await printPdfBytes(buffer))) {
							return;
						}
					}
				} catch {
					/* fall through to HTML / visible canvas */
				}
			}

			if (htmlContent) {
				runHtmlPrint(fileName, htmlContent);
				return;
			}

			const canvases = Array.from(
				document.querySelectorAll<HTMLCanvasElement>(
					".wizard-pdf-preview .react-pdf__Page__canvas",
				),
			);
			if (canvases.length === 0) return;
			runHtmlPrint(
				fileName,
				canvases
					.map(
						(canvas) =>
							`<img src="${canvas.toDataURL("image/png")}" alt="" />`,
					)
					.join(""),
			);
		})();
	}, [fileName, htmlContent, objectUrl, pdfUrl, viewerFile]);

	const downloadPdf = useCallback(async () => {
		const src =
			typeof viewerFile === "string" ? viewerFile : objectUrl || pdfUrl;
		if (!src) return;
		try {
			const response = await fetch(src, { credentials: "include" });
			if (!response.ok) return;
			// Octet-stream avoids the browser opening a native PDF viewer / Adobe UI
			const blob = new Blob([await response.arrayBuffer()], {
				type: "application/octet-stream",
			});
			const href = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = href;
			anchor.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
			anchor.click();
			URL.revokeObjectURL(href);
		} catch {
			// no-op: download is best-effort
		}
	}, [fileName, objectUrl, pdfUrl, viewerFile]);

	const showLoading =
		loading ||
		(Boolean(pdfUrl) && !viewerFile && !error && !htmlContent) ||
		(fetchingPdf && !htmlContent);

	const toolbar = (
		<div className="flex flex-wrap items-center justify-end gap-2">
			{(pdfUrl || objectUrl) && (
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="h-8 w-8 cursor-pointer text-slate-700"
					onClick={() => void downloadPdf()}
					aria-label="Download PDF"
				>
					<Download className="h-4 w-4" />
				</Button>
			)}
			<Button
				type="button"
				variant="outline"
				size="icon"
				className="h-8 w-8 cursor-pointer text-slate-700"
				disabled={!pdfUrl && !objectUrl && !viewerFile && !htmlContent}
				onClick={printPdf}
				aria-label="Print PDF"
			>
				<Printer className="h-4 w-4" />
			</Button>
			<Button
				type="button"
				className="primary-btn cursor-pointer px-3 sm:px-4"
				disabled={!pdfUrl && !htmlContent}
				onClick={() => setAiOpen(true)}
			>
				<Sparkles className="h-4 w-4" />
				Ask CAALM Contract Assistant
			</Button>
		</div>
	);

	const portaledToolbar =
		actionsHost && typeof document !== "undefined"
			? createPortal(toolbar, actionsHost)
			: null;

	const pdfToolbar = (
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
	);

	const pdfDocument = (
		<div
			className={cn(
				"overflow-auto bg-slate-50",
				fillHeight ? "min-h-0 flex-1" : "max-h-[70vh] p-4",
			)}
		>
			<div
				className={cn(
					"flex justify-center",
					fillHeight ? "min-h-full py-2" : "min-h-[min(50vh,480px)]",
				)}
			>
				<Document
					file={viewerFile}
					onLoadSuccess={onDocumentLoadSuccess}
					onLoadError={() =>
						setLoadError("Could not load this PDF for preview.")
					}
					loading={
						<PdfPreviewLoadingState
							label="Rendering the PDF pages…"
							fillHeight={fillHeight}
						/>
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
	);

	return (
		<div
			className={cn(
				fillHeight ? "flex h-full min-h-0 flex-col" : "space-y-4",
			)}
		>
			{portaledToolbar}
			{!compact ? (
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
					{toolbar}
				</div>
			) : null}
			{showLoading && (
				<PdfPreviewLoadingState
					label={
						loading
							? "Building the PDF preview…"
							: "Loading the PDF preview…"
					}
					fillHeight={fillHeight}
				/>
			)}
			{error && <p className="shrink-0 text-sm text-red">{error}</p>}

			{htmlContent && !showLoading && !error ? (
				<div
					className={cn(
						"overflow-auto bg-white",
						fillHeight && "min-h-0 flex-1",
						!fillHeight && "max-h-[70vh] rounded-lg border border-slate-200",
					)}
				>
					<div className="mx-auto max-w-[640px] p-6 sm:p-8">
						<div
							className="docx-preview"
							// Server-built letterhead HTML from the same DOCX merge path.
							dangerouslySetInnerHTML={{ __html: htmlContent }}
						/>
					</div>
				</div>
			) : null}

			{viewerFile && !showLoading && !htmlContent && fillHeight ? (
				<>
					{pdfToolbar}
					{pdfDocument}
				</>
			) : null}

			{viewerFile && !showLoading && !htmlContent && !fillHeight ? (
				<div className="wizard-pdf-preview overflow-hidden rounded-lg border border-slate-200 bg-white">
					{pdfToolbar}
					{pdfDocument}
				</div>
			) : null}

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
