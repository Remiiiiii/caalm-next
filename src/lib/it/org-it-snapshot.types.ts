/**
 * Client-safe IT hub snapshot types and fleet-row mapping.
 * Keep this file free of server-only imports so tests and UI can use it.
 */

export type OrgITRecentTicket = {
	id: string;
	ticketNumber?: string | null;
	title: string;
	severity: string;
	status: string;
};

export type OrgITRecentAudit = {
	eventTitle: string;
	action: string;
	userName: string;
	createdAt?: string;
};

export type OrgITSnapshot = {
	orgId: string;
	name: string;
	status: string;
	tier: string;
	billingStatus: string | null;
	deletionScheduledAt: string | null;
	users: { used: number | null; limit: number };
	twoFactor: { enabled: number; total: number } | null;
	storage: { usedBytes: number; limitBytes: number };
	contracts: { used: number; limit: number };
	licenses: { used: number; limit: number };
	tickets: {
		open: number;
		criticalOpen: number;
		recent: OrgITRecentTicket[];
	};
	audit: { recent: OrgITRecentAudit[] };
	integrations: {
		hubspotStatus: string | null;
	};
	notices: string[];
};

export type OrgITFleetRow = {
	orgId: string;
	name: string;
	tier: string;
	status: string;
	usersUsed: number | null;
	usersLimit: number;
	storageUsedBytes: number;
	storageLimitBytes: number;
	openTickets: number;
	criticalOpen: number;
	deletionScheduledAt: string | null;
	billingStatus: string | null;
};

export function toFleetRow(snapshot: OrgITSnapshot): OrgITFleetRow {
	return {
		orgId: snapshot.orgId,
		name: snapshot.name,
		tier: snapshot.tier,
		status: snapshot.status,
		usersUsed: snapshot.users.used,
		usersLimit: snapshot.users.limit,
		storageUsedBytes: snapshot.storage.usedBytes,
		storageLimitBytes: snapshot.storage.limitBytes,
		openTickets: snapshot.tickets.open,
		criticalOpen: snapshot.tickets.criticalOpen,
		deletionScheduledAt: snapshot.deletionScheduledAt,
		billingStatus: snapshot.billingStatus,
	};
}
