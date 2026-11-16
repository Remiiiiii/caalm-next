import { AuditPageShell } from "@/components/audits/AuditPageShell";
import { getLabServerContext } from "@/lib/audit-lab/get-lab-server-context";

export default async function AuditLabLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	await getLabServerContext();
	return (
		<AuditPageShell
			title="Audit Lab"
			subtitle="Mock-audit rehearsal: sessions, scripts, evidence, and practice."
		>
			{children}
		</AuditPageShell>
	);
}