import Link from "next/link";
import { AuditLabShell } from "@/components/audit-lab/AuditLabShell";
import { getLabServerContext } from "@/lib/audit-lab/get-lab-server-context";
import { getEvidence } from "@/lib/audit-lab/repository";

export default async function AuditLabEvidenceDetailPage({
	params,
}: {
	params: Promise<{ itemId: string }>;
}) {
	const { itemId } = await params;
	const ctx = await getLabServerContext();
	const item = await getEvidence(ctx.orgId, itemId);
	if (!item) {
		return (
			<AuditLabShell
				title="Evidence"
				description="Item not found"
				capabilities={ctx.capabilities}
			>
				<Link href="/audit-lab/evidence" className="text-[#0f5384] text-sm">
					Back to matrix
				</Link>
			</AuditLabShell>
		);
	}
	return (
		<AuditLabShell
			title={item.title}
			description={`${item.controlRef ?? "Control"} · ${item.status}`}
			capabilities={ctx.capabilities}
		>
			<dl className="space-y-2 text-sm">
				<div>
					<dt className="text-slate-500">Department</dt>
					<dd>{item.department ?? "—"}</dd>
				</div>
				<div>
					<dt className="text-slate-500">Due</dt>
					<dd>{item.dueAt ?? "—"}</dd>
				</div>
			</dl>
		</AuditLabShell>
	);
}