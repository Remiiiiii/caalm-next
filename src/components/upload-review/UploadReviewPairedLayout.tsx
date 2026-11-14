"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { UploadReviewDocumentPane } from "./UploadReviewDocumentPane";
import { UploadReviewSectionCards } from "./UploadReviewSectionCards";
import type { PersonOption } from "./reviewFieldUtils";
import type { ReviewSection, ReviewSourceRegion } from "./types";

type UploadReviewPairedLayoutProps = {
	banner: ReactNode;
	sections: ReviewSection[];
	fileName?: string;
	pdfUrl: string | null;
	htmlContent?: string | null;
	textContent?: string | null;
	downloadOnly?: boolean;
	lowConfidenceFields?: string[];
	peopleById: Map<string, PersonOption>;
	onEditStep: (step: number) => void;
};

export function UploadReviewPairedLayout({
	banner,
	sections,
	fileName,
	pdfUrl,
	htmlContent,
	textContent,
	downloadOnly,
	lowConfidenceFields,
	peopleById,
	onEditStep,
}: UploadReviewPairedLayoutProps) {
	const [activeRegion, setActiveRegion] = useState<ReviewSourceRegion | null>(
		null,
	);

	return (
		<div className="flex h-full min-h-0 max-h-full flex-col gap-3">
			<div className="shrink-0 px-0.5">{banner}</div>
			<div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden pb-2 min-[940px]:grid-cols-[minmax(340px,1fr)_minmax(0,1.1fr)]">
				<div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
					<UploadReviewDocumentPane
						fileName={fileName}
						pdfUrl={pdfUrl}
						htmlContent={htmlContent}
						textContent={textContent}
						downloadOnly={downloadOnly}
						activeRegion={activeRegion}
					/>
				</div>
				<div className="review-hover-scroll min-h-0 min-w-0 px-1 pr-2">
					<UploadReviewSectionCards
						sections={sections}
						lowConfidenceFields={lowConfidenceFields}
						peopleById={peopleById}
						onEditStep={onEditStep}
						onActiveRegionChange={setActiveRegion}
					/>
				</div>
			</div>
		</div>
	);
}