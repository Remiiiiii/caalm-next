/**
 * Step 3: Review license details before submitting for pending-review.
 */

"use client";

import { format } from "date-fns";
import { CheckCircle, FileText, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type LicenseReviewStepProps = {
	values: Record<string, unknown>;
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

type ReviewRow = {
	label: string;
	value: string;
	field?: string;
};

type ReviewSection = {
	title: string;
	editStep: number;
	rows: ReviewRow[];
};

export default function LicenseReviewStep({
	values,
	fileName,
	lowConfidenceFields = [],
	onEditStep,
}: LicenseReviewStepProps) {
	const low = new Set(lowConfidenceFields);

	const sections: ReviewSection[] = [
		{
			title: "File",
			editStep: 1,
			rows: [{ label: "Uploaded file", value: fileName || "—" }],
		},
		{
			title: "License details",
			editStep: 2,
			rows: [
				{
					label: "License name",
					value: displayValue(values.licenseName),
					field: "licenseName",
				},
				{
					label: "License number",
					value: displayValue(values.licenseNumber),
					field: "licenseNumber",
				},
				{
					label: "Type",
					value: displayValue(values.licenseType),
					field: "licenseType",
				},
				{
					label: "Category",
					value: displayValue(values.category),
					field: "category",
				},
				{
					label: "Issuing authority",
					value: displayValue(values.issuingAuthority),
					field: "issuingAuthority",
				},
				{
					label: "Issue date",
					value: displayValue(values.issueDate),
					field: "issueDate",
				},
				{
					label: "Expiry date",
					value: displayValue(values.licenseExpiryDate),
					field: "licenseExpiryDate",
				},
				{
					label: "Renewal date",
					value: displayValue(values.renewalDate),
					field: "renewalDate",
				},
				{
					label: "Cost",
					value:
						values.cost !== undefined && values.cost !== ""
							? `${displayValue(values.currencyCode || "USD")} ${displayValue(values.cost)}`
							: "—",
					field: "cost",
				},
				{
					label: "Division",
					value: displayValue(values.division || values.department),
					field: "division",
				},
				{
					label: "Compliance",
					value: displayValue(values.compliance),
					field: "compliance",
				},
			],
		},
	];

	return (
		<div className="space-y-4">
			<div className="rounded-lg border border-blue-200 bg-blue-50/80 px-4 py-3">
				<p className="text-sm font-medium text-slate-800">
					Review before submitting
				</p>
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
								<span className="text-slate-900 text-right font-medium wrap-break-word max-w-[60%]">
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
