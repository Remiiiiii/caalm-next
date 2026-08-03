"use client";

import { ScrollText } from "lucide-react";
import Link from "next/link";
import { ITGlassPanel, ITPageShell } from "@/components/it/ITPageShell";
import { Button } from "@/components/ui/button";

export default function ITSecurityAuditLogsPage() {
	return (
		<ITPageShell
			title="Security Audit Logs"
			subtitle="Organization audit trail for compliance and incident review"
			icon={ScrollText}
		>
			<ITGlassPanel>
				<p className="text-sm text-slate-600 mb-4">
					Full audit log filtering, charts, and export live in the Audits
					module. Open Audit Logs with your IT system-log permission to review
					events.
				</p>
				<Button asChild className="primary-btn px-3 sm:px-4 cursor-pointer">
					<Link href="/audits/audit">Open Audit Logs</Link>
				</Button>
			</ITGlassPanel>
		</ITPageShell>
	);
}
