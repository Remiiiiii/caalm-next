"use client";

import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";
import { AnimatePresence, motion } from "framer-motion";
import {
	Ban,
	Check,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	ClipboardCheck,
	FileText,
	Loader2,
	Upload,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { type DropzoneOptions, useDropzone } from "react-dropzone";
import useSWR from "swr";
import { AuditUploadProgressCard } from "@/components/audit-upload/AuditUploadProgressCard";
import StepIndicator from "@/components/license-upload/components/StepIndicator";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import type {
	AuditDocumentRecord,
	AuditFindingRecord,
	ProcessingLogEntry,
} from "@/lib/audit-upload/types";
import { fetcher } from "@/lib/swr-config";
import { DIALOG_BACK_LINK_CLASS, HEADER_BADGE_CLASS } from "@/lib/ui/modal-styles";
import { caalmToast } from "@/lib/ui/caalm-toast";
import { cn } from "@/lib/utils";

export interface AuditUploadFormProps {
	ownerId: string;
	accountId: string;
	iconOnly?: boolean;
	active?: boolean;
	onTriggerClick?: () => void;
	onSuccess?: () => void;
	className?: string;
	/** Controlled dialog open (e.g. list page + secondary upload prompt). */
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	triggerLabel?: string;
	triggerVariant?: "primary" | "secondary" | "none";
}

const STEP_TITLES = ["Upload File", "Analysis", "Review"];
const SEVERITY_BADGE = {
	critical: "bg-red/10 text-red border-red/20",
	high: "bg-orange/10 text-orange border-orange/20",
	medium: "bg-[#e1f3ff] text-[#0f5384] border-[#a0c4db]",
	low: "bg-green/10 text-green border-green/20",
	informational: "bg-slate-100 text-slate-600 border-slate-200",
} as const;
const AUDIT_ACCEPT = {
	"application/pdf": [".pdf"],
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
		".docx",
	],
	"application/msword": [".doc"],
	"text/plain": [".txt"],
	"text/markdown": [".md"],
};

type DocumentPayload = {
	document?: AuditDocumentRecord;
	findings?: AuditFindingRecord[];
};

function resetWizardState(
	setters: Array<() => void>,
) {
	for (const reset of setters) reset();
}

export default function AuditUploadForm({
	iconOnly,
	active,
	onTriggerClick,
	onSuccess,
	className,
	open: controlledOpen,
	onOpenChange,
	triggerLabel = "Upload audit",
	triggerVariant = "primary",
}: AuditUploadFormProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [internalOpen, setInternalOpen] = useState(false);
	const isControlled = controlledOpen !== undefined;
	const open = isControlled ? controlledOpen : internalOpen;
	const setOpen = (next: boolean) => {
		if (!isControlled) setInternalOpen(next);
		onOpenChange?.(next);
	};
	const [currentStep, setCurrentStep] = useState(1);
	const [uploading, setUploading] = useState(false);
	const [documentId, setDocumentId] = useState<string | null>(null);
	const [fileReady, setFileReady] = useState<{
		name: string;
		size: number;
	} | null>(null);
	const [fileIngestUi, setFileIngestUi] = useState<
		"hidden" | "progress" | "success"
	>("hidden");
	const [fileIngestProgress, setFileIngestProgress] = useState(0);

	const { data } = useSWR<DocumentPayload>(
		documentId ? `/api/audit/documents/${documentId}` : null,
		async (url: string) => {
			const json = await fetcher(url);
			return json?.data ?? json;
		},
		{ refreshInterval: documentId && currentStep === 2 ? 2500 : 0 },
	);

	const document = data?.document;
	const findings = data?.findings ?? [];
	const status = document?.status;
	const processingLog: ProcessingLogEntry[] = document?.processingLog ?? [];

	const clearWizard = useCallback(() => {
		resetWizardState([
			() => setCurrentStep(1),
			() => setUploading(false),
			() => setDocumentId(null),
			() => setFileReady(null),
			() => setFileIngestUi("hidden"),
			() => setFileIngestProgress(0),
		]);
	}, []);

	useEffect(() => {
		if (!documentId || !status) return;
		if (status === "complete" && currentStep === 2) {
			caalmToast.base({
				tone: "success",
				title: "Audit analysis complete",
				message: "Review the findings before they become official.",
			});
			onSuccess?.();
		}
		if (status === "failed") {
			caalmToast.base({
				tone: "danger",
				title: "Audit analysis failed",
				message: document?.errorMessage || "Try the file again.",
			});
		}
	}, [currentStep, document?.errorMessage, documentId, onSuccess, status]);

	const uploadFile = useCallback(
		async (file: File) => {
			setUploading(true);
			setFileIngestUi("progress");
			setFileIngestProgress(18);
			const tick = window.setInterval(() => {
				setFileIngestProgress((value) => Math.min(value + 12, 86));
			}, 180);
			try {
				const form = new FormData();
				form.append("file", file);
				const response = await fetch("/api/audit/upload", {
					method: "POST",
					body: form,
				});
				const json = await response.json();
				if (!response.ok) {
					throw new Error(json.error || "Upload failed");
				}
				const id = json.data?.document?.$id as string | undefined;
				if (!id) throw new Error("No document id returned");
				setDocumentId(id);
				setFileReady({ name: file.name, size: file.size });
				setFileIngestProgress(100);
				setFileIngestUi("success");
				window.setTimeout(() => setFileIngestUi("hidden"), 1400);
				if (json.duplicate) {
					toast({
						title: "File already uploaded",
						description: "Opening the saved report.",
					});
				}
			} catch (error) {
				setFileIngestUi("hidden");
				caalmToast.base({
					tone: "danger",
					title: "Could not upload audit",
					message: error instanceof Error ? error.message : "Try again.",
				});
			} finally {
				window.clearInterval(tick);
				setUploading(false);
			}
		},
		[toast],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop: (files) => {
			const file = files[0];
			if (file) void uploadFile(file);
		},
		accept: AUDIT_ACCEPT,
		onDropRejected: () => {
			toast({
				variant: "destructive",
				title: "File type not allowed",
				description: "Supports PDF, Word, TXT, MD · up to 25 MB",
			});
		},
		multiple: false,
		disabled: uploading || Boolean(fileReady),
	} as DropzoneOptions);

	const goToStep = (step: number) => {
		if (step === 1) setCurrentStep(1);
		if (step === 2 && fileReady) setCurrentStep(2);
		if (step === 3 && status === "complete") setCurrentStep(3);
	};

	const handleOpenChange = (next: boolean) => {
		if (!next) {
			clearWizard();
		}
		setOpen(next);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{iconOnly ? (
				<TooltipProvider delayDuration={300}>
					<Tooltip>
						<TooltipTrigger asChild>
							<DialogTrigger asChild>
								<button
									type="button"
									className={cn(
										"segmented-toggle-item px-2.5",
										active && "segmented-toggle-item-active",
										className,
									)}
									aria-label="Upload Audit"
									onClick={onTriggerClick}
								>
									<ClipboardCheck className="h-4 w-4 shrink-0" aria-hidden />
								</button>
							</DialogTrigger>
						</TooltipTrigger>
						<TooltipContent className="text-xs">Upload Audit</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			) : triggerVariant !== "none" ? (
				<DialogTrigger asChild>
					<Button
						type="button"
						className={cn(
							triggerVariant === "secondary"
								? "h-9 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
								: "primary-btn",
						)}
						onClick={onTriggerClick}
					>
						<Upload className="h-4 w-4" />
						{triggerLabel}
					</Button>
				</DialogTrigger>
			) : null}
			<DialogContent className="glass-dialog flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-6xl">
				<VisuallyHiddenPrimitive.Root>
					<DialogTitle>Upload Audit</DialogTitle>
					<DialogDescription>
						Upload an audit report, then review drafted findings.
					</DialogDescription>
				</VisuallyHiddenPrimitive.Root>

				<div className="sticky top-0 z-10 shrink-0 border-b border-slate-200 bg-white/50 py-4 backdrop-blur-xl">
					<div className="px-6">
						<div className="mb-2 flex h-8 items-center pr-10">
							{currentStep > 1 ? (
								<button
									type="button"
									onClick={() => setCurrentStep((step) => Math.max(1, step - 1))}
									disabled={uploading}
									className={DIALOG_BACK_LINK_CLASS}
								>
									<ChevronLeft className="h-[15px] w-[15px]" aria-hidden />
									Previous
								</button>
							) : null}
						</div>
						<div className="mb-3 flex items-start justify-between gap-3">
							<div className="flex min-w-0 items-start gap-[11px]">
								<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#0f5384]/15 bg-white">
									<Upload
										className="h-[18px] w-[18px] text-[#0f5384]"
										aria-hidden
									/>
								</div>
								<div className="min-w-0">
									<h2 className="text-[17px] font-bold leading-tight tracking-tight text-[#0f5384]">
										Upload Audit
									</h2>
									<p className="mt-0.5 text-xs text-slate-500">
										Step {currentStep} of {STEP_TITLES.length} ·{" "}
										{STEP_TITLES[currentStep - 1]}
									</p>
								</div>
							</div>
							{status ? (
								<span
									className={cn(
										HEADER_BADGE_CLASS,
										status === "complete"
											? "border-green/20 text-green"
											: status === "failed"
												? "border-red/20 text-red"
												: "border-slate-300 text-slate-600",
									)}
								>
									{status.replaceAll("_", " ")}
								</span>
							) : null}
						</div>
						<div className="-mx-6 h-[3px] overflow-hidden bg-slate-100">
							<div
								className="h-full rounded-[0_99px_99px_0] bg-[linear-gradient(90deg,#00c1cb,#078fab,#0e638f)] transition-[width] duration-300 ease-out"
								style={{
									width: `${(currentStep / STEP_TITLES.length) * 100}%`,
								}}
							/>
						</div>
						<div className="mt-3">
							<StepIndicator
								currentStep={currentStep}
								stepTitles={STEP_TITLES}
								onGoToStep={goToStep}
								processedFileData={fileReady}
							/>
						</div>
					</div>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto bg-transparent p-4">
					{currentStep === 1 ? (
						<div>
							<div className="mb-3.5 flex items-center gap-3">
								<h3 className="text-[13.5px] font-bold text-[#0f5384]">
									1. Upload Audit File
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
											className="flex items-center"
										>
											<CheckCircle2
												className="h-5 w-5 text-green"
												strokeWidth={2.25}
											/>
										</motion.div>
									) : null}
								</AnimatePresence>
							</div>
							<div
								{...getRootProps()}
								className={cn(
									"flex flex-col items-center rounded-[14px] border-[1.5px] border-dashed border-[#078fab]/35 bg-[#078fab]/[.025] text-center transition-[border-color,background-color] duration-200",
									fileReady
										? "cursor-default gap-3 px-6 py-5"
										: "cursor-pointer gap-4 px-6 py-8 hover:border-[#078fab]/60 hover:bg-[#078fab]/[.045]",
									isDragActive && "border-[#078fab]/60 bg-[#078fab]/[.045]",
								)}
							>
								<input {...getInputProps()} />
								{fileReady ? (
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
													{fileReady.name}
												</p>
												<p className="text-[11px] text-slate-400">
													{(fileReady.size / 1024 / 1024).toFixed(2)} MB ·{" "}
													{(fileReady.name.split(".").pop() || "FILE").toUpperCase()}
												</p>
											</div>
											<button
												type="button"
												onClick={(event) => {
													event.stopPropagation();
													setFileReady(null);
													setDocumentId(null);
												}}
												disabled={uploading}
												aria-label="Remove file"
												className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[7px] text-slate-400 transition-colors duration-200 hover:bg-[#dc2626]/[.08] hover:text-[#dc2626] disabled:opacity-50"
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
												"Drop the audit file here"
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
											Supports PDF, Word, TXT, MD · up to 25 MB
										</p>
									</>
								)}
							</div>
						</div>
					) : null}

					{currentStep === 2 ? (
						<AuditUploadProgressCard
							log={processingLog}
							fileName={fileReady?.name}
							failed={status === "failed"}
							uploadComplete={Boolean(fileReady || documentId)}
						/>
					) : null}

					{currentStep === 3 ? (
						<div className="space-y-4">
							<div className="rounded-lg border border-blue-200 bg-blue-50/80 px-4 py-3">
								<p className="text-sm font-medium text-slate-700">
									Review before confirming
								</p>
								<p className="mt-1 text-xs text-slate-600">
									{document?.summary ||
										"Open the full findings page to confirm or dispute each item."}
								</p>
							</div>
							<div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
								<div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
									<h3 className="text-sm font-semibold sidebar-gradient-text">
										Draft findings
									</h3>
								</div>
								{findings.length === 0 ? (
									<p className="px-4 py-3 text-sm text-slate-500">
										No findings were extracted.
									</p>
								) : (
									<ul className="divide-y divide-slate-100">
										{findings.slice(0, 8).map((finding) => (
											<li
												key={finding.$id}
												className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm"
											>
												<span className="font-medium text-slate-700">
													{finding.findingCode
														? `${finding.findingCode} · ${finding.title}`
														: finding.title}
												</span>
												<span className="inline-flex shrink-0 items-center gap-2">
													<span
														className={cn(
															"inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
															SEVERITY_BADGE[finding.severityComputed],
														)}
													>
														{finding.severityComputed}
													</span>
													<span className="text-slate-500">
														risk {finding.riskScore}
													</span>
												</span>
											</li>
										))}
									</ul>
								)}
							</div>
							{status === "complete" ? (
								<div className="flex items-center gap-2 text-xs text-green">
									<CheckCircle2 className="h-4 w-4" />
									Ready to open findings for confirm or dispute
								</div>
							) : null}
						</div>
					) : null}
				</div>

				<div className="sticky bottom-0 z-10 shrink-0 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
					<div className="flex items-center justify-between">
						<Button
							type="button"
							variant="ghost"
							onClick={() => handleOpenChange(false)}
							disabled={uploading}
							className="h-[1.65rem] justify-center rounded-full px-3 py-1.5 text-slate-400 hover:bg-black/[.04] hover:text-slate-600"
						>
							<Ban className="h-4 w-4" />
							Cancel
						</Button>
						<div className="flex items-center gap-2">
							{currentStep < 3 ? (
								<Button
									type="button"
									onClick={() => setCurrentStep((step) => step + 1)}
									disabled={
										(currentStep === 1 && !fileReady) ||
										(currentStep === 2 && status !== "complete") ||
										uploading
									}
									className="primary-btn flex items-center gap-2"
								>
									{currentStep === 2 && status !== "complete" ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin" />
											Analyzing…
										</>
									) : (
										<>
											Next
											<ChevronRight className="h-4 w-4" />
										</>
									)}
								</Button>
							) : (
								<Button
									type="button"
									className="primary-btn min-w-[120px]"
									disabled={!documentId}
									onClick={() => {
										if (!documentId) return;
										handleOpenChange(false);
										router.push(`/audits/upload/${documentId}`);
									}}
								>
									<ClipboardCheck className="h-4 w-4" />
									Open findings
								</Button>
							)}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
