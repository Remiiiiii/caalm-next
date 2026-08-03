"use client";

import {
	ChevronLeft,
	ChevronRight,
	FileText,
	Minus,
	Plus,
	X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import {
	getAudioMimeType,
	getFilePreviewKind,
	getVideoMimeType,
} from "@/lib/files/filePreviewKind";
import { getFileType } from "@/lib/utils";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export type FilePreviewDialogFile = {
	name: string;
	url: string;
	type?: string;
	extension?: string;
};

type FilePreviewDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	file: FilePreviewDialogFile | null;
};

export default function FilePreviewDialog({
	open,
	onOpenChange,
	file,
}: FilePreviewDialogProps) {
	const [numPages, setNumPages] = useState(0);
	const [pageNumber, setPageNumber] = useState(1);
	const [scale, setScale] = useState(1);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [imageError, setImageError] = useState(false);

	const previewKind = useMemo(
		() =>
			file
				? getFilePreviewKind({
						name: file.name,
						type: file.type,
						extension: file.extension,
					})
				: "document",
		[file],
	);

	const extension = useMemo(() => {
		if (!file) return "";
		return (
			file.extension ||
			getFileType(file.name).extension ||
			file.type ||
			""
		).toLowerCase();
	}, [file]);

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
		setImageError(false);
	}, [open, file?.url, file?.name]);

	const onDocumentLoadSuccess = useCallback(
		({ numPages: nextNumPages }: { numPages: number }) => {
			setNumPages(nextNumPages);
			setPageNumber(1);
			setLoadError(null);
		},
		[],
	);

	if (!open || !file || typeof document === "undefined") return null;

	const subtitle =
		previewKind === "image"
			? "Image preview"
			: previewKind === "video"
				? "Video preview"
				: previewKind === "audio"
					? "Audio preview"
					: "Document preview";

	return createPortal(
		<div
			className="pointer-events-auto fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6"
			role="dialog"
			aria-modal="true"
			aria-label={file.name || "File preview"}
		>
			<div
				className="absolute inset-0 cursor-pointer bg-slate-900/50 backdrop-blur-sm"
				aria-label="Close preview"
				role="button"
				tabIndex={-1}
				onClick={() => onOpenChange(false)}
			/>
			<div className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
				<div className="h-4 w-full shrink-0 bg-[#d6d7d8] opacity-70" />
				<div className="shrink-0 border-b border-slate-200 bg-linear-to-r from-blue-50 to-indigo-50 py-4">
					<div className="flex items-center justify-between gap-3 px-6">
						<div className="flex min-w-0 items-center gap-3">
							<FileText className="h-5 w-5 shrink-0 text-[#0f5384]" />
							<h2 className="truncate text-xl font-semibold sidebar-gradient-text">
								{file.name || "File preview"}
							</h2>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="shrink-0 cursor-pointer"
							onClick={() => onOpenChange(false)}
							aria-label="Close preview"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
					<p className="ml-14 mt-1 text-sm text-slate-600">{subtitle}</p>
				</div>

				{previewKind === "pdf" && file.url && (
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
					{previewKind === "image" && (
						<div className="relative mx-auto flex min-h-[min(70vh,720px)] w-full max-w-5xl items-center justify-center">
							{imageError ? (
								<p className="text-sm text-red">Could not load this image.</p>
							) : (
								<div className="relative h-[min(70vh,720px)] w-full">
									<Image
										src={file.url}
										alt={file.name}
										fill
										sizes="(max-width: 1024px) 100vw, 80vw"
										className="object-contain"
										onError={() => setImageError(true)}
										unoptimized
									/>
								</div>
							)}
						</div>
					)}

					{previewKind === "video" && (
						<div className="flex min-h-[min(70vh,720px)] items-center justify-center">
							{/* biome-ignore lint/a11y/useMediaCaption: source files have no caption tracks */}
							<video
								key={file.url}
								controls
								playsInline
								className="max-h-[min(70vh,720px)] w-full max-w-5xl rounded-lg bg-black shadow-sm"
							>
								<source src={file.url} type={getVideoMimeType(extension)} />
								Your browser does not support video playback.
							</video>
						</div>
					)}

					{previewKind === "audio" && (
						<div className="flex min-h-[min(70vh,240px)] flex-col items-center justify-center gap-4">
							<p className="text-sm text-slate-600">{file.name}</p>
							{/* biome-ignore lint/a11y/useMediaCaption: audio playback only */}
							<audio key={file.url} controls className="w-full max-w-xl">
								<source src={file.url} type={getAudioMimeType(extension)} />
								Your browser does not support audio playback.
							</audio>
						</div>
					)}

					{previewKind === "pdf" && (
						<div className="flex min-h-[min(70vh,720px)] justify-center">
							{file.url ? (
								<Document
									file={file.url}
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
							) : (
								<div className="flex h-[min(50vh,480px)] items-center justify-center text-sm text-slate-500">
									No PDF available to preview
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>,
		document.body,
	);
}
