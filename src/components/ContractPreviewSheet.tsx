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
import FormattedDateTime, {
	FormattedDate,
} from "@/components/FormattedDateTime";
import EntityPreviewSheetShell from "@/components/preview/EntityPreviewSheetShell";
import {
	DetailRow,
	PreviewFieldSelect,
	previewSectionClass,
	previewSectionHeaderClass,
} from "@/components/preview/previewSheetParts";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { updateContractPreviewFields } from "@/lib/actions/file.actions";
import {
	getExpiryUrgency,
	isContractExpired,
} from "@/lib/contracts/contractsListUtils";
import {
	CONTRACT_DEPARTMENTS,
	CONTRACT_STATUSES,
	CONTRACT_TYPES,
	ensureSelectOption,
	formatEnumLabel,
} from "@/lib/preview/dbFieldOptions";
import { cn } from "@/lib/utils";
import type { UIFileDoc } from "@/types/files";

interface ContractPreviewSheetProps {
	file: UIFileDoc | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUpdated?: () => void;
}

function statusLabel(file: UIFileDoc): string {
	if (isContractExpired(file)) return "Expired";
	return (file.status || "unknown").replace(/-/g, " ");
}

function statusBannerClasses(file: UIFileDoc): string {
	if (isContractExpired(file)) {
		return "bg-red/10 text-red border-red/15";
	}
	switch (file.status) {
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

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);
}

function formatContractType(type?: string | null): string {
	if (!type) return "—";
	return type.replace(/_/g, " ");
}

type DraftFields = {
	department: string;
	contractType: string;
	status: string;
};

export default function ContractPreviewSheet({
	file,
	open,
	onOpenChange,
	onUpdated,
}: ContractPreviewSheetProps) {
	const { toast } = useToast();
	const [draft, setDraft] = useState<DraftFields>({
		department: "",
		contractType: "",
		status: "",
	});
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!file) return;
		setDraft({
			department: file.department || "",
			contractType: file.contractType || "",
			status: file.status || "",
		});
	}, [file?.$id, file?.department, file?.contractType, file?.status]);

	const departmentOptions = useMemo(
		() => ensureSelectOption(CONTRACT_DEPARTMENTS, file?.department),
		[file?.department],
	);
	const typeOptions = useMemo(
		() => ensureSelectOption(CONTRACT_TYPES, file?.contractType),
		[file?.contractType],
	);
	const statusOptions = useMemo(
		() => ensureSelectOption(CONTRACT_STATUSES, file?.status),
		[file?.status],
	);

	if (!file) return null;

	const urgency = getExpiryUrgency(file);
	const title = file.contractName || file.name || "Untitled Contract";
	const amountValue =
		file.amount != null && Number.isFinite(Number(file.amount))
			? Number(file.amount)
			: null;
	const assignees =
		Array.isArray(file.assignedManagers) && file.assignedManagers.length > 0
			? file.assignedManagers.join(", ")
			: null;

	const canEditStatus =
		file.status !== "pending-review" && file.status !== "action-required";

	const isDirty =
		draft.department !== (file.department || "") ||
		draft.contractType !== (file.contractType || "") ||
		(canEditStatus && draft.status !== (file.status || ""));

	const handleSave = async () => {
		const documentId = file.contractId || file.$id;
		setSaving(true);
		try {
			const payload: {
				department?: string;
				contractType?: string;
				status?: string;
			} = {};
			if (draft.department !== (file.department || "")) {
				payload.department = draft.department;
			}
			if (draft.contractType !== (file.contractType || "")) {
				payload.contractType = draft.contractType;
			}
			if (
				canEditStatus &&
				draft.status !== (file.status || "") &&
				draft.status
			) {
				payload.status = draft.status;
			}

			await updateContractPreviewFields(documentId, payload);
			toast({
				title: "Contract updated",
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
					{file.contractNumber ? (
						<span className="inline-flex items-center gap-1 font-medium text-slate-700">
							<Hash className="h-3.5 w-3.5 text-slate-400" />
							{file.contractNumber}
						</span>
					) : (
						<span>Contract summary</span>
					)}
					{file.contractType ? (
						<>
							<span className="text-slate-300" aria-hidden>
								·
							</span>
							<span className="capitalize">
								{formatContractType(file.contractType)}
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
						statusBannerClasses(file),
					)}
				>
					{statusLabel(file)}
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
						{file.url ? (
							<Button
								asChild
								className="primary-btn cursor-pointer px-3 sm:px-4"
							>
								<a href={file.url} target="_blank" rel="noopener noreferrer">
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
					Contract value
				</p>
				<p className="mt-1 text-2xl font-bold tracking-tight text-slate-700">
					{amountValue != null ? formatCurrency(amountValue) : "—"}
				</p>
				{file.vendor ? (
					<div className="mt-3 flex items-start gap-2 border-t border-white/50 pt-3">
						<Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0f5384]" />
						<div className="min-w-0">
							<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
								Vendor / counterparty
							</p>
							<p className="mt-0.5 text-sm font-medium leading-snug text-slate-700">
								{file.vendor}
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
						{file.$createdAt ? (
							<FormattedDateTime
								date={file.$createdAt}
								className="body-2 font-medium text-slate-700"
							/>
						) : (
							"—"
						)}
					</DetailRow>
					<DetailRow label="Expires">
						{file.contractExpiryDate ? (
							<span
								className={cn(
									urgency !== "none" &&
										urgency !== "expired" &&
										"inline-flex items-center gap-1.5 text-orange",
									isContractExpired(file) && "text-red",
								)}
							>
								{(urgency !== "none" && urgency !== "expired") ||
								isContractExpired(file) ? (
									<AlertTriangle className="h-3.5 w-3.5 shrink-0" />
								) : null}
								<FormattedDate
									date={file.contractExpiryDate}
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
						<PreviewFieldSelect
							value={draft.department}
							onValueChange={(value) =>
								setDraft((prev) => ({ ...prev, department: value }))
							}
							options={departmentOptions}
							formatLabel={(value) => value}
						/>
					</DetailRow>
					<DetailRow label="Assignees">{assignees || "—"}</DetailRow>
					<DetailRow label="Type">
						<PreviewFieldSelect
							value={draft.contractType}
							onValueChange={(value) =>
								setDraft((prev) => ({ ...prev, contractType: value }))
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
