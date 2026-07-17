"use client";

import { format } from "date-fns";
import {
	AlertTriangle,
	Calendar,
	CheckCircle2,
	DollarSign,
	ExternalLink,
	FileText,
	Users,
	X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

function statusClasses(file: UIFileDoc): string {
	if (isContractExpired(file)) {
		return "bg-red/10 text-red border-red/20";
	}
	switch (file.status) {
		case "active":
			return "bg-green/10 text-green border-green/20";
		case "pending-review":
			return "bg-orange/10 text-orange border-orange/20";
		case "action-required":
			return "bg-red/10 text-red border-red/20";
		case "inactive":
			return "bg-slate-100 text-slate-600 border-slate-200";
		default:
			return "bg-slate-100 text-slate-700 border-slate-200";
	}
}

export default function ContractPreviewSheet({
	file,
	open,
	onOpenChange,
}: ContractPreviewSheetProps) {
	if (!file) return null;

	const urgency = getExpiryUrgency(file);
	const title = file.contractName || file.name || "Untitled Contract";

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full sm:max-w-md p-0 flex flex-col border-l border-slate-200"
			>
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70" />
				<SheetHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4 px-6 text-left space-y-1">
					<div className="flex items-center gap-3">
						<FileText className="w-5 h-5 text-[#0f5384]" />
						<SheetTitle className="text-xl font-semibold sidebar-gradient-text truncate pr-6">
							{title}
						</SheetTitle>
					</div>
					<SheetDescription className="text-sm text-slate-600 ml-8">
						{file.contractNumber
							? `Contract #${file.contractNumber}`
							: "Contract summary"}
					</SheetDescription>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4">
					<div className="flex flex-wrap items-center gap-2">
						<Badge
							variant="outline"
							className={cn("border capitalize", statusClasses(file))}
						>
							{isContractExpired(file)
								? "Expired"
								: (file.status || "unknown").replace("-", " ")}
						</Badge>
						{urgency !== "none" && urgency !== "expired" && (
							<Badge
								variant="outline"
								className="border border-orange/20 bg-orange/10 text-orange"
							>
								<AlertTriangle className="h-3 w-3 mr-1" />
								Expires in {urgency} days
							</Badge>
						)}
					</div>

					<div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
						{(file.amount != null || file.vendor) && (
							<div className="flex items-start gap-3">
								<DollarSign className="h-4 w-4 text-[#0f5384] mt-0.5 shrink-0" />
								<div className="min-w-0">
									<p className="text-xs text-slate-500">Value / Vendor</p>
									<p className="text-sm font-medium text-slate-900">
										{file.amount != null
											? `$${new Intl.NumberFormat("en-US", {
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												}).format(Number(file.amount))}`
											: "—"}
										{file.vendor ? ` · ${file.vendor}` : ""}
									</p>
								</div>
							</div>
						)}
						<div className="flex items-start gap-3">
							<Calendar className="h-4 w-4 text-[#0f5384] mt-0.5 shrink-0" />
							<div className="min-w-0">
								<p className="text-xs text-slate-500">Uploaded</p>
								<p className="text-sm text-slate-900">
									{file.$createdAt ? (
										<FormattedDateTime date={file.$createdAt} className="body-2" />
									) : (
										"—"
									)}
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<AlertTriangle className="h-4 w-4 text-[#0f5384] mt-0.5 shrink-0" />
							<div className="min-w-0">
								<p className="text-xs text-slate-500">Expires</p>
								<p className="text-sm text-slate-900">
									{file.contractExpiryDate ? (
										<FormattedDate
											date={file.contractExpiryDate}
											className="body-2"
										/>
									) : (
										"—"
									)}
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<Users className="h-4 w-4 text-[#0f5384] mt-0.5 shrink-0" />
							<div className="min-w-0">
								<p className="text-xs text-slate-500">Department / Assignees</p>
								<p className="text-sm text-slate-900">
									{file.department || "—"}
									{Array.isArray(file.assignedManagers) &&
									file.assignedManagers.length > 0
										? ` · ${file.assignedManagers.join(", ")}`
										: ""}
								</p>
							</div>
						</div>
						{file.contractType && (
							<div className="flex items-start gap-3">
								<CheckCircle2 className="h-4 w-4 text-[#0f5384] mt-0.5 shrink-0" />
								<div className="min-w-0">
									<p className="text-xs text-slate-500">Type</p>
									<p className="text-sm text-slate-900">{file.contractType}</p>
								</div>
							</div>
						)}
					</div>
				</div>

				<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
					<Button
						variant="outline"
						className="primary-btn px-3 sm:px-4 cursor-pointer"
						onClick={() => onOpenChange(false)}
					>
						<X className="h-4 w-4" />
						Close
					</Button>
					{file.url && (
						<Button asChild className="primary-btn px-3 sm:px-4 cursor-pointer">
							<a href={file.url} target="_blank" rel="noopener noreferrer">
								<ExternalLink className="h-4 w-4" />
								Open document
							</a>
						</Button>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
