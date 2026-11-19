import { AuditLabClient } from "@/components/audit-lab/AuditLabClient";
import { getLabServerContext } from "@/lib/audit-lab/get-lab-server-context";

export default async function AuditLabSimulationsPage() {
	const ctx = await getLabServerContext();
	return (
		<AuditLabClient surface="simulations" capabilities={ctx.capabilities} />
	);
}