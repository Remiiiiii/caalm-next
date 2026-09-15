import { appwriteConfig } from "@/lib/appwrite/config";

export type OrgExportOrgField = "orgId" | "organizationId";

export type OrgExportEntry = {
	key: string;
	tableId: string;
	orgField: OrgExportOrgField;
};

function entry(
	key: string,
	tableId: string | undefined,
	orgField: OrgExportOrgField = "orgId",
): OrgExportEntry | null {
	if (!tableId) return null;
	return { key, tableId, orgField };
}

/**
 * Org-scoped tables for tenant export (and demo org wipe).
 * Skips platform-global tables, Auth secrets, and storage blobs.
 */
export function getOrgExportCatalog(): OrgExportEntry[] {
	const rows = [
		entry("contracts", appwriteConfig.contractsCollectionId),
		entry(
			"contractsEnterpriseMetadata",
			appwriteConfig.contractsEnterpriseMetadataCollectionId,
		),
		entry("contractExtensions", appwriteConfig.contractExtensionsCollectionId),
		entry("contractDrafts", appwriteConfig.contractDraftsCollectionId),
		entry("licenses", appwriteConfig.licensesCollectionId),
		entry("licenseDrafts", appwriteConfig.licenseDraftsCollectionId),
		entry("clauses", appwriteConfig.clausesCollectionId),
		entry("contractTemplates", appwriteConfig.contractTemplatesCollectionId),
		entry(
			"contractWizardSessions",
			appwriteConfig.contractWizardSessionsCollectionId,
		),
		entry(
			"contractDocumentVersions",
			appwriteConfig.contractDocumentVersionsCollectionId,
		),
		entry(
			"contractNegotiationComments",
			appwriteConfig.contractNegotiationCommentsCollectionId,
		),
		entry(
			"contractNegotiationAccess",
			appwriteConfig.contractNegotiationAccessCollectionId,
		),
		entry("calendarEvents", appwriteConfig.calendarEventsCollectionId),
		entry(
			"calendarApprovalRequests",
			appwriteConfig.calendarApprovalRequestsCollectionId,
		),
		entry(
			"calendarPermissionOverrides",
			appwriteConfig.calendarPermissionOverridesCollectionId,
		),
		entry(
			"calendarIntegrations",
			appwriteConfig.calendarIntegrationsCollectionId,
		),
		entry(
			"sharedCalendars",
			appwriteConfig.sharedCalendarsCollectionId,
			"organizationId",
		),
		entry(
			"calendarResources",
			appwriteConfig.calendarResourcesCollectionId,
			"organizationId",
		),
		entry("resourceBookings", appwriteConfig.resourceBookingsCollectionId),
		entry("calendarReminders", appwriteConfig.calendarRemindersCollectionId),
		entry("escalationRules", appwriteConfig.escalationRulesCollectionId),
		entry("escalationJobs", appwriteConfig.escalationJobsCollectionId),
		entry("newsArticles", appwriteConfig.newsArticlesCollectionId),
		entry("notes", appwriteConfig.notesCollectionId),
		entry("notifications", appwriteConfig.notificationsCollectionId),
		entry("recentActivity", appwriteConfig.recentActivityCollectionId),
		entry("files", appwriteConfig.filesCollectionId),
		entry("reports", appwriteConfig.reportsCollectionId),
		entry("auditLogs", appwriteConfig.auditLogsCollectionId),
		entry("audits", appwriteConfig.auditsCollectionId),
		entry(
			"auditReadinessSnapshots",
			appwriteConfig.auditReadinessSnapshotsCollectionId,
		),
		entry("auditEvidenceMap", appwriteConfig.auditEvidenceMapCollectionId),
		entry("tasks", appwriteConfig.tasksCollectionId),
		entry("tickets", appwriteConfig.ticketsCollectionId),
		entry("ticketEvents", appwriteConfig.ticketEventsCollectionId),
		entry("ticketSequences", appwriteConfig.ticketSequencesCollectionId),
		entry("invitations", appwriteConfig.invitationsCollectionId),
		entry(
			"assistantConversations",
			appwriteConfig.assistantConversationsCollectionId,
		),
		entry("assistantMessages", appwriteConfig.assistantMessagesCollectionId),
		entry("orgUnits", appwriteConfig.orgUnitsCollectionId),
		entry("costCenters", appwriteConfig.costCentersCollectionId),
		entry("orgUnitHistory", appwriteConfig.orgUnitHistoryCollectionId),
		entry("fundingPursuits", appwriteConfig.fundingPursuitsCollectionId),
		entry(
			"contractObligations",
			appwriteConfig.contractObligationsCollectionId,
		),
		entry("crmIntegrations", appwriteConfig.crmIntegrationsCollectionId),
		entry("crmOriginLinks", appwriteConfig.crmOriginLinksCollectionId),
		entry(
			"approvalSlaPolicies",
			appwriteConfig.approvalSlaPoliciesCollectionId,
		),
		entry(
			"approvalWorkflowTemplates",
			appwriteConfig.approvalWorkflowTemplatesCollectionId,
		),
		entry(
			"approvalDelegations",
			appwriteConfig.approvalDelegationsCollectionId,
		),
		entry(
			"approvalActionTokens",
			appwriteConfig.approvalActionTokensCollectionId,
		),
		entry(
			"documentExpirationAttestations",
			appwriteConfig.documentExpirationAttestationsCollectionId,
		),
		entry("signatureEnvelopes", appwriteConfig.signatureEnvelopesCollectionId),
		entry("webhookDeliveries", appwriteConfig.webhookDeliveriesCollectionId),
		entry("userOrganizations", "user_organizations"),
		entry("userRoles", "user_roles"),
		entry("users", appwriteConfig.usersCollectionId || "users"),
	].filter((row): row is OrgExportEntry => row !== null);

	const seen = new Set<string>();
	return rows.filter((row) => {
		if (seen.has(row.key)) return false;
		seen.add(row.key);
		return true;
	});
}
