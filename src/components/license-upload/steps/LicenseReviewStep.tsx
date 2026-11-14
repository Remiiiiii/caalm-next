/**
 * Final step: review license details before submitting for pending-review.
 * Paired document pane + section cards (Review Step V3).
 */

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
import type { LicenseTypeConfig } from "@/lib/licenses/licenseTypeConfigs";
import type { Manager } from "../types";

export type LicenseReviewStepProps = {
	values: Record<string, unknown>;
	typeConfig?: LicenseTypeConfig;
	ownershipStepNumber: number;
	fileName?: string;
	pdfUrl?: string | null;
	htmlContent?: string | null;
	textContent?: string | null;
	downloadOnly?: boolean;
	managers?: Manager[];
	extractedFieldNames?: string[];
	lowConfidenceFields?: string[];
	/** Manager id → display name, so owners show as people rather than ids. */
	managerNames?: Record<string, string>;
	onEditStep: (step: number) => void;
	onReadinessChange?: (readiness: ReviewReadiness) => void;
};

function fieldSource(
	name: string,
	extracted: Set<string>,
): "extracted" | "manual" {
	return extracted.has(name) ? "extracted" : "manual";
}

export default function LicenseReviewStep({
	values,
	typeConfig,
	ownershipStepNumber,
	fileName,
	pdfUrl = null,
	htmlContent = null,
	textContent = null,
	downloadOnly = false,
	managers = [],
	extractedFieldNames = [],
	lowConfidenceFields = [],
	managerNames,
	onEditStep,
	onReadinessChange,
}: LicenseReviewStepProps) {
	const extracted = useMemo(
		() => new Set(extractedFieldNames),
		[extractedFieldNames],
	);

	const peopleById = useMemo(() => {
		const map = new Map<string, PersonOption>();
		// Fallback first: covers an assigned manager no longer in `managers`
		// (e.g. removed from the department since assignment).
		for (const [id, name] of Object.entries(managerNames ?? {})) {
			map.set(id, { id, name: name || "Unknown user" });
		}
		for (const m of managers) {
			map.set(m.$id, { id: m.$id, name: m.fullName || "Unknown user" });
		}
		return map;
	}, [managers, managerNames]);

	const sections: ReviewSection[] = useMemo(() => {
		const dynamicSections: ReviewSection[] = (typeConfig?.steps ?? [])
			.map((step, index) => {
				if (step.kind === "ownership") {
					const fields: ReviewField[] = [
						{
							label: "Division",
							value: values.division,
							required: true,
							source: fieldSource("division", extracted),
							format: "enum",
							fieldKey: "division",
						},
						{
							label: "Department",
							value: values.department,
							required: true,
							source: fieldSource("department", extracted),
							format: "enum",
							fieldKey: "department",
						},
						{
							label: "Responsible owner(s)",
							value: values.assignedManagers,
							required: true,
							source: fieldSource("assignedManagers", extracted),
							format: "person",
							fieldKey: "assignedManagers",
						},
						{
							label: "File location",
							value: values.fileLocation,
							required: false,
							source: fieldSource("fileLocation", extracted),
							fieldKey: "fileLocation",
						},
					];
					return {
						title: step.title,
						editStep: ownershipStepNumber,
						fields,
					};
				}
				const fields: ReviewField[] = step.fields.map((f) => {
					let format: ReviewField["format"];
					if (f.type === "date") format = "date";
					else if (f.name === "licenseNumber") format = "mono";
					else if (f.type === "select") format = "enum";
					return {
						label: f.label,
						value: values[f.name],
						required: f.required,
						source: fieldSource(f.name, extracted),
						format,
						fieldKey: f.name,
					};
				});
				return {
					title: step.title,
					editStep: index + 2,
					fields,
				};
			})
			.filter((section) => section.fields.length > 0);

		return dynamicSections;
	}, [typeConfig, values, ownershipStepNumber, extracted]);

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
		// missingKey is the stable signal; labels array is rebuilt when sections rebuild.
		// eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
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
				Submitting sends this license to{" "}
				<span className="font-semibold">Pending Review</span>. It will not
				become Active until approved on the Licenses Approvals page.
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
