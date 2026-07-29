"use client";

import {
	AlertTriangle,
	Building2,
	Calendar,
	ExternalLink,
	FileText,
	Hash,
	Users,
	X,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	getExpiryUrgency,
	isContractExpired,
} from "@/lib/contracts/contractsListUtils";
import { cn } from "@/lib/utils";
import type { UIFileDoc } from "@/types/files";
import FormattedDateTime, { FormattedDate } from "./FormattedDateTime";

interface ContractPreviewSheetProps {
	file: UIFileDoc | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
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

const previewSectionClass =
	"glass-card-inner border-white/55! bg-white/65! shadow-sm";
const previewSectionHeaderClass =
	"border-b border-white/50 bg-white/45 px-4 py-2.5 backdrop-blur-sm";

function DetailRow({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-3 py-2.5">
			<p className="pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
				{label}
			</p>
			<div className="min-w-0 text-sm font-medium text-slate-900">
				{children}
			</div>
		</div>
	);
}

export default function ContractPreviewSheet({
	file,
	open,
	onOpenChange,
}: ContractPreviewSheetProps) {
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

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className={cn(
					"flex w-full flex-col gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none backdrop-blur-none sm:max-w-md",
					"inset-y-auto! top-4! right-4! bottom-auto! h-auto! max-h-[calc(100vh-2rem)]",
					"data-[state=closed]:slide-out-to-right-52 data-[state=open]:slide-in-from-right-52",
				)}
			>
				<div className="glass-card-frosted flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-2xl">
					<div className="glass-card-cap rounded-t-2xl!" />

					<SheetHeader className="glass-dialog-wizard-header mt-4 space-y-3 px-5 py-4 text-left">
						<div className="flex items-start gap-3 pr-6">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/50 bg-white/40 shadow-sm backdrop-blur-sm">
								<FileText className="h-5 w-5 text-[#0f5384]" />
							</div>
							<div className="min-w-0 flex-1">
								<SheetTitle className="truncate text-lg font-semibold leading-snug sidebar-gradient-text">
									{title}
								</SheetTitle>
								<SheetDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
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
								</SheetDescription>
							</div>
						</div>
					</SheetHeader>

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

					<div className="glass-dialog-scroll-area space-y-4 px-5 py-4">
						{/* Hero financial summary — Melio / PandaDoc style */}
						<div className={cn(previewSectionClass, "p-4")}>
							<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
								Contract value
							</p>
							<p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
								{amountValue != null ? formatCurrency(amountValue) : "—"}
							</p>
							{file.vendor ? (
								<div className="mt-3 flex items-start gap-2 border-t border-white/50 pt-3">
									<Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0f5384]" />
									<div className="min-w-0">
										<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
											Vendor / counterparty
										</p>
										<p className="mt-0.5 text-sm font-medium leading-snug text-slate-900">
											{file.vendor}
										</p>
									</div>
								</div>
							) : null}
						</div>

						{/* Timeline */}
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
											className="body-2 font-medium text-slate-900"
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

						{/* Ownership */}
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
									{file.department || "—"}
								</DetailRow>
								<DetailRow label="Assignees">{assignees || "—"}</DetailRow>
								<DetailRow label="Type">
									<span className="capitalize">
										{formatContractType(file.contractType)}
									</span>
								</DetailRow>
							</div>
						</section>
					</div>

					<div className="glass-dialog-footer-compact px-5 py-3.5">
						<Button
							variant="outline"
							className="primary-btn cursor-pointer px-3 sm:px-4"
							onClick={() => onOpenChange(false)}
						>
							<X className="h-4 w-4" />
							Close
						</Button>
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
			</SheetContent>
		</Sheet>
	);
}
