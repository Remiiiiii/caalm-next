/**
 * Step 1: File Upload for License Upload Form
 */

"use client";

import {
	FileCheck,
	FileText,
	Loader2,
	StepForward,
	Trash2,
	Upload,
} from "lucide-react";
import { type DropzoneOptions, useDropzone } from "react-dropzone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { STEP_TITLES } from "../constants";
import type { Draft, ProcessedFileData } from "../types";

interface Step1Props {
	processedFileData: ProcessedFileData | null;
	isExtracting: boolean;
	savedDrafts: Draft[];
	onDrop: (files: File[]) => void;
	onResumeDraft: (draft: Draft) => void;
	onDeleteDraft: (draftId: string) => void;
}

export default function Step1FileUpload({
	processedFileData,
	isExtracting,
	savedDrafts,
	onDrop,
	onResumeDraft,
	onDeleteDraft,
}: Step1Props) {
	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"application/pdf": [".pdf"],
			"application/msword": [".doc"],
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document":
				[".docx"],
			"text/plain": [".txt"],
			"image/png": [".png"],
			"image/jpeg": [".jpg", ".jpeg"],
		},
		multiple: false,
	} as DropzoneOptions);

	return (
		<>
			{/* File Upload Card */}
			<Card className="border border-light-300 shadow-drop-1 rounded-xl bg-light-400/50">
				<CardHeader className="pb-4">
					<CardTitle className="text-lg font-semibold sidebar-gradient-text">
						1. Upload License File
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div
						{...getRootProps()}
						className={cn(
							"border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
							isDragActive
								? "border-brand bg-brand/5"
								: "border-light-200 hover:border-[#03B1C1] hover:bg-light-400",
						)}
					>
						<input {...getInputProps()} />
						<Upload className="mx-auto h-12 w-12 text-light-200 mb-4" />

						{processedFileData ? (
							<div className="space-y-2">
								<div className="flex items-center justify-center space-x-2">
									<FileText className="h-5 w-5 text-green" />
									<span className="font-medium text-navy">
										{processedFileData.name}
									</span>
								</div>
								<p className="text-sm text-light-200">
									{(processedFileData.size / 1024 / 1024).toFixed(2)} MB
								</p>
							</div>
						) : (
							<div>
								<p className="text-lg font-medium text-navy">
									{isDragActive
										? "Drop the license file here"
										: "Drag & drop license file here"}
								</p>
								<p className="text-sm text-light-200 mt-2">
									Supports PDF, DOC, DOCX, TXT, PNG, JPG (Max 50MB)
								</p>
							</div>
						)}

						{isExtracting && (
							<div className="mt-4 flex items-center justify-center space-x-2">
								<Loader2 className="h-4 w-4 animate-spin text-brand" />
								<span className="text-sm text-light-200">
									Extracting license data...
								</span>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Saved Drafts List */}
			{savedDrafts.length > 0 && (
				<Card className="border border-slate-200 shadow-sm rounded-lg bg-slate-50">
					<CardHeader className="pb-3">
						<CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
							<FileCheck className="h-4 w-4 text-green" />
							Saved Progress ({savedDrafts.length})
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{savedDrafts.map((draft) => {
								const formData =
									typeof draft.formData === "string"
										? JSON.parse(draft.formData)
										: draft.formData;

								return (
									<div
										key={draft.$id}
										className="flex items-center justify-between p-3 bg-white rounded-md border border-slate-200 hover:border-slate-300 transition-colors"
									>
										<div className="flex-1">
											<h3 className="text-sm font-medium text-slate-700 mb-1 max-w-[600px]">
												{formData?.licenseName || "Untitled License"}
											</h3>
											<div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
												<span>
													Step {draft.currentStep}:{" "}
													{STEP_TITLES[draft.currentStep - 1]}
												</span>
												<span>•</span>
												<span>
													Saved{" "}
													{new Date(draft.lastSavedAt).toLocaleDateString()}
												</span>
											</div>
											<Badge
												variant="outline"
												className="text-xs bg-green/10 text-green border-green/20 w-fit px-2.5 py-0.5"
											>
												{draft.progressPercentage}% Complete
											</Badge>
										</div>
										<div className="flex items-center gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() => onResumeDraft(draft)}
												className="primary-btn sm:px-4 px-3 shimmer-hover"
											>
												<StepForward className="h-3 w-3" />
												Resume
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => onDeleteDraft(draft.$id)}
												className="primary-btn h-8 px-3"
											>
												<Trash2 className="h-3 w-3" />
												Delete
											</Button>
										</div>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>
			)}
		</>
	);
}
