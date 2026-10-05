/**
 * One org-scoped IT snapshot for the hub overview and fleet table.
 * Uses existing plan counters — never invents host CPU or SLA uptime.
 */

import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	countActiveContracts,
	countActiveLicenses,
	countBillableUsers,
	getOrgPlanLimits,
	sumOrgStorageBytes,
} from "@/lib/billing/planLimits";
import { getCrmIntegration } from "@/lib/crm/integrations.repository";
import {
	parseOrgSettings,
	readTenantDeletionSettings,
} from "@/lib/portability/tenant-deletion-notice";
import { getOrganization } from "@/lib/rbac/organizations";
import { getAuditLogs } from "@/lib/services/audit-logger";
import { listTickets } from "@/lib/tickets/ticket.repository";
import type { OrgITSnapshot } from "@/lib/it/org-it-snapshot.types";

export type {
	OrgITFleetRow,
	OrgITRecentAudit,
	OrgITRecentTicket,
	OrgITSnapshot,
} from "@/lib/it/org-it-snapshot.types";
export { toFleetRow } from "@/lib/it/org-it-snapshot.types";

async function countTwoFactorForOrg(
	orgId: string,
): Promise<{ enabled: number; total: number } | null> {
	try {
		const { tablesDB } = await createAdminClient();
		const tableId = appwriteConfig.usersCollectionId || "users";
		let offset = 0;
		const pageSize = 100;
		let total = 0;
		let enabled = 0;
		for (;;) {
			const page = await tablesDB.listRows({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId,
				queries: [
					Query.equal("orgId", orgId),
					Query.select(["twoFactorEnabled"]),
					Query.limit(pageSize),
					Query.offset(offset),
				],
			});
			for (const row of page.rows) {
				total += 1;
				if ((row as { twoFactorEnabled?: boolean }).twoFactorEnabled === true) {
					enabled += 1;
				}
			}
			if (page.rows.length < pageSize) break;
			offset += pageSize;
			if (offset > 10_000) break;
		}
		return { enabled, total };
	} catch {
		return null;
	}
}

export async function buildOrgITSnapshot(orgId: string): Promise<OrgITSnapshot> {
	const [plan, org, tickets, audit, twoFactor, hubspot] = await Promise.all([
		getOrgPlanLimits(orgId),
		getOrganization(orgId),
		listTickets({ orgId, status: "active", limit: 8 }).catch(() => ({
			items: [],
			total: 0,
		})),
		getAuditLogs({ orgId, limit: 8 }).catch(() => []),
		countTwoFactorForOrg(orgId),
		getCrmIntegration(orgId, "hubspot").catch(() => null),
	]);

	const [usedUsers, usedContracts, usedLicenses, usedStorage] =
		await Promise.all([
			countBillableUsers(orgId).catch(() => null),
			countActiveContracts(orgId).catch(() => 0),
			countActiveLicenses(orgId).catch(() => 0),
			sumOrgStorageBytes(orgId).catch(() => 0),
		]);

	const settings = parseOrgSettings(org?.settings);
	const deletion = readTenantDeletionSettings(settings);
	const criticalOpen = tickets.items.filter(
		(ticket) => ticket.severity === "critical",
	).length;

	const notices: string[] = [
		"Host CPU and request telemetry are not configured for this tenant.",
	];
	if (deletion.deletionScheduledAt) {
		notices.push(
			`Tenant deletion is scheduled for ${deletion.deletionScheduledAt}.`,
		);
	}
	if (
		usedUsers != null &&
		Number.isFinite(plan.limits.maxUsers) &&
		usedUsers >= plan.limits.maxUsers
	) {
		notices.push("Staff seats are at or over the plan limit.");
	}
	if (
		Number.isFinite(plan.limits.storageBytes) &&
		usedStorage >= plan.limits.storageBytes
	) {
		notices.push("File storage is at or over the plan limit.");
	}

	return {
		orgId,
		name: org?.name || orgId,
		status: org?.status || "unknown",
		tier: plan.tier,
		billingStatus: org?.billingStatus ?? null,
		deletionScheduledAt: deletion.deletionScheduledAt || null,
		users: { used: usedUsers, limit: plan.limits.maxUsers },
		twoFactor,
		storage: {
			usedBytes: usedStorage,
			limitBytes: plan.limits.storageBytes,
		},
		contracts: {
			used: usedContracts,
			limit: plan.limits.maxContracts,
		},
		licenses: {
			used: usedLicenses,
			limit: plan.limits.maxLicenses,
		},
		tickets: {
			open: tickets.total,
			criticalOpen,
			recent: tickets.items.map((ticket) => ({
				id: ticket.$id,
				ticketNumber: ticket.ticketNumber,
				title: ticket.title,
				severity: ticket.severity,
				status: ticket.status,
			})),
		},
		audit: {
			recent: audit.map((entry) => ({
				eventTitle: entry.event_title,
				action: entry.action,
				userName: entry.user_name,
				createdAt: entry.created_at,
			})),
		},
		integrations: {
			hubspotStatus: hubspot?.status ?? null,
		},
		notices,
	};
}
