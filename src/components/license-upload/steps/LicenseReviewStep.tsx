/**
 * Final step: review license details before submitting for pending-review.
 * Renders generically from the selected type's config fields — no
 * hardcoded per-type field list — plus the always-present common fields.
 */

"use client";

import { format } from "date-fns";
import { CheckCircle, FileText, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LicenseTypeConfig } from "@/lib/licenses/licenseTypeConfigs";
import { cn } from "@/lib/utils";

export type LicenseReviewStepProps = {
	values: Record<string, unknown>;
	typeConfig?: LicenseTypeConfig;
	ownershipStepNumber: number;
	fileName?: string;
	lowConfidenceFields?: string[];
	onEditStep: (step: number) => void;
};

function displayValue(value: unknown): string {
	if (value === undefined || value === null || value === "") return "—";
	if (typeof value === "boolean") return value ? "Yes" : "No";
	if (Array.isArray(value)) {
		return value.length > 0 ? value.map(String).join(", ") : "—";
	}
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return format(value, "PPP");
	}
	if (typeof value === "string" || typeof value === "number") {
		const asDate = new Date(value);
		if (
			typeof value === "string" &&
			/\d{4}-\d{2}-\d{2}/.test(value) &&
			!Number.isNaN(asDate.getTime())
		) {
			return format(asDate, "PPP");
		}
	}
	return String(value);
}

/** Mirrors the "expiring soon" window used on the Licenses list (90 days). */
const EXPIRING_SOON_DAYS = 90;

function deriveStatusBadge(expiryValue: unknown): {
	label: string;
	className: string;
} {
	const expiry = expiryValue instanceof Date ? expiryValue : null;
	if (!expiry || Number.isNaN(expiry.getTime())) {
		return { label: "Unknown", className: "bg-slate-100 text-slate-500" };
	}
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	if (expiry < now) {
		return {
			label: "Expired",
			className: "bg-red-50 text-red border border-red-200",
		};
	}
	const soon = new Date(now);
	soon.setDate(soon.getDate() + EXPIRING_SOON_DAYS);
	if (expiry <= soon) {
		return {
			label: "Expiring",
			className: "bg-amber-50 text-amber-700 border border-amber-200",
		};
	}
	return {
		label: "Active",
		className: "bg-green/10 text-green border border-green/20",
	};
}

type ReviewRow = { label: string; value: string; field?: string };
type ReviewSection = { title: string; editStep: number; rows: ReviewRow[] };

export default function LicenseReviewStep({
	values,
	typeConfig,
	ownershipStepNumber,
	fileName,
	lowConfidenceFields = [],
	onEditStep,
}: LicenseReviewStepProps) {
	const low = new Set(lowConfidenceFields);
	const statusBadge = deriveStatusBadge(values.licenseExpiryDate);

	const dynamicSections: ReviewSection[] = (typeConfig?.steps ?? [])
		.map((step, index) => {
			if (step.kind === "ownership") {
				return {
					title: step.title,
					editStep: ownershipStepNumber,
					rows: [
						{ label: "Division", value: displayValue(values.division) },
						{ label: "Department", value: displayValue(values.department) },
						{
							label: "Responsible owner(s)",
							value: displayValue(values.assignedManagers),
						},
						{
							label: "File location",
							value: displayValue(values.fileLocation),
						},
					],
				};
			}
			return {
				title: step.title,
				editStep: index + 2, // +1 for file-upload step, +1 for 1-indexing
				rows: step.fields.map((f) => ({
					label: f.label,
					value: displayValue(values[f.name]),
					field: f.name,
				})),
			};
		})
		.filter((section) => section.rows.length > 0);

	const sections: ReviewSection[] = [
		{
			title: "File",
			editStep: 1,
			rows: [{ label: "Uploaded file", value: fileName || "—" }],
		},
		...dynamicSections,
	];

	return (
		<div className="space-y-4">
			<div className="rounded-lg border border-blue-200 bg-blue-50/80 px-4 py-3">
				<div className="flex items-center justify-between gap-3">
					<p className="text-sm font-medium text-slate-700">
						Review before submitting
					</p>
					<span
						className={cn(
							"inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
							statusBadge.className,
						)}
					>
						{statusBadge.label}
					</span>
				</div>
				<p className="text-xs text-slate-600 mt-1">
					Submitting sends this license to{" "}
					<span className="font-semibold">Pending Review</span>. It will not
					become Active until approved on the Licenses Approvals page.
				</p>
			</div>

			{sections.map((section) => (
				<div
					key={section.title}
					className="rounded-lg border border-slate-200 bg-white overflow-hidden"
				>
					<div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
						<h3 className="text-sm font-semibold sidebar-gradient-text">
							{section.title}
						</h3>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="primary-btn h-8 px-3"
							onClick={() => onEditStep(section.editStep)}
						>
							<Pencil className="h-3 w-3" />
							Edit
						</Button>
					</div>
					<div className="divide-y divide-slate-100">
						{section.rows.map((row) => (
							<div
								key={`${section.title}-${row.label}`}
								className={cn(
									"flex items-start justify-between gap-4 px-4 py-2.5 text-sm",
									row.field && low.has(row.field) && "bg-amber-50/60",
								)}
							>
								<span className="text-slate-500 shrink-0">{row.label}</span>
								<span className="text-slate-700 text-right font-medium wrap-break-word max-w-[60%]">
									{section.title === "File" ? (
										<span className="inline-flex items-center gap-1.5">
											<FileText className="h-4 w-4 text-[#0f5384] shrink-0" />
											{row.value}
										</span>
									) : (
										row.value
									)}
								</span>
							</div>
						))}
					</div>
				</div>
			))}

			<div className="flex items-center gap-2 text-xs text-green">
				<CheckCircle className="h-4 w-4" />
				Ready to submit for review
			</div>
		</div>
	);
}
