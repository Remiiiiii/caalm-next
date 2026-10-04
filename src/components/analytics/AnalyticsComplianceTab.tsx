"use client";

import { ClipboardCheck } from "lucide-react";
import { AnalyticsInsightsList } from "@/components/analytics/AnalyticsInsightsList";
import { DomainReadinessGrid } from "@/components/analytics/DomainReadinessGrid";
import { EvidenceGapsTable } from "@/components/analytics/EvidenceGapsTable";
import { RiskSeverityPanel } from "@/components/analytics/RiskSeverityPanel";
import { ComplianceOverviewPanel } from "@/components/audits/ComplianceOverviewPanel";
import { SampleDataBadge } from "@/components/ui/sample-data-badge";
import { useAuditReadiness } from "@/hooks/useAuditReadiness";
import { USE_AUDIT_MOCK_DATA } from "@/lib/audits/mock-data";
import type { AuditPeriod } from "@/lib/audits/types";

interface AnalyticsComplianceTabProps {
	period?: AuditPeriod;
}

export function AnalyticsComplianceTab({
	period = "30d",
}: AnalyticsComplianceTabProps) {
	const { summary, isLoading } = useAuditReadiness({ period });

	return (
		<div className="space-y-6">
			<div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
				<ClipboardCheck className="h-4 w-4 text-[#0f5384] shrink-0 mt-0.5" />
				<span className="min-w-0 flex-1">
					{USE_AUDIT_MOCK_DATA
						? "Contracts and licenses pull live data from your organization. Regulatory, document, and governance metrics may include illustrative sample data until those workflows are fully connected."
						: "Contracts and licenses pull live data from your organization. Domains that are not connected yet stay empty — CAALM does not invent fake compliance numbers."}
				</span>
				{USE_AUDIT_MOCK_DATA ? (
					<SampleDataBadge className="shrink-0" />
				) : null}
			</div>

			<ComplianceOverviewPanel
				snapshot={summary?.complianceSnapshot ?? null}
				isLoading={isLoading}
			/>

			<div className="grid grid-cols-2 gap-6">
				<RiskSeverityPanel
					severity={summary?.severity ?? { critical: 0, moderate: 0, low: 0 }}
					isLoading={isLoading}
				/>
				<AnalyticsInsightsList
					insights={summary?.insights ?? []}
					isLoading={isLoading}
				/>
			</div>

			<DomainReadinessGrid
				domains={summary?.domains ?? []}
				isLoading={isLoading}
			/>

			<EvidenceGapsTable
				rows={summary?.evidenceGaps ?? []}
				isLoading={isLoading}
			/>
		</div>
	);
}
