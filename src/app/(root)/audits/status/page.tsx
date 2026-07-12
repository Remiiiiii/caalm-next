"use client";

export const dynamic = "force-dynamic";

import { ClipboardCheck } from "lucide-react";
import { AuditControlsTabs } from "@/components/audits/AuditControlsTabs";
import { AuditPageShell } from "@/components/audits/AuditPageShell";

export default function AuditStatusPage() {
	return (
		<AuditPageShell
			title="Compliance controls"
			subtitle="Monitor financial statements, supporting documents, administrative controls, IT access, and vendor RFP lifecycle."
		>
			<div className="mb-6 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
				<ClipboardCheck className="h-4 w-4 text-[#0f5384] shrink-0" />
				<span>
					Charts and tables use sample data for testing. Live audit logs are
					available on the Audit Logs page.
				</span>
			</div>
			<AuditControlsTabs />
		</AuditPageShell>
	);
}
