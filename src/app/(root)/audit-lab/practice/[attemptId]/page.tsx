import Link from "next/link";
import { AuditLabShell } from "@/components/audit-lab/AuditLabShell";
import { getLabServerContext } from "@/lib/audit-lab/get-lab-server-context";
import { getAttempt } from "@/lib/audit-lab/repository";

export default async function AuditLabPracticeDetailPage({
	params,
}: {
	params: Promise<{ attemptId: string }>;
}) {
	const { attemptId } = await params;
	const ctx = await getLabServerContext();
	const attempt = await getAttempt(ctx.orgId, attemptId);
	if (!attempt) {
		return (
			<AuditLabShell
				title="Practice"
				description="Attempt not found"
				capabilities={ctx.capabilities}
			>
				<Link href="/audit-lab/practice" className="text-[#0f5384] text-sm">
					Back to practice
				</Link>
			</AuditLabShell>
		);
	}
	return (
		<AuditLabShell
			title="Practice attempt"
			description={`Persona ${attempt.persona} · ${attempt.status}`}
			capabilities={ctx.capabilities}
		>
			<p className="text-sm text-slate-600">
				Scores and transcript stay on this record for your org retention policy.
			</p>
		</AuditLabShell>
	);
}