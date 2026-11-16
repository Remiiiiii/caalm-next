import { AuditLabClient } from "@/components/audit-lab/AuditLabClient";
import { getLabServerContext } from "@/lib/audit-lab/get-lab-server-context";

export default async function AuditLabReportsPage() {
	const ctx = await getLabServerContext();
	return (
		<AuditLabClient surface="reports" capabilities={ctx.capabilities} />
	);
}