"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ReviewFieldValue } from "./ReviewFieldValue";
import { type PersonOption, splitSectionTitle } from "./reviewFieldUtils";
import type { ReviewSection, ReviewSourceRegion } from "./types";

type UploadReviewSectionCardsProps = {
	sections: ReviewSection[];
	lowConfidenceFields?: string[];
	peopleById: Map<string, PersonOption>;
	onEditStep: (step: number) => void;
	onActiveRegionChange: (region: ReviewSourceRegion | null) => void;
};

export function UploadReviewSectionCards({
	sections,
	lowConfidenceFields = [],
	peopleById,
	onEditStep,
	onActiveRegionChange,
}: UploadReviewSectionCardsProps) {
	const low = new Set(lowConfidenceFields);
	const [focusedRow, setFocusedRow] = useState<string | null>(null);

	return (
		<div className="space-y-4 pb-20">
			{sections.map((section) => {
				const { plain, accent } = splitSectionTitle(section.title);
				return (
					<div
						key={section.title}
						className="overflow-hidden rounded-lg border border-slate-200/80 bg-white/55"
					>
						<div className="flex items-center justify-between gap-3 px-4 py-3">
							<h3 className="text-sm">
								<span className="font-semibold text-slate-700">{plain}</span>
								{accent ? (
									<>
										{" "}
										<span className="font-semibold sidebar-gradient-text">
											{accent}
										</span>
									</>
								) : null}
							</h3>
							<button
								type="button"
								className="shrink-0 rounded p-1.5 text-slate-500 transition-colors hover:text-[#078FAB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]/40"
								aria-label={`Edit ${section.title}`}
								onClick={() => onEditStep(section.editStep)}
							>
								<Pencil className="h-4 w-4" aria-hidden />
							</button>
						</div>
						<div className="divide-y divide-slate-100 border-t border-slate-100">
							{section.fields.map((field) => {
								const rowKey = `${section.title}-${field.label}`;
								const linked = Boolean(field.sourceRegion);
								const needsReview = field.fieldKey
									? low.has(field.fieldKey)
									: false;
								return (
									<div
										key={rowKey}
										tabIndex={linked ? 0 : undefined}
										className={cn(
											"grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[minmax(8.5rem,34%)_1fr] sm:gap-4",
											linked &&
												"border-l-2 border-l-[#078FAB]/40 bg-blue-50/40",
											needsReview && "bg-amber-50/50",
											focusedRow === rowKey && linked && "bg-blue-50/70",
										)}
										onMouseEnter={() => {
											setFocusedRow(rowKey);
											onActiveRegionChange(field.sourceRegion ?? null);
										}}
										onMouseLeave={() => {
											setFocusedRow((prev) => (prev === rowKey ? null : prev));
											onActiveRegionChange(null);
										}}
										onFocus={() => {
											setFocusedRow(rowKey);
											onActiveRegionChange(field.sourceRegion ?? null);
										}}
										onBlur={() => {
											onActiveRegionChange(null);
										}}
									>
										<span className="text-xs font-medium text-slate-500">
											{field.label}
										</span>
										<ReviewFieldValue field={field} peopleById={peopleById} />
									</div>
								);
							})}
						</div>
					</div>
				);
			})}
		</div>
	);
}
