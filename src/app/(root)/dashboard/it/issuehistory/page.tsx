export const dynamic = "force-dynamic";

import { History } from "lucide-react";
import { ITPageShell } from "@/components/it/ITPageShell";
import { IssueHistoryList } from "@/components/tickets/IssueHistoryList";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";
import { groupTicketsByMonthDay } from "@/lib/tickets/issue-history";
import { canViewAllTickets, filterVisibleTickets } from "@/lib/tickets/ticket-access.policy";
import { listTickets } from "@/lib/tickets/ticket.repository";
import { getOrganization } from "@/lib/rbac/organizations";
import { resolveOrgTimezone } from "@/lib/timezone";

export default async function IssueHistoryPage() {
	const user = await requirePagePermission(PERMISSIONS.TICKETS.VIEW);
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return null;
	}
	const permissions = await getUserPermissions(user.$id, org.orgId);
	const ownOnly = !canViewAllTickets(permissions);

	const resolved = await listTickets({
		orgId: org.orgId,
		status: "resolved",
		submittedByUserId: ownOnly ? user.$id : undefined,
		limit: 100,
	});

	const ctx = { userId: user.$id, permissions };
	const resolvedItems = filterVisibleTickets(resolved.items, ctx);
	const organization = await getOrganization(org.orgId);
	const timeZone = resolveOrgTimezone(
		typeof organization?.settings?.timezone === "string"
			? organization.settings.timezone
			: null,
	);
	const months = groupTicketsByMonthDay(resolvedItems, {}, timeZone);

	return (
		<ITPageShell
			title="Issue History"
			subtitle="Resolved issues grouped by month and day."
			icon={History}
		>
			<IssueHistoryList months={months} />
		</ITPageShell>
	);
}
