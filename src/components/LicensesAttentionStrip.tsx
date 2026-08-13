"use client";

import { AlertTriangle } from "lucide-react";
import { useMemo } from "react";
import { useLicensesView } from "@/components/LicensesView";
import { Button } from "@/components/ui/button";
import { computeLicenseMetrics } from "@/lib/licenses/licensesListUtils";
import type { License } from "@/types/licenses";

interface LicensesAttentionStripProps {
	licenses: License[];
}

export default function LicensesAttentionStrip({
	licenses,
}: LicensesAttentionStripProps) {
	const { setStatusTab, scrollToList } = useLicensesView();

	const metrics = useMemo(() => computeLicenseMetrics(licenses), [licenses]);

	const total =
		metrics.totalExpiring +
		metrics.actionRequiredCount +
		metrics.complianceAtRiskCount;

	if (total === 0) return null;

	return (
		<div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-orange/20 bg-orange/10 px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300">
			<div className="flex items-start gap-3 min-w-0">
				<AlertTriangle className="h-5 w-5 text-orange shrink-0 mt-0.5" />
				<div>
					<p className="text-sm font-semibold text-slate-700">
						Needs attention
					</p>
					<p className="text-xs text-slate-600 mt-0.5">
						{metrics.totalExpiring > 0 && (
							<span>{metrics.totalExpiring} expiring within 90 days</span>
						)}
						{metrics.totalExpiring > 0 &&
							(metrics.actionRequiredCount > 0 ||
								metrics.complianceAtRiskCount > 0) &&
							" · "}
						{metrics.actionRequiredCount > 0 && (
							<span>{metrics.actionRequiredCount} action required</span>
						)}
						{metrics.actionRequiredCount > 0 &&
							metrics.complianceAtRiskCount > 0 &&
							" · "}
						{metrics.complianceAtRiskCount > 0 && (
							<span>{metrics.complianceAtRiskCount} compliance at risk</span>
						)}
					</p>
				</div>
			</div>
			<div className="flex items-center gap-2 flex-wrap">
				{metrics.totalExpiring > 0 && (
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="cursor-pointer border-orange/30 hover:bg-orange/10"
						onClick={() => {
							setStatusTab("expiring");
							scrollToList();
						}}
					>
						View expiring
					</Button>
				)}
				{metrics.actionRequiredCount > 0 && (
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="cursor-pointer border-orange/30 hover:bg-orange/10"
						onClick={() => {
							setStatusTab("action-required");
							scrollToList();
						}}
					>
						View action required
					</Button>
				)}
				{metrics.complianceAtRiskCount > 0 && (
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="cursor-pointer border-orange/30 hover:bg-orange/10"
						onClick={() => {
							setStatusTab("compliance-risk");
							scrollToList();
						}}
					>
						View compliance risk
					</Button>
				)}
			</div>
		</div>
	);
}
