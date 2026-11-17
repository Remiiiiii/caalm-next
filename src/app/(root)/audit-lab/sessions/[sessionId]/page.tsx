import Link from "next/link";
import { AuditLabShell } from "@/components/audit-lab/AuditLabShell";
import { getLabServerContext } from "@/lib/audit-lab/get-lab-server-context";
import { getSession } from "@/lib/audit-lab/repository";
import { sessionInScope } from "@/lib/audit-lab/access";

export default async function AuditLabSessionDetailPage({
	params,
}: {
	params: Promise<{ sessionId: string }>;
}) {
	const { sessionId } = await params;
	const ctx = await getLabServerContext();
	const session = await getSession(ctx.orgId, sessionId);
	if (!session || !sessionInScope(session.department, ctx.capabilities.scope)) {
		return (
			<AuditLabShell
				title="Simulation"
				description="This simulation is not available for your access level."
				capabilities={ctx.capabilities}
			>
				<p className="text-sm text-slate-600">
					<Link href="/audit-lab/sessions" className="text-[#0f5384]">
						Back to simulations
					</Link>
				</p>
			</AuditLabShell>
		);
	}
	return (
		<AuditLabShell
			title={session.title}
			description={`${session.department} · ${session.status}`}
			capabilities={ctx.capabilities}
		>
			<dl className="space-y-2 text-sm text-slate-700">
				<div>
					<dt className="text-slate-500">Framework</dt>
					<dd>{session.framework ?? "—"}</dd>
				</div>
				<div>
					<dt className="text-slate-500">Scheduled</dt>
					<dd>{session.scheduledAt ?? "Draft"}</dd>
				</div>
				<div>
					<dt className="text-slate-500">Prep deadline</dt>
					<dd>{session.prepDeadlineAt ?? "—"}</dd>
				</div>
			</dl>
			<p className="mt-4">
				<Link href="/audit-lab/interview" className="text-[#0f5384] font-medium">
					Open Interview Builder
				</Link>
			</p>
		</AuditLabShell>
	);
}