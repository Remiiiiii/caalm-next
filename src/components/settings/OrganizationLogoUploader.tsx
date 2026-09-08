"use client";

import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useStepUp } from "@/contexts/StepUpContext";
import { useToast } from "@/hooks/use-toast";
import {
	getOrgLogoUrl,
	ORG_LOGO_MAX_BYTES,
} from "@/lib/organizations/org-logo";

interface OrganizationLogoUploaderProps {
	orgId: string;
	logoFileId?: string | null;
	canEdit: boolean;
	onChanged: () => Promise<void> | void;
}

export function OrganizationLogoUploader({
	orgId,
	logoFileId,
	canEdit,
	onChanged,
}: OrganizationLogoUploaderProps) {
	const { toast } = useToast();
	const { ensureStepUp } = useStepUp();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(
		() => getOrgLogoUrl(logoFileId) || null,
	);

	useEffect(() => {
		setPreviewUrl(getOrgLogoUrl(logoFileId) || null);
	}, [logoFileId]);

	const logoUrl = previewUrl;

	const handleFileChange = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (!file || !canEdit) return;

		if (!file.type.startsWith("image/")) {
			toast({
				title: "Invalid file type",
				description: "Choose a PNG, JPG, GIF, WebP, or SVG image.",
				variant: "destructive",
			});
			return;
		}

		if (file.size > ORG_LOGO_MAX_BYTES) {
			toast({
				title: "File too large",
				description: "Logo must be 5 MB or smaller.",
				variant: "destructive",
			});
			return;
		}

		setUploading(true);
		if (!(await ensureStepUp())) {
			setUploading(false);
			return;
		}
		try {
			const formData = new FormData();
			formData.append("file", file);

			const response = await fetch(
				`/api/organizations/logo?orgId=${encodeURIComponent(orgId)}`,
				{ method: "POST", body: formData },
			);
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(
					typeof body.error === "string" ? body.error : "Upload failed",
				);
			}

			setPreviewUrl(
				typeof body.imageUrl === "string"
					? body.imageUrl
					: getOrgLogoUrl(body.fileId),
			);
			await onChanged();
			toast({ title: "Company logo uploaded" });
		} catch (error) {
			toast({
				title: "Could not upload logo",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const handleRemove = async () => {
		if (!canEdit) return;
		if (!(await ensureStepUp())) return;
		setUploading(true);
		try {
			const response = await fetch(
				`/api/organizations/logo?orgId=${encodeURIComponent(orgId)}`,
				{ method: "DELETE" },
			);
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(
					typeof body.error === "string" ? body.error : "Remove failed",
				);
			}
			setPreviewUrl(null);
			await onChanged();
			toast({ title: "Company logo removed" });
		} catch (error) {
			toast({
				title: "Could not remove logo",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setUploading(false);
		}
	};

	return (
		<div className="space-y-2 min-w-0">
			<div className="flex items-center gap-2">
				<Label htmlFor="org-logo-upload" className="text-sm font-medium text-slate-700">
					Company logo
				</Label>
				<span className="text-xs text-slate-500">Optional</span>
			</div>
			{/* Left preview → right copy + actions (matches wireframe stack) */}
			<div className="flex items-start gap-4 min-w-0">
				<div
					className={
						logoUrl
							? "flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border-[0.25px] border-slate-300 bg-white"
							: "flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50"
					}
				>
					{logoUrl ? (
						// Appwrite view URL includes query params; plain img matches ProfilePicture.
						<img
							src={logoUrl}
							alt="Organization logo"
							className="h-full w-full object-contain p-1"
						/>
					) : (
						<ImagePlus className="h-8 w-8 text-slate-400" aria-hidden />
					)}
				</div>
				<div className="min-w-0 flex-1 space-y-2">
					<p className="text-sm text-slate-600">
						Shown in the letterhead of agreements you create.{" "}
						<span className="text-slate-500">
							PNG, JPG, GIF, WebP, or SVG · max 5 MB
						</span>
					</p>
					{canEdit ? (
						<div className="flex flex-wrap items-center gap-3">
							<input
								ref={fileInputRef}
								id="org-logo-upload"
								type="file"
								accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
								className="sr-only"
								disabled={uploading}
								onChange={handleFileChange}
							/>
							<Button
								type="button"
								className="btn-primary px-3 sm:px-4 cursor-pointer"
								disabled={uploading}
								onClick={() => fileInputRef.current?.click()}
							>
								<Upload className="h-4 w-4" />
								{logoUrl ? "Replace logo" : "Upload logo"}
							</Button>
							{logoUrl ? (
								<Button
									type="button"
									className="delete-btn px-3 sm:px-4 cursor-pointer"
									disabled={uploading}
									onClick={handleRemove}
								>
									<Trash2 className="h-4 w-4" />
									Remove
								</Button>
							) : null}
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
