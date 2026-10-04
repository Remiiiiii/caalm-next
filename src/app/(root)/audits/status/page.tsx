"use client";

export const dynamic = "force-dynamic";

import { ClipboardCheck } from "lucide-react";
import { AuditControlsTabs } from "@/components/audits/AuditControlsTabs";
import { AuditPageShell } from "@/components/audits/AuditPageShell";
import { ComplianceOverviewPanel } from "@/components/audits/ComplianceOverviewPanel";
import { SampleDataBadge } from "@/components/ui/sample-data-badge";
import { useComplianceStatus } from "@/hooks/useComplianceStatus";
import { USE_AUDIT_MOCK_DATA } from "@/lib/audits/mock-data";

export default function AuditStatusPage() {
	const { snapshot, isLoading } = useComplianceStatus();

	return (
		<AuditPageShell
			title="Compliance status"
			subtitle="Nonprofit compliance posture across regulatory filings, contracts, licenses, documents, and governance — aligned with CAALM modules."
			actions={
				USE_AUDIT_MOCK_DATA ? <SampleDataBadge tone="demo" /> : undefined
			}
		>
			<ComplianceOverviewPanel snapshot={snapshot} isLoading={isLoading} />

			<div className="mb-6 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
				<ClipboardCheck className="h-4 w-4 text-[#0f5384] shrink-0 mt-0.5" />
				<span className="min-w-0">
					{USE_AUDIT_MOCK_DATA
						? "Contracts and licenses pull live data from your organization. Regulatory, document, and governance metrics may include illustrative sample data (DEMO mode) until those workflows are fully connected."
						: "Contracts and licenses pull live data from your organization. Domains that are not connected yet show empty states — not fake numbers."}
				</span>
			</div>

			<AuditControlsTabs />
		</AuditPageShell>
	);
}
