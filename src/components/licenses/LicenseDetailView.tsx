"use client";

import { FileText, Key } from "lucide-react";
import type React from "react";
import FormattedDateTime from "@/components/FormattedDateTime";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { convertFileSize } from "@/lib/utils";
import type { License } from "@/types/licenses";

interface LicenseDetailViewProps {
	license: License;
	onEdit?: () => void;
}

function formatDate(dateString?: string): string {
	if (!dateString) return "N/A";
	try {
		const date = new Date(dateString);
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	} catch {
		return "N/A";
	}
}

function formatCurrency(amount?: number, currency?: string): string {
	if (!amount) return "N/A";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency || "USD",
	}).format(amount);
}

function renderField(
	label: string,
	value: string | number | undefined | null,
): React.ReactNode {
	const display =
		value === undefined || value === null || value === ""
			? "N/A"
			: String(value);
	return (
		<div className="bg-white rounded-lg p-3 border border-slate-200 overflow-hidden">
			<p className="text-sm text-slate-500 font-medium mb-1 break-words">
				{label}
			</p>
			<p className="text-slate-800 font-semibold break-words overflow-wrap-anywhere">
				{display}
			</p>
		</div>
	);
}

function getStatusBadge(status?: string): React.ReactNode {
	switch (status) {
		case "active":
			return <Badge className="bg-green/10 text-green">Active</Badge>;
		case "expired":
			return <Badge className="bg-red/10 text-red">Expired</Badge>;
		case "pending-review":
			return (
				<Badge className="border-2 border-amber-400 bg-[#FFEA99] text-[#E86100]">
					Pending Review
				</Badge>
			);
		case "suspended":
			return (
				<Badge className="bg-slate-400/10 text-slate-600">Suspended</Badge>
			);
		case "action-required":
			return (
				<Badge className="bg-destructive/10 text-destructive">
					Action Required
				</Badge>
			);
		default:
			return (
				<Badge className="bg-slate-200/10 text-slate-600">
					{status || "Unknown"}
				</Badge>
			);
	}
}

export default function LicenseDetailView({
	license,
	onEdit,
}: LicenseDetailViewProps) {
	const fileSizeStr =
		license.fileSize != null && license.fileSize > 0
			? convertFileSize({ sizeInBytes: license.fileSize })
			: "N/A";

	return (
		<div className="space-y-6">
			<div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
				<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
					<Key className="h-6 w-6 text-[#0f5384]" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-slate-700 font-semibold break-words">
						{license.licenseName}
					</p>
					{license.$createdAt && (
						<p className="text-sm text-slate-600 mt-0.5">
							<FormattedDateTime date={license.$createdAt} />
						</p>
					)}
					<p className="text-xs text-slate-500 mt-0.5">{fileSizeStr}</p>
				</div>
				<div className="flex-shrink-0">{getStatusBadge(license.status)}</div>
			</div>

			<Accordion
				type="multiple"
				className="w-full space-y-4"
				defaultValue={["file-info", "license-info"]}
			>
				<AccordionItem
					value="file-info"
					className="bg-white rounded-lg border border-slate-200 px-4 shadow-sm"
				>
					<AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline py-4">
						<FileText className="w-4 h-4 text-[#0f5384]" />
						File Information
					</AccordionTrigger>
					<AccordionContent>
						<div className="grid grid-cols-3 gap-3 pt-2 pb-4">
							{renderField("Owner", license.createdBy ?? "N/A")}
							{renderField(
								"Created",
								license.$createdAt ? formatDate(license.$createdAt) : "N/A",
							)}
							{renderField(
								"Last Modified",
								license.$updatedAt ? formatDate(license.$updatedAt) : "N/A",
							)}
							{renderField("File ID", license.fileId ?? "N/A")}
							{renderField("Extension", "pdf")}
							{renderField("Size", fileSizeStr)}
						</div>
					</AccordionContent>
				</AccordionItem>

				<AccordionItem
					value="license-info"
					className="bg-white rounded-lg border border-slate-200 px-4 shadow-sm"
				>
					<AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline py-4">
						<FileText className="w-4 h-4 text-[#0f5384]" />
						License Information
					</AccordionTrigger>
					<AccordionContent>
						<div className="grid grid-cols-3 gap-3 pt-2 pb-4">
							{renderField("License Number", license.licenseNumber)}
							{renderField("Vendor", license.vendor)}
							{renderField("Product", license.product)}
							{renderField(
								"License Type",
								license.licenseType
									?.replace(/_/g, " ")
									.replace(/\b\w/g, (l) => l.toUpperCase()),
							)}
							{renderField(
								"Category",
								license.category
									?.replace(/_/g, " ")
									.replace(/\b\w/g, (l) => l.toUpperCase()),
							)}
							{renderField(
								"Quantity",
								license.quantity !== undefined
									? `${license.availableQuantity ?? license.quantity} / ${license.quantity}`
									: undefined,
							)}
							{renderField(
								"Cost",
								formatCurrency(license.cost, license.currencyCode),
							)}
							{renderField(
								"Issue Date",
								formatDate(license.issueDate || license.purchaseDate),
							)}
							{renderField(
								"Expiration Date",
								formatDate(license.licenseExpiryDate || license.expirationDate),
							)}
							{renderField("Issuing Authority", license.issuingAuthority)}
							{renderField("Renewal Date", formatDate(license.renewalDate))}
							{renderField("Auto Renew", license.autoRenew ? "Yes" : "No")}
							{renderField("Division", license.division || license.department)}
							{renderField("Business Unit", license.businessUnit)}
							{renderField("Compliance", license.compliance)}
						</div>
						{license.description && (
							<div className="mt-3">
								{renderField("Description", license.description)}
							</div>
						)}
						{license.notes && (
							<div className="mt-3">{renderField("Notes", license.notes)}</div>
						)}
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
}
