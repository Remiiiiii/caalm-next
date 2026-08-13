"use client";

import {
	AlertTriangle,
	Building2,
	Calendar,
	ExternalLink,
	FileText,
	Hash,
	Loader2,
	Save,
	Users,
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import EntityPreviewSheetShell from "@/components/preview/EntityPreviewSheetShell";
import {
	DetailRow,
	PreviewFieldSelect,
	PreviewLabeledSelect,
	previewSectionClass,
	previewSectionHeaderClass,
} from "@/components/preview/previewSheetParts";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
	getLicenseDocumentUrl,
	getLicenseExpiryUrgency,
	isLicenseExpired,
} from "@/lib/licenses/licensesListUtils";
import {
	ensureSelectOption,
	formatEnumLabel,
	LICENSE_DIVISIONS,
	LICENSE_STATUSES,
	LICENSE_TYPES,
} from "@/lib/preview/dbFieldOptions";
import { cn } from "@/lib/utils";
import type { License } from "@/types/licenses";
import FormattedDateTime, { FormattedDate } from "../FormattedDateTime";

interface LicensePreviewSheetProps {
	license: License | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUpdated?: () => void;
}

function statusLabel(license: License): string {
	if (isLicenseExpired(license)) return "Expired";
	return (license.status || "unknown").replace(/-/g, " ");
}

function statusBannerClasses(license: License): string {
	if (isLicenseExpired(license)) {
		return "bg-red/10 text-red border-red/15";
	}
	switch (license.status) {
		case "active":
			return "bg-green/10 text-green border-green/15";
		case "pending-review":
			return "bg-orange/10 text-orange border-orange/15";
		case "action-required":
			return "bg-red/10 text-red border-red/15";
		default:
			return "bg-slate-100 text-slate-700 border-slate-200";
	}
}

function formatLicenseType(type?: string | null): string {
	if (!type) return "—";
	return type.replace(/_/g, " ");
}

type DraftFields = {
	division: string;
	licenseType: string;
	status: string;
};

export default function LicensePreviewSheet({
	license,
	open,
	onOpenChange,
	onUpdated,
}: LicensePreviewSheetProps) {
	const { toast } = useToast();
	const [draft, setDraft] = useState<DraftFields>({
		division: "",
		licenseType: "",
		status: "",
	});
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!license) return;
		setDraft({
			division: license.division || license.department || "",
			licenseType: license.licenseType || "",
			status: license.status || "",
		});
	}, [
		license?.$id,
		license?.division,
		license?.department,
		license?.licenseType,
		license?.status,
	]);

	const divisionOptions = useMemo(() => {
		const current = license?.division || license?.department;
		const values = LICENSE_DIVISIONS.map((d) => d.value);
		const merged = ensureSelectOption(values, current);
		return merged.map((value) => {
			const known = LICENSE_DIVISIONS.find((d) => d.value === value);
			return known ?? { value, label: formatEnumLabel(value) };
		});
	}, [license?.division, license?.department]);

	const typeOptions = useMemo(
		() => ensureSelectOption(LICENSE_TYPES, license?.licenseType),
		[license?.licenseType],
	);
	const statusOptions = useMemo(
		() => ensureSelectOption(LICENSE_STATUSES, license?.status),
		[license?.status],
	);

	if (!license) return null;

	const urgency = getLicenseExpiryUrgency(license);
	const title = license.licenseName || "Untitled License";
	const documentUrl = getLicenseDocumentUrl(license);
	const expiryDate = license.licenseExpiryDate || license.expirationDate;
	const issueDate = license.issueDate || license.purchaseDate;
	const assignees =
		Array.isArray(license.assignedManagers) &&
		license.assignedManagers.length > 0
			? license.assignedManagers.join(", ")
			: typeof license.assignedManagers === "string"
				? license.assignedManagers
				: null;

	const originalDivision = license.division || license.department || "";
	const canEditStatus =
		license.status !== "pending-review" && license.status !== "action-required";

	const isDirty =
		draft.division !== originalDivision ||
		draft.licenseType !== (license.licenseType || "") ||
		(canEditStatus && draft.status !== (license.status || ""));

	const handleSave = async () => {
		setSaving(true);
		try {
			const payload: Record<string, string> = {};
			if (draft.division !== originalDivision) {
				payload.division = draft.division;
				payload.department = draft.division;
			}
			if (draft.licenseType !== (license.licenseType || "")) {
				payload.licenseType = draft.licenseType;
			}
			if (
				canEditStatus &&
				draft.status !== (license.status || "") &&
				draft.status
			) {
				payload.status = draft.status;
			}

			const response = await fetch(`/api/licenses/${license.$id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				throw new Error(error.error || "Failed to update license");
			}

			toast({
				title: "License updated",
				description: "Ownership fields saved.",
			});
			onUpdated?.();
		} catch (error) {
			toast({
				title: "Save failed",
				description:
					error instanceof Error ? error.message : "Could not save changes.",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<EntityPreviewSheetShell
			open={open}
			onOpenChange={onOpenChange}
			title={title}
			description={
				<>
					{license.licenseNumber ? (
						<span className="inline-flex items-center gap-1 font-medium text-slate-700">
							<Hash className="h-3.5 w-3.5 text-slate-400" />
							{license.licenseNumber}
						</span>
					) : (
						<span>License summary</span>
					)}
					{license.licenseType ? (
						<>
							<span className="text-slate-300" aria-hidden>
								·
							</span>
							<span className="capitalize">
								{formatLicenseType(license.licenseType)}
							</span>
						</>
					) : null}
				</>
			}
			icon={FileText}
			statusBanner={
				<div
					className={cn(
						"border-b px-5 py-2.5 text-center text-xs font-semibold capitalize tracking-wide",
						statusBannerClasses(license),
					)}
				>
					{statusLabel(license)}
					{urgency !== "none" && urgency !== "expired" ? (
						<span className="font-medium"> · Expires in {urgency} days</span>
					) : null}
				</div>
			}
			footer={
				<div className="flex w-full flex-wrap items-center justify-between gap-2">
					<Button
						variant="outline"
						className="primary-btn cursor-pointer px-3 sm:px-4"
						onClick={() => onOpenChange(false)}
					>
						<X className="h-4 w-4" />
						Close
					</Button>
					<div className="flex flex-wrap items-center gap-2">
						{isDirty ? (
							<Button
								className="primary-btn cursor-pointer px-3 sm:px-4"
								disabled={saving}
								onClick={handleSave}
							>
								{saving ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Save className="h-4 w-4" />
								)}
								Save
							</Button>
						) : null}
						{documentUrl ? (
							<Button
								asChild
								className="primary-btn cursor-pointer px-3 sm:px-4"
							>
								<a href={documentUrl} target="_blank" rel="noopener noreferrer">
									<ExternalLink className="h-4 w-4" />
									Open document
								</a>
							</Button>
						) : null}
					</div>
				</div>
			}
		>
			<div className={cn(previewSectionClass, "p-4")}>
				<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
					Issuing authority
				</p>
				<p className="mt-1 text-lg font-bold tracking-tight text-slate-700">
					{license.issuingAuthority || "—"}
				</p>
				{license.vendor ? (
					<div className="mt-3 flex items-start gap-2 border-t border-white/50 pt-3">
						<Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0f5384]" />
						<div className="min-w-0">
							<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
								Vendor
							</p>
							<p className="mt-0.5 text-sm font-medium leading-snug text-slate-700">
								{license.vendor}
							</p>
						</div>
					</div>
				) : null}
			</div>

			<section className={cn(previewSectionClass, "overflow-hidden p-0")}>
				<div className={previewSectionHeaderClass}>
					<div className="flex items-center gap-2">
						<Calendar className="h-3.5 w-3.5 text-[#0f5384]" />
						<h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
							Timeline
						</h3>
					</div>
				</div>
				<div className="divide-y divide-white/45 px-4">
					<DetailRow label="Uploaded">
						{license.$createdAt ? (
							<FormattedDateTime
								date={license.$createdAt}
								className="body-2 font-medium text-slate-700"
							/>
						) : (
							"—"
						)}
					</DetailRow>
					<DetailRow label="Issued">
						{issueDate ? (
							<FormattedDate date={issueDate} className="body-2 font-medium" />
						) : (
							"—"
						)}
					</DetailRow>
					<DetailRow label="Expires">
						{expiryDate ? (
							<span
								className={cn(
									urgency !== "none" &&
										urgency !== "expired" &&
										"inline-flex items-center gap-1.5 text-orange",
									isLicenseExpired(license) && "text-red",
								)}
							>
								{(urgency !== "none" && urgency !== "expired") ||
								isLicenseExpired(license) ? (
									<AlertTriangle className="h-3.5 w-3.5 shrink-0" />
								) : null}
								<FormattedDate
									date={expiryDate}
									className="body-2 font-medium"
								/>
							</span>
						) : (
							"—"
						)}
					</DetailRow>
				</div>
			</section>

			<section className={cn(previewSectionClass, "overflow-hidden p-0")}>
				<div className={previewSectionHeaderClass}>
					<div className="flex items-center gap-2">
						<Users className="h-3.5 w-3.5 text-[#0f5384]" />
						<h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
							Ownership
						</h3>
					</div>
				</div>
				<div className="divide-y divide-white/45 px-4">
					<DetailRow label="Department">
						<PreviewLabeledSelect
							value={draft.division}
							onValueChange={(value) =>
								setDraft((prev) => ({ ...prev, division: value }))
							}
							options={divisionOptions}
						/>
					</DetailRow>
					<DetailRow label="Assignees">{assignees || "—"}</DetailRow>
					<DetailRow label="Type">
						<PreviewFieldSelect
							value={draft.licenseType}
							onValueChange={(value) =>
								setDraft((prev) => ({ ...prev, licenseType: value }))
							}
							options={typeOptions}
							formatLabel={formatEnumLabel}
						/>
					</DetailRow>
					{canEditStatus ? (
						<DetailRow label="Status">
							<PreviewFieldSelect
								value={draft.status}
								onValueChange={(value) =>
									setDraft((prev) => ({ ...prev, status: value }))
								}
								options={statusOptions}
								formatLabel={formatEnumLabel}
							/>
						</DetailRow>
					) : null}
				</div>
			</section>
		</EntityPreviewSheetShell>
	);
}
