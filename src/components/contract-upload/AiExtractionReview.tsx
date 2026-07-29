"use client";

import { AlertTriangle, CheckCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	isRealExtractionMethod,
	LOW_EXTRACTION_CONFIDENCE,
} from "@/lib/ai/contractExtractionSchema";
import { cn } from "@/lib/utils";

type AiExtractionStatusProps = {
	method?: string | null;
	overallConfidence?: number | null;
	filledCount?: number;
	lowConfidenceFields?: string[];
};

export function AiExtractionStatusBadge({
	method,
	overallConfidence,
	filledCount = 0,
}: AiExtractionStatusProps) {
	if (!isRealExtractionMethod(method)) return null;

	const pct =
		typeof overallConfidence === "number"
			? Math.round(overallConfidence * 100)
			: null;

	return (
		<Badge className="sidebar-gradient-text border-sidebar-gradient-text">
			<CheckCircle className="h-3 w-3 mr-1 text-[#0f5384]" />
			CAALM filled {filledCount > 0 ? `${filledCount} fields` : "fields"}
			{pct !== null ? ` · ${pct}%` : ""}
		</Badge>
	);
}

export function AiExtractionReviewPanel({
	method,
	overallConfidence,
	filledCount = 0,
	lowConfidenceFields = [],
}: AiExtractionStatusProps) {
	if (!isRealExtractionMethod(method)) return null;

	const hasLow = lowConfidenceFields.length > 0;
	const pct =
		typeof overallConfidence === "number"
			? Math.round(overallConfidence * 100)
			: null;

	return (
		<div
			className={cn(
				"mb-4 rounded-lg border px-4 py-3 text-sm",
				hasLow
					? "border-amber-300 bg-amber-50 text-amber-950"
					: "border-slate-200 bg-slate-50 text-slate-700",
			)}
		>
			<div className="flex items-start gap-2">
				{hasLow ? (
					<AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
				) : (
					<Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-[#0f5384]" />
				)}
				<div className="min-w-0 space-y-1">
					<p className="font-medium">
						AI extraction review
						{pct !== null ? ` (${pct}% overall)` : ""}
					</p>
					<p className="text-xs">
						{filledCount} field{filledCount === 1 ? "" : "s"} auto-filled from
						the document. Confirm values before submitting.
					</p>
					{hasLow && (
						<p className="text-xs">
							Low confidence (&lt; {Math.round(LOW_EXTRACTION_CONFIDENCE * 100)}
							%): {lowConfidenceFields.join(", ")}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}

/** Border highlight for AI-filled form items. */
export function aiFieldItemClassName(
	fieldName: string,
	aiFilledFields: Set<string> | string[],
	fieldConfidence?: Record<string, number>,
): string | undefined {
	const filled =
		aiFilledFields instanceof Set
			? aiFilledFields.has(fieldName)
			: aiFilledFields.includes(fieldName);
	if (!filled) return undefined;
	const conf = fieldConfidence?.[fieldName] ?? 1;
	if (conf < LOW_EXTRACTION_CONFIDENCE) {
		return "rounded-md p-2 ring-1 ring-amber-400/70 bg-amber-50/40";
	}
	return "rounded-md p-2 ring-1 ring-[#0f5384]/25 bg-blue-50/30";
}

export function AiFilledLabelHint({
	fieldName,
	aiFilledFields,
	fieldConfidence,
}: {
	fieldName: string;
	aiFilledFields: Set<string> | string[];
	fieldConfidence?: Record<string, number>;
}) {
	const filled =
		aiFilledFields instanceof Set
			? aiFilledFields.has(fieldName)
			: aiFilledFields.includes(fieldName);
	if (!filled) return null;
	const conf = fieldConfidence?.[fieldName] ?? 1;
	const low = conf < LOW_EXTRACTION_CONFIDENCE;
	return (
		<span
			className={cn(
				"ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
				low ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-[#0f5384]",
			)}
		>
			{low ? "CAALM · review" : "CAALM filled"}
		</span>
	);
}
