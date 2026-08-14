export const dynamic = "force-dynamic";

import { TicketSubmitForm } from "@/components/tickets/TicketSubmitForm";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function NewTicketPage() {
	await requirePagePermission(PERMISSIONS.TICKETS.CREATE);

	return (
		<div className="dashboard-container">
			<div className="mb-6 flex w-full items-center justify-start gap-4 self-start">
				<h1 className="h1 capitalize sidebar-gradient-text">Report an issue</h1>
			</div>
			<TicketSubmitForm />
		</div>
	);
}
