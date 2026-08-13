"use client";

import { format } from "date-fns";
import { CheckCircle, Eye, FileText, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ContractReviewStepProps = {
	values: Record<string, unknown>;
	fileName?: string;
	/** Content step titles (without Review). Index 0 = step 1. */
	contentStepTitles: string[];
	lowConfidenceFields?: string[];
	onEditStep: (step: number) => void;
	/** Opens the uploaded PDF in a viewer */
	onPreviewFile?: () => void;
	canPreviewFile?: boolean;
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
	return String(value);
}

function formatMoney(amount: unknown, currency?: unknown): string {
	if (amount === undefined || amount === null || amount === "") return "—";
	const n = Number(String(amount).replace(/,/g, ""));
	if (!Number.isFinite(n)) return String(amount);
	const code = typeof currency === "string" && currency ? currency : "USD";
	try {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: code,
		}).format(n);
	} catch {
		return `${code} ${n.toLocaleString()}`;
	}
}

type ReviewRow = {
	label: string;
	value: string;
	field?: string;
	editStep?: number;
	isFile?: boolean;
};

type ReviewSection = {
	title: string;
	editStep: number;
	rows: ReviewRow[];
};

export default function ContractReviewStep({
	values,
	fileName,
	contentStepTitles,
	lowConfidenceFields = [],
	onEditStep,
	onPreviewFile,
	canPreviewFile = false,
}: ContractReviewStepProps) {
	const low = new Set(lowConfidenceFields);

	const sections: ReviewSection[] = [
		{
			title: "File",
			editStep: 1,
			rows: [
				{
					label: "Uploaded file",
					value: fileName || "—",
					editStep: 1,
					isFile: true,
				},
			],
		},
		{
			title: contentStepTitles[1] || "Contract Basics",
			editStep: 2,
			rows: [
				{
					label: "Contract title",
					value: displayValue(values.contractName),
					field: "contractName",
					editStep: 2,
				},
				{
					label: "Contract number",
					value: displayValue(values.contractNumber),
					field: "contractNumber",
					editStep: 2,
				},
				{
					label: "Type",
					value: displayValue(values.contractType),
					field: "contractType",
					editStep: 2,
				},
				{
					label: "Department",
					value: displayValue(values.assignToDepartment),
					field: "assignToDepartment",
					editStep: 2,
				},
				{
					label: "Start date",
					value: displayValue(values.startDate),
					field: "startDate",
					editStep: 2,
				},
				{
					label: "Expiry date",
					value: displayValue(values.expiryDate),
					field: "expiryDate",
					editStep: 2,
				},
				{
					label: "Auto-renew",
					value: displayValue(values.autoRenew),
					field: "autoRenew",
					editStep: 2,
				},
				{
					label: "Renewal notice (days)",
					value: displayValue(values.renewalNoticeDays),
					field: "renewalNoticeDays",
					editStep: 2,
				},
			],
		},
		{
			title: "Parties & financials",
			editStep: Math.min(3, contentStepTitles.length),
			rows: [
				{
					label: "Counterparty",
					value: displayValue(values.counterpartyLegalName),
					field: "counterpartyLegalName",
					editStep: 3,
				},
				{
					label: "Amount",
					value: formatMoney(values.amount, values.currencyCode),
					field: "amount",
					editStep: Math.min(4, contentStepTitles.length) || 4,
				},
				{
					label: "Risk level",
					value: displayValue(values.riskLevel),
					field: "riskLevel",
					editStep: Math.min(5, contentStepTitles.length) || 5,
				},
			],
		},
	];

	const fileChip = fileName ? (
		<button
			type="button"
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				onPreviewFile?.();
			}}
			className={cn(
				"flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs text-slate-600 transition-all duration-200",
				canPreviewFile
					? "cursor-pointer hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]"
					: "cursor-pointer hover:border-slate-300",
			)}
			aria-label={`Preview ${fileName}`}
		>
			<FileText className="h-4 w-4 shrink-0 text-[#0f5384]" />
			<span className="min-w-0 flex-1 truncate font-medium text-slate-800">
				{fileName}
			</span>
			<span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-[#0f5384]">
				<Eye className="h-3.5 w-3.5" />
				View PDF
			</span>
		</button>
	) : null;

	return (
		<div className="space-y-4">
			<div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
				<div className="flex items-start gap-2">
					<CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#0f5384]" />
					<div>
						<p className="text-sm font-medium text-slate-700">
							Review before upload
						</p>
						<p className="mt-0.5 text-xs text-slate-600">
							Confirm the details below. Use Edit to jump back to any step.
							{canPreviewFile
								? " Click the file to open it in the PDF viewer."
								: ""}
						</p>
					</div>
				</div>
			</div>

			{sections.map((section) => (
				<section
					key={section.title}
					className="rounded-lg border border-slate-200 bg-white overflow-hidden"
				>
					<div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
						<h4 className="text-sm font-semibold sidebar-gradient-text">
							{section.title}
						</h4>
						<Button
							type="button"
							variant="outline"
							className="primary-btn h-8 px-3 text-xs"
							onClick={() => onEditStep(section.editStep)}
						>
							<Pencil className="h-3.5 w-3.5" />
							Edit
						</Button>
					</div>
					<dl className="divide-y divide-slate-100">
						{section.rows.map((row) => {
							const needsReview = row.field ? low.has(row.field) : false;
							return (
								<div
									key={`${section.title}-${row.label}`}
									className={cn(
										"flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
										needsReview && "bg-amber-50/80",
									)}
								>
									<dt className="text-xs font-medium text-slate-500">
										{row.label}
										{needsReview ? (
											<span className="ml-2 text-[10px] font-medium text-amber-700">
												AI · review
											</span>
										) : null}
									</dt>
									<dd className="text-sm text-slate-700 wrap-break-word text-left sm:text-right sm:max-w-[60%]">
										{row.isFile ? (
											<button
												type="button"
												onClick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													onPreviewFile?.();
												}}
												className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded text-[#0f5384] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]"
											>
												<span className="truncate">{row.value}</span>
												<Eye className="h-3.5 w-3.5 shrink-0" />
											</button>
										) : (
											row.value
										)}
									</dd>
								</div>
							);
						})}
					</dl>
				</section>
			))}

			{fileChip}
		</div>
	);
}
