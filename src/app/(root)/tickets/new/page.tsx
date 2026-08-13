export const dynamic = "force-dynamic";

import { TicketSubmitForm } from "@/components/tickets/TicketSubmitForm";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function NewTicketPage() {
	await requirePagePermission(PERMISSIONS.TICKETS.CREATE);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="mb-4 flex w-full items-center justify-start gap-4 self-start">
				<h1 className="h1 capitalize sidebar-gradient-text">Report an issue</h1>
			</div>
			<p className="mb-6 text-sm text-slate-600">
				Your name and department are taken from your account. They cannot be
				changed on this form.
			</p>
			<TicketSubmitForm />
		</div>
	);
}
