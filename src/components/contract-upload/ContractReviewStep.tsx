"use client";

import { FileSearchCorner } from "lucide-react";
import { useEffect, useMemo } from "react";
import {
	collectMissingRequiredLabels,
	type PersonOption,
} from "@/components/upload-review/reviewFieldUtils";
import type {
	ReviewField,
	ReviewReadiness,
	ReviewSection,
} from "@/components/upload-review/types";
import { UploadReviewPairedLayout } from "@/components/upload-review/UploadReviewPairedLayout";
export type ContractReviewStepProps = {
	values: Record<string, unknown>;
	fileName?: string;
	pdfUrl?: string | null;
	htmlContent?: string | null;
	textContent?: string | null;
	downloadOnly?: boolean;
	contentStepTitles: string[];
	managers?: { $id: string; fullName: string }[];
	extractedFieldNames?: string[];
	lowConfidenceFields?: string[];
	onEditStep: (step: number) => void;
	onReadinessChange?: (readiness: ReviewReadiness) => void;
};

function fieldSource(
	name: string,
	extracted: Set<string>,
): "extracted" | "manual" {
	return extracted.has(name) ? "extracted" : "manual";
}

export default function ContractReviewStep({
	values,
	fileName,
	pdfUrl = null,
	htmlContent = null,
	textContent = null,
	downloadOnly = false,
	contentStepTitles,
	managers = [],
	extractedFieldNames = [],
	lowConfidenceFields = [],
	onEditStep,
	onReadinessChange,
}: ContractReviewStepProps) {
	const extracted = useMemo(
		() => new Set(extractedFieldNames),
		[extractedFieldNames],
	);

	const peopleById = useMemo(() => {
		const map = new Map<string, PersonOption>();
		for (const m of managers) {
			map.set(m.$id, { id: m.$id, name: m.fullName || "Unknown user" });
		}
		const ownerId = values.contractOwnerId;
		if (typeof ownerId === "string" && ownerId && !map.has(ownerId)) {
			map.set(ownerId, { id: ownerId, name: "Unknown user" });
		}
		return map;
	}, [managers, values.contractOwnerId]);

	const partiesStep = Math.min(3, contentStepTitles.length) || 3;

	const sections: ReviewSection[] = useMemo(
		() => [
			{
				title: contentStepTitles[1] || "Contract Basics",
				editStep: 2,
				fields: [
					{
						label: "Contract title",
						value: values.contractName,
						required: true,
						source: fieldSource("contractName", extracted),
						fieldKey: "contractName",
					},
					{
						label: "Contract number",
						value: values.contractNumber,
						required: true,
						source: fieldSource("contractNumber", extracted),
						format: "mono",
						fieldKey: "contractNumber",
					},
					{
						label: "Type",
						value: values.contractType,
						required: true,
						source: fieldSource("contractType", extracted),
						format: "enum",
						fieldKey: "contractType",
					},
					{
						label: "Department",
						value: values.assignToDepartment,
						required: true,
						source: fieldSource("assignToDepartment", extracted),
						format: "enum",
						fieldKey: "assignToDepartment",
					},
					{
						label: "Start date",
						value: values.startDate,
						required: false,
						source: fieldSource("startDate", extracted),
						format: "date",
						fieldKey: "startDate",
					},
					{
						label: "Expiry date",
						value: values.expiryDate,
						required: true,
						source: fieldSource("expiryDate", extracted),
						format: "date",
						fieldKey: "expiryDate",
					},
					{
						label: "Auto-renew",
						value: values.autoRenew,
						required: false,
						source: fieldSource("autoRenew", extracted),
						fieldKey: "autoRenew",
					},
					{
						label: "Renewal notice (days)",
						value: values.renewalNoticeDays,
						required: false,
						source: fieldSource("renewalNoticeDays", extracted),
						fieldKey: "renewalNoticeDays",
					},
				] satisfies ReviewField[],
			},
			{
				title: "Parties & financials",
				editStep: partiesStep,
				fields: [
					{
						label: "Counterparty",
						value: values.counterpartyLegalName,
						required: true,
						source: fieldSource("counterpartyLegalName", extracted),
						fieldKey: "counterpartyLegalName",
					},
					{
						label: "Amount",
						value: values.amount,
						required: true,
						source: fieldSource("amount", extracted),
						fieldKey: "amount",
						formatOptions: {
							currencyCode:
								typeof values.currencyCode === "string"
									? values.currencyCode
									: "USD",
						},
					},
					{
						label: "Risk level",
						value: values.riskLevel,
						required: true,
						source: fieldSource("riskLevel", extracted),
						format: "enum",
						fieldKey: "riskLevel",
					},
				] satisfies ReviewField[],
			},
		],
		[contentStepTitles, values, extracted, partiesStep],
	);

	const missingRequiredLabels = useMemo(
		() => collectMissingRequiredLabels(sections),
		[sections],
	);
	const missingKey = missingRequiredLabels.join("\0");

	useEffect(() => {
		onReadinessChange?.({
			missingRequiredLabels,
			canSubmit: missingRequiredLabels.length === 0,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps -- missingKey is the stable signal
	}, [missingKey, onReadinessChange]);

	const banner = (
		<div className="rounded-lg border border-blue-200 bg-blue-50/80 px-4 py-3">
			<div className="flex items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-2">
					<FileSearchCorner
						className="h-4 w-4 shrink-0 text-[#0f5384]"
						aria-hidden
					/>
					<p className="text-sm font-medium text-slate-700">
						Review before submitting
					</p>
				</div>
				<span className="inline-flex shrink-0 items-center rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-[#0f5384]">
					Pending Review
				</span>
			</div>
			<p className="mt-1 text-xs text-slate-600">
				Submitting sends this contract to{" "}
				<span className="font-semibold">Pending Review</span>. It will not
				become Active until approved on the Contracts Approvals page.
			</p>
		</div>
	);

	return (
		<UploadReviewPairedLayout
			banner={banner}
			sections={sections}
			fileName={fileName}
			pdfUrl={pdfUrl}
			htmlContent={htmlContent}
			textContent={textContent}
			downloadOnly={downloadOnly}
			lowConfidenceFields={lowConfidenceFields}
			peopleById={peopleById}
			onEditStep={onEditStep}
		/>
	);
}
