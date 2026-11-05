"use client";

import { Loader2, Paperclip, Trash2, Upload, X } from "lucide-react";
import {
	forwardRef,
	type ReactNode,
	useCallback,
	useId,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	CAP_EVIDENCE_COMPACT_FILE_SLOTS,
	CAP_EVIDENCE_MAX_FILES,
	evidenceFileUrl,
	isImageMime,
} from "@/lib/audit-upload/cap-evidence";
import type { AuditCapEvidenceAttachment } from "@/lib/audit-upload/types";
import { caalmToast } from "@/lib/ui/caalm-toast";
import { cn } from "@/lib/utils";

type UploadJob = {
	localId: string;
	fileName: string;
	percent: number;
};

type StripSize = "sm" | "md" | "xl";
/** compact = Actions/dialog (4 + +n, centered); full = drawer (all names, paperclip). */
type StripLayout = "compact" | "full";

const TILE_SIZE: Record<StripSize, string> = {
	sm: "h-16 w-16",
	md: "h-24 w-24",
	xl: "h-32 w-32",
};

const TILE_COLUMN_WIDTH: Record<StripSize, string> = {
	sm: "w-16",
	md: "w-24",
	xl: "w-32",
};

const FILE_ICON_SIZE: Record<StripSize, string> = {
	sm: "h-8 w-8",
	md: "h-10 w-10",
	xl: "h-14 w-14",
};

const PROGRESS_ICON_SIZE: Record<StripSize, string> = {
	sm: "h-4 w-4",
	md: "h-5 w-5",
	xl: "h-6 w-6",
};

const ADD_ICON_SIZE: Record<StripSize, string> = {
	sm: "h-5 w-5",
	md: "h-6 w-6",
	xl: "h-8 w-8",
};

const TILE_BASE =
	"relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-600 transition duration-150";

const TILE_HOVER =
	"hover:border-[#078fab]/50 hover:ring-2 hover:ring-[#078fab]/20 hover:-translate-y-px";

function formatLabel(attachment: AuditCapEvidenceAttachment): string {
	const mime = attachment.mimeType.toLowerCase();
	const ext = attachment.fileName.split(".").pop()?.toLowerCase() ?? "";
	if (ext === "pdf" || mime.includes("pdf")) return "PDF";
	if (ext === "png" || mime.includes("png")) return "PNG";
	if (ext === "jpg" || ext === "jpeg" || mime.includes("jpeg")) return "JPG";
	if (ext === "webp" || mime.includes("webp")) return "WebP";
	if (ext === "gif" || mime.includes("gif")) return "GIF";
	if (ext === "txt" || mime.includes("text/plain")) return "TXT";
	if (ext === "docx" || ext === "doc" || mime.includes("word")) return "DOCX";
	if (
		ext === "csv" ||
		ext === "xls" ||
		ext === "xlsx" ||
		mime.includes("csv") ||
		mime.includes("spreadsheet") ||
		mime.includes("excel")
	) {
		return ext === "xls" || ext === "xlsx" ? ext.toUpperCase() : "CSV";
	}
	return ext && ext.length <= 5 ? ext.toUpperCase() : "File";
}

function displayName(fileName: string): string {
	const dot = fileName.lastIndexOf(".");
	if (dot <= 0) return fileName;
	return fileName.slice(0, dot);
}

function evidenceIconSrc(fileName: string, mimeType: string): string {
	const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
	const mime = mimeType.toLowerCase();
	if (ext === "pdf" || mime.includes("pdf"))
		return "/assets/icons/file-pdf.svg";
	if (ext === "txt" || mime.includes("text/plain")) {
		return "/assets/icons/file-txt.svg";
	}
	if (ext === "docx" || ext === "doc" || mime.includes("word")) {
		return "/assets/icons/file-docx.svg";
	}
	if (
		ext === "csv" ||
		ext === "xls" ||
		ext === "xlsx" ||
		mime.includes("spreadsheet") ||
		mime.includes("excel") ||
		mime.includes("csv")
	) {
		return "/assets/icons/file-csv.svg";
	}
	return "/assets/icons/file-other.svg";
}

function FileTypeThumb({
	attachment,
	capId,
	size,
	layout,
	canDelete,
	deleting,
	onOpen,
	onDelete,
}: {
	attachment: AuditCapEvidenceAttachment;
	capId: string;
	size: StripSize;
	layout: StripLayout;
	canDelete: boolean;
	deleting: boolean;
	onOpen: () => void;
	onDelete: () => void;
}) {
	const url = evidenceFileUrl(capId, attachment.fileId);
	const isImage = isImageMime(attachment.mimeType);
	const name = displayName(attachment.fileName);
	const format = formatLabel(attachment);
	const iconSrc = evidenceIconSrc(attachment.fileName, attachment.mimeType);
	const iconClass = FILE_ICON_SIZE[size];
	const tileWidth = layout === "full" ? "w-28" : TILE_COLUMN_WIDTH[size];

	return (
		<div
			className={cn("group relative flex min-w-0 flex-col gap-1", tileWidth)}
		>
			{canDelete ? (
				<button
					type="button"
					className={cn(
						"absolute -right-1.5 -top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full",
						"border border-slate-200 bg-white text-slate-500 shadow-sm",
						"opacity-0 transition-opacity duration-150 group-hover:opacity-100",
						"hover:border-red/30 hover:bg-red/10 hover:text-red",
						"focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#078fab]",
						deleting && "pointer-events-none opacity-60",
					)}
					aria-label={`Remove ${attachment.fileName}`}
					disabled={deleting}
					onClick={(event) => {
						event.stopPropagation();
						onDelete();
					}}
				>
					{deleting ? (
						<Loader2 className="h-3 w-3 animate-spin" aria-hidden />
					) : (
						<Trash2 className="h-3 w-3" aria-hidden />
					)}
				</button>
			) : null}
			<button
				type="button"
				className={cn(
					TILE_BASE,
					TILE_SIZE[size],
					TILE_HOVER,
					"w-full cursor-pointer",
				)}
				aria-label={`Open ${attachment.fileName}`}
				onClick={onOpen}
			>
				{isImage ? (
					// eslint-disable-next-line @next/next/no-img-element -- authenticated preview URL
					<img src={url} alt="" className="h-full w-full object-cover" />
				) : (
					// eslint-disable-next-line @next/next/no-img-element -- static asset icons
					<img
						src={iconSrc}
						alt=""
						aria-hidden
						className={cn(iconClass, "object-contain")}
					/>
				)}
			</button>
			<div className="min-w-0 px-0.5 text-center">
				<p
					className={cn(
						"text-[11px] font-medium leading-tight text-slate-700",
						layout === "compact" && "truncate",
						layout === "full" && "break-words whitespace-normal",
					)}
					title={layout === "compact" ? attachment.fileName : undefined}
				>
					{name}
				</p>
				<p
					className={cn(
						"text-[10px] font-semibold uppercase tracking-wide text-slate-500",
						layout === "compact" && "truncate",
					)}
				>
					{format}
				</p>
			</div>
		</div>
	);
}

function UploadProgressTile({
	job,
	size,
}: {
	job: UploadJob;
	size: StripSize;
}) {
	return (
		<div
			className={cn(
				TILE_BASE,
				TILE_SIZE[size],
				"flex-col gap-1.5 bg-slate-50 px-2",
			)}
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={job.percent}
			aria-label={`Uploading ${job.fileName}`}
		>
			<Loader2
				className={cn(
					"animate-spin text-[#078fab]",
					PROGRESS_ICON_SIZE[size],
				)}
				aria-hidden
			/>
			<div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
				<div
					className="h-full rounded-full bg-[#078fab] transition-[width] duration-150"
					style={{ width: `${job.percent}%` }}
				/>
			</div>
			<span className="text-[11px] font-semibold tabular-nums text-[#0f5384]">
				{job.percent}%
			</span>
		</div>
	);
}

/**
 * Horizontal CAP evidence row: file thumbs + upload square(s).
 */
function OverflowTile({
	overflowCount,
	totalCount,
	size,
	onViewAll,
}: {
	overflowCount: number;
	totalCount: number;
	size: StripSize;
	onViewAll?: () => void;
}) {
	return (
		<div className={cn("flex min-w-0 flex-col gap-1", TILE_COLUMN_WIDTH[size])}>
			<button
				type="button"
				className={cn(
					TILE_BASE,
					TILE_SIZE[size],
					TILE_HOVER,
					"w-full cursor-pointer border-dashed border-slate-300 bg-slate-50",
				)}
				aria-label={`View all ${totalCount} attachments`}
				onClick={() => onViewAll?.()}
			>
				<span className="flex flex-col items-center gap-0.5">
					<span className="text-sm font-semibold tabular-nums text-[#0f5384]">
						+{overflowCount}
					</span>
					<span className="text-[10px] font-medium text-slate-500">more</span>
				</span>
			</button>
			<div className="min-w-0 px-0.5 text-center">
				<p className="truncate text-[11px] font-semibold leading-tight text-[#0f5384]">
					View all
				</p>
				<p className="truncate text-[10px] font-medium text-slate-500">
					{totalCount} {totalCount === 1 ? "file" : "files"}
				</p>
			</div>
		</div>
	);
}

export type CapEvidenceStripHandle = {
	/** Opens the native file picker — for an external "Add" trigger when `hideAddTile` is set. */
	openFilePicker: () => void;
};

export const CapEvidenceStrip = forwardRef<
	CapEvidenceStripHandle,
	{
		capId: string;
		attachments: AuditCapEvidenceAttachment[];
		canUpload: boolean;
		canDelete?: boolean;
		onUploaded?: (attachments: AuditCapEvidenceAttachment[]) => void;
		onDeleted?: (attachments: AuditCapEvidenceAttachment[]) => void;
		/** Compact overflow: expand drawer + scroll to corrective action (no modal). */
		onViewAll?: () => void;
		children?: ReactNode;
		className?: string;
		size?: StripSize;
		layout?: StripLayout;
		maxFiles?: number;
		/** Suppress the inline dashed add tile — use with an external button calling openFilePicker via ref. */
		hideAddTile?: boolean;
		/**
		 * Compact layout only: how many file thumbs show before the overflow
		 * “+n more” tile. Defaults to CAP_EVIDENCE_COMPACT_FILE_SLOTS.
		 */
		compactFileSlots?: number;
	}
>(function CapEvidenceStrip(
	{
		capId,
		attachments,
		canUpload,
		canDelete = false,
		onUploaded,
		onDeleted,
		onViewAll,
		children,
		className,
		size = "sm",
		layout = "compact",
		maxFiles = CAP_EVIDENCE_MAX_FILES,
		hideAddTile = false,
		compactFileSlots = CAP_EVIDENCE_COMPACT_FILE_SLOTS,
	},
	ref,
) {
	const inputId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	useImperativeHandle(ref, () => ({
		openFilePicker: () => inputRef.current?.click(),
	}));
	const [jobs, setJobs] = useState<UploadJob[]>([]);
	const [preview, setPreview] = useState<AuditCapEvidenceAttachment | null>(
		null,
	);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const fileSlots = Math.max(1, compactFileSlots);
	const limit = Math.min(maxFiles, CAP_EVIDENCE_MAX_FILES);
	const atLimit = attachments.length + jobs.length >= limit;
	const filledSlots = attachments.length + jobs.length;
	/** Compact: Add thumb only while fewer than the in-view slot count. */
	const showUploadTile =
		canUpload &&
		!atLimit &&
		!hideAddTile &&
		(layout !== "compact" || filledSlots < fileSlots);

	const showOverflow =
		layout === "compact" && attachments.length > fileSlots;
	const visibleAttachments =
		layout === "full"
			? attachments
			: showOverflow
				? attachments.slice(0, fileSlots)
				: attachments;
	const overflowCount = showOverflow ? attachments.length - fileSlots : 0;
	/** Spec: compact grid with 0 files is not rendered (Add tile may still show). */
	const showFileGrid =
		layout === "full" || attachments.length > 0 || jobs.length > 0;

	const uploadFile = useCallback(
		(file: File) => {
			const localId = `${file.name}-${Date.now()}`;
			setJobs((prev) => [
				...prev,
				{ localId, fileName: file.name, percent: 0 },
			]);

			const formData = new FormData();
			formData.append("file", file);

			const xhr = new XMLHttpRequest();
			xhr.open("POST", `/api/audit/caps/${capId}/attachments`);
			xhr.upload.onprogress = (event) => {
				if (!event.lengthComputable) return;
				const percent = Math.min(
					99,
					Math.round((event.loaded / event.total) * 100),
				);
				setJobs((prev) =>
					prev.map((job) =>
						job.localId === localId ? { ...job, percent } : job,
					),
				);
			};
			xhr.onload = () => {
				setJobs((prev) => prev.filter((job) => job.localId !== localId));
				try {
					const json = JSON.parse(xhr.responseText) as {
						error?: string;
						data?: {
							attachment?: AuditCapEvidenceAttachment;
							cap?: { evidenceAttachments?: AuditCapEvidenceAttachment[] };
						};
					};
					if (xhr.status < 200 || xhr.status >= 300) {
						const detail = json.error?.trim() || "Could not attach that file.";
						caalmToast.base({
							tone: "error",
							title: "Upload failed",
							message:
								detail.toLowerCase() === "upload failed" ? undefined : detail,
						});
						return;
					}
					const next =
						json.data?.cap?.evidenceAttachments ??
						(json.data?.attachment
							? [...attachments, json.data.attachment]
							: attachments);
					onUploaded?.(next);
				} catch {
					caalmToast.base({
						tone: "error",
						title: "Upload failed",
						message: "Could not read the server response.",
					});
				}
			};
			xhr.onerror = () => {
				setJobs((prev) => prev.filter((job) => job.localId !== localId));
				caalmToast.base({
					tone: "error",
					title: "Upload failed",
					message: "Network error while uploading.",
				});
			};
			xhr.send(formData);
		},
		[attachments, capId, onUploaded],
	);

	const onPick = (files: FileList | null) => {
		if (!files?.length) return;
		let remaining = limit - attachments.length - jobs.length;
		for (const file of Array.from(files)) {
			if (remaining <= 0) break;
			uploadFile(file);
			remaining -= 1;
		}
		if (inputRef.current) inputRef.current.value = "";
	};

	const deleteAttachment = async (fileId: string) => {
		setDeletingId(fileId);
		try {
			const response = await fetch(
				`/api/audit/caps/${capId}/attachments/${fileId}`,
				{ method: "DELETE" },
			);
			const json = (await response.json()) as {
				error?: string;
				data?: { cap?: { evidenceAttachments?: AuditCapEvidenceAttachment[] } };
			};
			if (!response.ok) {
				caalmToast.base({
					tone: "error",
					title: "Could not remove file",
					message: json.error || "Try again.",
				});
				return;
			}
			const next =
				json.data?.cap?.evidenceAttachments ??
				attachments.filter((item) => item.fileId !== fileId);
			onDeleted?.(next);
			onUploaded?.(next);
			if (preview?.fileId === fileId) setPreview(null);
		} catch {
			caalmToast.base({
				tone: "error",
				title: "Could not remove file",
				message: "Network error while deleting.",
			});
		} finally {
			setDeletingId(null);
		}
	};

	const previewUrl = preview ? evidenceFileUrl(capId, preview.fileId) : null;

	const addIconClass = ADD_ICON_SIZE[size];

	return (
		<>
			{showFileGrid || showUploadTile ? (
				<div
					className={cn(
						"flex w-full flex-wrap items-start gap-3 justify-start",
						className,
					)}
				>
					{showFileGrid
						? visibleAttachments.map((attachment) => (
								<FileTypeThumb
									key={attachment.fileId}
									attachment={attachment}
									capId={capId}
									size={size}
									layout={layout}
									canDelete={canDelete}
									deleting={deletingId === attachment.fileId}
									onOpen={() => setPreview(attachment)}
									onDelete={() => void deleteAttachment(attachment.fileId)}
								/>
							))
						: null}
					{overflowCount > 0 ? (
						<OverflowTile
							overflowCount={overflowCount}
							totalCount={attachments.length}
							size={size}
							onViewAll={onViewAll}
						/>
					) : null}
					{jobs.map((job) => (
						<UploadProgressTile key={job.localId} job={job} size={size} />
					))}
					{showUploadTile ? (
						<label
							htmlFor={inputId}
							className={cn(
								TILE_BASE,
								TILE_SIZE[size],
								TILE_HOVER,
								"cursor-pointer border-dashed border-slate-300 bg-slate-50/80 text-[#078fab]",
							)}
						>
							<span className="flex flex-col items-center gap-1">
								{layout === "full" ? (
									<Paperclip className={addIconClass} aria-hidden />
								) : (
									<Upload className={addIconClass} aria-hidden />
								)}
								<span className="text-[10px] font-semibold uppercase tracking-wide">
									Add
								</span>
							</span>
						</label>
					) : null}
					{canUpload ? (
						<input
							ref={inputRef}
							id={inputId}
							type="file"
							accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.png,.jpg,.jpeg,.webp,.gif,.pdf"
							className="sr-only"
							multiple
							onChange={(event) => onPick(event.target.files)}
						/>
					) : null}
				</div>
			) : null}
			{children ? <div className="mt-2 w-full">{children}</div> : null}

			<Dialog
				open={Boolean(preview)}
				onOpenChange={(open) => {
					if (!open) setPreview(null);
				}}
			>
				<DialogContent
					className="max-h-[90vh] max-w-3xl overflow-hidden p-0"
					showCloseButton={false}
				>
					<div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
						<div className="min-w-0">
							<DialogTitle className="truncate text-sm font-semibold text-[#0f5384]">
								{preview?.fileName ?? "Attachment"}
							</DialogTitle>
							<DialogDescription className="sr-only">
								Preview of the attached evidence file
							</DialogDescription>
						</div>
						<button
							type="button"
							className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
							aria-label="Close dialog"
							onClick={() => setPreview(null)}
						>
							<X className="h-4 w-4" />
						</button>
					</div>
					<div className="flex max-h-[calc(90vh-3.5rem)] items-center justify-center bg-slate-50 p-4">
						{preview && previewUrl ? (
							isImageMime(preview.mimeType) ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									src={previewUrl}
									alt={preview.fileName}
									className="max-h-[70vh] max-w-full object-contain"
								/>
							) : (
								<iframe
									title={preview.fileName}
									src={previewUrl}
									className="h-[70vh] w-full rounded-md border border-slate-200 bg-white"
								/>
							)
						) : null}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
});
