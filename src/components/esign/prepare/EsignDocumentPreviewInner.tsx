"use client";

import { Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
import type { EsignField, EsignFieldType, EsignRecipient } from "@/lib/esign/types";
import { getSignerColorWay } from "@/lib/esign/signer-colors";
import { ESIGN_FIELD_DRAG_TYPE } from "./EsignPlaceFieldsStep";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const BASE_PAGE_WIDTH = 640;

const FIELD_LABEL: Record<EsignField["type"], string> = {
	signature: "Signature",
	date: "Date",
	name: "Name",
	email: "Email",
	text: "Text",
};

function downloadUrl(input: {
	/** Prefer a pre-built URL (e.g. token-gated public sign document). */
	documentUrl?: string;
	documentFileId?: string;
	resourceType?: "contract" | "license";
	resourceId?: string;
}): string | null {
	if (input.documentUrl) return input.documentUrl;
	const params = new URLSearchParams();
	// Prefer resource id — download API resolves Files-collection ids → storage.
	if (input.resourceType === "contract" && input.resourceId) {
		params.set("contractId", input.resourceId);
		return `/api/files/download?${params.toString()}`;
	}
	if (input.documentFileId) {
		params.set("bucketFileId", input.documentFileId);
		params.set("fileId", input.documentFileId);
		return `/api/files/download?${params.toString()}`;
	}
	return null;
}

function fieldCaption(
	field: EsignField,
	signer: EsignRecipient | undefined,
): string {
	if (field.type === "signature" && field.value?.startsWith("data:image")) {
		return "";
	}
	if (field.type === "email") return signer?.email || FIELD_LABEL.email;
	if (field.type === "name") return signer?.name || FIELD_LABEL.name;
	if (field.type === "date") {
		return field.value && !field.value.startsWith("data:image")
			? field.value
			: "Date signed";
	}
	if (field.type === "text") {
		return field.value && !field.value.startsWith("data:image")
			? field.value
			: "Text";
	}
	return signer?.name || "Signature";
}

function percentPoint(
	clientX: number,
	clientY: number,
	pageEl: HTMLElement,
): { x: number; y: number } {
	const rect = pageEl.getBoundingClientRect();
	return {
		x: ((clientX - rect.left) / rect.width) * 100,
		y: ((clientY - rect.top) / rect.height) * 100,
	};
}

export function EsignDocumentPreview({
	documentTitle,
	documentUrl,
	documentFileId,
	resourceType,
	resourceId,
	fields,
	recipients,
	selectedFieldId,
	scrollToFieldToken,
	onPlaceField,
	onMoveField,
	onDeleteField,
	onFieldClick,
	onPdfReady,
}: {
	documentTitle?: string;
	/** Token-gated or other absolute/relative fetch URL; wins over file ids. */
	documentUrl?: string;
	documentFileId?: string;
	resourceType?: "contract" | "license";
	resourceId?: string;
	fields: EsignField[];
	recipients: EsignRecipient[];
	selectedFieldId?: string | null;
	/** Bump to re-scroll even when selectedFieldId is unchanged (Next Field). */
	scrollToFieldToken?: number;
	onPlaceField?: (page: number, x: number, y: number, type?: EsignFieldType) => void;
	onMoveField?: (fieldId: string, page: number, x: number, y: number) => void;
	onDeleteField?: (fieldId: string) => void;
	onFieldClick?: (field: EsignField) => void;
	onPdfReady?: (ok: boolean) => void;
}) {
	const [numPages, setNumPages] = useState(0);
	const [visiblePage, setVisiblePage] = useState(1);
	const [scale, setScale] = useState(1);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [viewerFile, setViewerFile] = useState<string | null>(null);
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const dragRef = useRef<{
		fieldId: string;
		page: number;
		offsetX: number;
		offsetY: number;
		width: number;
		height: number;
	} | null>(null);
	const movedRef = useRef(false);
	const url = downloadUrl({
		documentUrl,
		documentFileId,
		resourceType,
		resourceId,
	});
	const title = documentTitle?.trim() || "Document";

	useEffect(() => {
		if (!selectedFieldId || !viewerFile) return;
		const scroller = scrollRef.current;
		if (!scroller) return;
		// Wait a frame so field nodes exist after page paint.
		const frame = window.requestAnimationFrame(() => {
			const target = scroller.querySelector<HTMLElement>(
				`[data-esign-field="${CSS.escape(selectedFieldId)}"]`,
			);
			if (!target) return;
			target.scrollIntoView({
				behavior: "smooth",
				block: "center",
				inline: "nearest",
			});
			const pageAttr = target.closest("[data-esign-page]")?.getAttribute(
				"data-esign-page",
			);
			const pageNum = pageAttr ? Number(pageAttr) : NaN;
			if (Number.isFinite(pageNum) && pageNum > 0) setVisiblePage(pageNum);
		});
		return () => window.cancelAnimationFrame(frame);
	}, [selectedFieldId, scrollToFieldToken, viewerFile, numPages, scale]);

	useEffect(() => {
		if (!url) {
			setViewerFile(null);
			return;
		}
		let cancelled = false;
		let blobUrl: string | null = null;
		void (async () => {
			try {
				const response = await fetch(url, { credentials: "include" });
				if (!response.ok) throw new Error("download failed");
				const buffer = await response.arrayBuffer();
				if (cancelled) return;
				blobUrl = URL.createObjectURL(
					new Blob([buffer], { type: "application/octet-stream" }),
				);
				setViewerFile(blobUrl);
				setLoadError(null);
			} catch {
				if (!cancelled) {
					setViewerFile(null);
					setLoadError("Could not load the PDF preview.");
					onPdfReady?.(false);
				}
			}
		})();
		return () => {
			cancelled = true;
			if (blobUrl) URL.revokeObjectURL(blobUrl);
		};
	}, [url, onPdfReady]);

	const handleLoad = useCallback(
		({ numPages: count }: { numPages: number }) => {
			setNumPages(count);
			setVisiblePage(1);
			setLoadError(null);
			onPdfReady?.(true);
		},
		[onPdfReady],
	);

	useEffect(() => {
		const onPointerMove = (event: PointerEvent) => {
			const drag = dragRef.current;
			if (!drag || !onMoveField) return;
			const pageEl = document.querySelector<HTMLElement>(
				`[data-esign-page="${drag.page}"]`,
			);
			if (!pageEl) return;
			movedRef.current = true;
			const point = percentPoint(event.clientX, event.clientY, pageEl);
			const x = Math.min(
				100 - drag.width,
				Math.max(0, point.x - drag.offsetX),
			);
			const y = Math.min(
				100 - drag.height,
				Math.max(0, point.y - drag.offsetY),
			);
			onMoveField(drag.fieldId, drag.page, x, y);
		};
		const onPointerUp = () => {
			dragRef.current = null;
		};
		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", onPointerUp);
		return () => {
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerup", onPointerUp);
		};
	}, [onMoveField]);

	const pageLabel =
		numPages > 0 ? `Page ${visiblePage} of ${numPages}` : "—";

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
			<div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2">
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium sidebar-gradient-text">
						{title}
					</p>
					<p className="text-xs text-slate-500">{pageLabel}</p>
				</div>
				<div className="flex shrink-0 items-center gap-1">
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
					<span className="min-w-12 text-center text-xs text-slate-600 tabular-nums">
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
			{!url ? (
				<p className="p-6 text-sm text-slate-600">
					Document preview unavailable.
				</p>
			) : loadError ? (
				<p className="p-6 text-sm text-red">{loadError}</p>
			) : !viewerFile ? (
				<div className="flex flex-1 items-center justify-center">
					<LoadingSpinner size="md" label="Loading document..." />
				</div>
			) : (
				<div
					ref={scrollRef}
					className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4"
					onScroll={(event) => {
						const scroller = event.currentTarget;
						const pages = scroller.querySelectorAll<HTMLElement>(
							"[data-esign-page]",
						);
						if (pages.length === 0) return;
						const top = scroller.getBoundingClientRect().top;
						let best = 1;
						let bestDist = Number.POSITIVE_INFINITY;
						pages.forEach((node, index) => {
							const dist = Math.abs(node.getBoundingClientRect().top - top);
							if (dist < bestDist) {
								bestDist = dist;
								best = index + 1;
							}
						});
						setVisiblePage(best);
					}}
				>
					<Document
						file={viewerFile}
						onLoadSuccess={handleLoad}
						onLoadError={() => {
							setLoadError("Could not load the PDF preview.");
							onPdfReady?.(false);
						}}
						loading={
							<div className="flex justify-center py-12">
								<LoadingSpinner size="md" label="Loading document..." />
							</div>
						}
					>
						{Array.from({ length: numPages }, (_, index) => {
							const page = index + 1;
							const pageFields = fields.filter((field) => field.page === page);
							return (
								<div
									key={page}
									data-esign-page={page}
									className="relative mx-auto mb-6 w-fit overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"
									onDragOver={(event) => {
										if (
											!onPlaceField ||
											!event.dataTransfer.types.includes(ESIGN_FIELD_DRAG_TYPE)
										) {
											return;
										}
										event.preventDefault();
										event.dataTransfer.dropEffect = "copy";
									}}
									onDrop={(event) => {
										if (!onPlaceField) return;
										const type = event.dataTransfer.getData(
											ESIGN_FIELD_DRAG_TYPE,
										) as EsignFieldType;
										if (!type) return;
										event.preventDefault();
										const point = percentPoint(
											event.clientX,
											event.clientY,
											event.currentTarget,
										);
										onPlaceField(page, point.x, point.y, type);
									}}
									onClick={(event) => {
										if (!onPlaceField) return;
										const point = percentPoint(
											event.clientX,
											event.clientY,
											event.currentTarget,
										);
										onPlaceField(page, point.x, point.y);
									}}
								>
									<Page
										pageNumber={page}
										width={BASE_PAGE_WIDTH * scale}
										renderTextLayer={false}
										renderAnnotationLayer={false}
									/>
									{pageFields.map((field) => {
										const signer = recipients.find(
											(r) => r.id === field.recipientId,
										);
										const colors = getSignerColorWay(
											field.recipientId,
											recipients,
										);
										const selected = selectedFieldId === field.id;
										const caption = fieldCaption(field, signer);
										const showSignatureImage =
											field.type === "signature" &&
											Boolean(field.value?.startsWith("data:image"));
										return (
											<div
												key={field.id}
												data-esign-field={field.id}
												className={`absolute overflow-hidden rounded-md border px-2 py-0.5 text-xs transition-all duration-200 ${
													onMoveField
														? "cursor-grab active:cursor-grabbing"
														: "cursor-pointer"
												} ${selected ? "shadow-sm ring-2 ring-[#0f5384]/35" : ""}`}
												style={{
													left: `${field.x}%`,
													top: `${field.y}%`,
													width: `${field.width}%`,
													height: `${field.height}%`,
													borderColor: colors.border,
													backgroundColor: selected
														? colors.fillSelected
														: colors.fill,
													color: colors.text,
												}}
												onMouseEnter={(event) => {
													if (selected) return;
													event.currentTarget.style.backgroundColor =
														colors.fillSelected;
												}}
												onMouseLeave={(event) => {
													if (selected) return;
													event.currentTarget.style.backgroundColor =
														colors.fill;
												}}
												onPointerDown={(event) => {
													if (!onMoveField) return;
													event.preventDefault();
													event.stopPropagation();
													movedRef.current = false;
													const pageEl = event.currentTarget.parentElement;
													if (!pageEl) return;
													const point = percentPoint(
														event.clientX,
														event.clientY,
														pageEl,
													);
													dragRef.current = {
														fieldId: field.id,
														page,
														offsetX: point.x - field.x,
														offsetY: point.y - field.y,
														width: field.width,
														height: field.height,
													};
													onFieldClick?.(field);
													event.currentTarget.setPointerCapture(event.pointerId);
												}}
												onClick={(event) => {
													event.stopPropagation();
													if (movedRef.current) return;
													onFieldClick?.(field);
												}}
											>
												{showSignatureImage ? (
													<img
														src={field.value}
														alt="Signature"
														className="mx-auto block h-[92%] w-[96%] object-fill"
													/>
												) : field.type === "date" &&
													field.value &&
													!field.value.startsWith("data:image") ? (
													<div className="flex h-full min-h-0 items-center overflow-hidden pr-3">
														<p
															className="truncate text-sm font-normal leading-tight"
															style={{ color: colors.text }}
														>
															{caption}
														</p>
													</div>
												) : (
													<div className="flex h-full min-h-0 flex-col justify-center overflow-hidden pr-3">
														<p
															className="truncate text-[10px] font-semibold leading-tight"
															style={{ color: colors.text }}
														>
															{FIELD_LABEL[field.type]}
														</p>
														{caption ? (
															<p
																className="truncate text-[10px] leading-tight"
																style={{ color: colors.text, opacity: 0.8 }}
															>
																{caption}
															</p>
														) : null}
													</div>
												)}
												{onDeleteField ? (
													<button
														type="button"
														className="absolute top-0 right-0.5 text-slate-500 hover:text-red"
														aria-label="Remove field"
														onPointerDown={(event) => event.stopPropagation()}
														onClick={(event) => {
															event.stopPropagation();
															onDeleteField(field.id);
														}}
													>
														×
													</button>
												) : null}
											</div>
										);
									})}
								</div>
							);
						})}
					</Document>
				</div>
			)}
		</div>
	);
}
