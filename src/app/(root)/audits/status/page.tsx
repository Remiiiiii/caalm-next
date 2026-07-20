"use client";

export const dynamic = "force-dynamic";

import { ClipboardCheck } from "lucide-react";
import { AuditControlsTabs } from "@/components/audits/AuditControlsTabs";
import { AuditPageShell } from "@/components/audits/AuditPageShell";
import { ComplianceOverviewPanel } from "@/components/audits/ComplianceOverviewPanel";
import { useComplianceStatus } from "@/hooks/useComplianceStatus";

export default function AuditStatusPage() {
	const { snapshot, isLoading } = useComplianceStatus();

	return (
		<AuditPageShell
			title="Compliance status"
			subtitle="Nonprofit compliance posture across regulatory filings, contracts, licenses, documents, and governance — aligned with CAALM modules."
		>
			<ComplianceOverviewPanel snapshot={snapshot} isLoading={isLoading} />

			<div className="mb-6 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
				<ClipboardCheck className="h-4 w-4 text-[#0f5384] shrink-0 mt-0.5" />
				<span className="min-w-0">
					Contracts and licenses pull live data from your organization.
					Regulatory, document, and governance metrics reflect standard nonprofit
					KRIs until those workflows are fully connected in CAALM.
				</span>
			</div>

			<AuditControlsTabs />
		</AuditPageShell>
	);
}
