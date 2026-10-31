/**
 * Step 1: File Upload for License Upload Form.
 * Mirrors ContractUploadForm.tsx's Step 1 dropzone exactly (same classes,
 * same "File ready" chip, same remove-file control). Saved drafts are no
 * longer shown here — resuming happens from the pre-type-selection
 * LicenseDraftsList screen, same as contracts.
 */

"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
	Check,
	CheckCircle2,
	FileText,
	Loader2,
	Upload,
	X,
} from "lucide-react";
import type { DragEvent } from "react";
import { type DropzoneOptions, useDropzone } from "react-dropzone";
import {
	DEMO_LICENSE_SAMPLE,
	DemoSampleDocumentDrop,
} from "@/components/demo/DemoSampleDocumentDrop";
import {
	handleDemoSampleDragOverCapture,
	handleDemoSampleDropCapture,
} from "@/components/demo/demoSampleDrag";
import { useToast } from "@/hooks/use-toast";
import {
	getEnterpriseDropzoneAccept,
	getEnterpriseFormatHint,
} from "@/lib/files/enterprise-file-formats";
import { cn } from "@/lib/utils";
import type { ProcessedFileData } from "../types";

interface Step1Props {
	processedFileData: ProcessedFileData | null;
	isExtracting: boolean;
	isUploading?: boolean;
	fileIngestUi: "hidden" | "progress" | "success";
	fileIngestProgress: number;
	onDrop: (files: File[]) => void;
	onRemoveFile: () => void;
}

export default function Step1FileUpload({
	processedFileData,
	isExtracting,
	isUploading,
	fileIngestUi,
	fileIngestProgress,
	onDrop,
	onRemoveFile,
}: Step1Props) {
	const { toast } = useToast();
	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: getEnterpriseDropzoneAccept("licensePrimary"),
		onDropRejected: () => {
			toast({
				variant: "destructive",
				title: "File type not allowed",
				description: `${getEnterpriseFormatHint("licensePrimary")} (Max 50MB)`,
			});
		},
		multiple: false,
	} as DropzoneOptions);

	// Demo sample drags lack native "Files" in dataTransfer; react-dropzone
	// ignores them. Override drop handlers so we ingest before dropzone skips.
	const {
		onDragOver: dropzoneDragOver,
		onDrop: dropzoneDrop,
		...dropzoneRootRest
	} = getRootProps();

	const rootProps = {
		...dropzoneRootRest,
		onDragOver: (event: DragEvent<HTMLElement>) => {
			if (handleDemoSampleDragOverCapture(event)) return;
			dropzoneDragOver?.(event);
		},
		onDrop: (event: DragEvent<HTMLElement>) => {
			if (handleDemoSampleDropCapture(event, onDrop)) return;
			dropzoneDrop?.(event);
		},
	};

	return (
		<div>
			<div className="mb-3.5 flex items-center gap-3">
				<h3 className="text-[13.5px] font-bold text-[#0f5384]">
					1. Upload License File
				</h3>
				<AnimatePresence mode="wait">
					{fileIngestUi === "progress" ? (
						<motion.div
							key="file-ingest-progress"
							initial={{ opacity: 0, x: -6 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, scale: 0.9 }}
							transition={{ duration: 0.2 }}
							className="flex min-w-0 items-center gap-2"
							aria-live="polite"
							aria-label={`Upload ${fileIngestProgress}% complete`}
						>
							<div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200 sm:w-28">
								<div
									className="h-full rounded-full bg-[#078FAB] transition-[width] duration-200 ease-out"
									style={{ width: `${fileIngestProgress}%` }}
								/>
							</div>
							<span className="tabular-nums text-xs font-medium text-slate-600">
								{fileIngestProgress}%
							</span>
						</motion.div>
					) : null}
					{fileIngestUi === "success" ? (
						<motion.div
							key="file-ingest-success"
							initial={{ opacity: 0, scale: 0.5 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.8 }}
							transition={{ type: "spring", stiffness: 420, damping: 18 }}
							className="flex items-center"
							aria-label="Upload complete"
						>
							<CheckCircle2 className="h-5 w-5 text-green" strokeWidth={2.25} />
						</motion.div>
					) : null}
				</AnimatePresence>
			</div>
			<div
				{...rootProps}
				className={cn(
					"flex flex-col items-center rounded-[14px] border-[1.5px] border-dashed border-[#078fab]/35 bg-[#078fab]/[.025] text-center transition-[border-color,background-color] duration-200",
					processedFileData
						? "cursor-default gap-3 px-6 py-5"
						: "cursor-pointer gap-4 px-6 py-8 hover:border-[#078fab]/60 hover:bg-[#078fab]/[.045]",
					isDragActive && "border-[#078fab]/60 bg-[#078fab]/[.045]",
				)}
			>
				<input {...getInputProps()} />

				{processedFileData ? (
					<>
						<span className="inline-flex items-center gap-1.5 rounded-full border border-[#078fab]/20 bg-[#078fab]/[.08] py-1 pl-1.5 pr-2.5 text-[11.5px] font-semibold text-[#078fab]">
							<Check className="h-3.5 w-3.5" aria-hidden />
							File ready
						</span>
						<div className="flex w-full max-w-[480px] items-center gap-3.5 rounded-xl border-[1.5px] border-[#078fab]/[.22] bg-white/80 px-4 py-3.5 text-left">
							<div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[9px] border border-[#078fab]/[.18] bg-[#078fab]/[.08]">
								<FileText
									className="h-[18px] w-[18px] text-[#078fab]"
									aria-hidden
								/>
							</div>
							<div className="min-w-0 flex-1">
								<p className="truncate text-[13px] font-semibold text-slate-700">
									{processedFileData.name}
								</p>
								<p className="text-[11px] text-slate-400">
									{(processedFileData.size / 1024 / 1024).toFixed(2)} MB ·{" "}
									{(
										processedFileData.name.split(".").pop() || "FILE"
									).toUpperCase()}
								</p>
							</div>
							<button
								type="button"
								onClick={(event) => {
									event.stopPropagation();
									onRemoveFile();
								}}
								disabled={isExtracting || isUploading}
								aria-label="Remove file"
								title="Remove file"
								className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[7px] text-slate-400 transition-colors duration-200 hover:bg-[#dc2626]/[.08] hover:text-[#dc2626] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dc2626] disabled:cursor-not-allowed disabled:opacity-50"
							>
								<X className="h-3.5 w-3.5" aria-hidden />
							</button>
						</div>
					</>
				) : (
					<>
						<div className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] border border-[#0f5384]/[.12] bg-[#0f5384]/[.06]">
							<Upload className="h-6 w-6 text-[#0f5384]/70" aria-hidden />
						</div>
						<p className="text-[13.5px] font-semibold text-slate-600">
							{isDragActive ? (
								"Drop the license file here"
							) : (
								<>
									<span className="text-[#078fab] underline">
										Click to upload
									</span>{" "}
									or drag &amp; drop here
								</>
							)}
						</p>
						<p className="text-[11.5px] text-slate-400">
							{getEnterpriseFormatHint("licensePrimary")} · up to 50 MB
						</p>
					</>
				)}

				{isExtracting && (
					<div className="flex items-center justify-center space-x-2">
						<Loader2 className="h-4 w-4 animate-spin text-[#078fab]" />
						<span className="text-sm text-slate-500">
							Extracting license data...
						</span>
					</div>
				)}
			</div>

			{!processedFileData ? (
				<DemoSampleDocumentDrop
					sample={DEMO_LICENSE_SAMPLE}
					disabled={isExtracting || isUploading}
					onUseSample={(file) => onDrop([file])}
					className="mt-4"
				/>
			) : null}
		</div>
	);
}
