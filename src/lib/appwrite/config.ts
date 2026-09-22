// Test/CI fallback values when secrets are not configured.
// When a defaultValue is supplied the result is always a string, so callers
// that pass a fallback get a `string` (not `string | undefined`).
function getTestFallback(key: string, defaultValue: string): string;
function getTestFallback(
	key: string,
	defaultValue?: string,
): string | undefined;
function getTestFallback(
	key: string,
	defaultValue?: string,
): string | undefined {
	if (process.env.CI || process.env.NODE_ENV === "test") {
		// In CI/test, use test values if env var is not set
		return (
			process.env[key] ||
			defaultValue ||
			`test-${key
				.toLowerCase()
				.replace(/next_public_/g, "")
				.replace(/_/g, "-")}`
		);
	}
	return process.env[key] || defaultValue;
}

export const appwriteConfig = {
	endpointUrl:
		process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
		(process.env.CI || process.env.NODE_ENV === "test"
			? "https://cloud.appwrite.io/v1"
			: "https://fra.cloud.appwrite.io/v1"),

	projectId: getTestFallback("NEXT_PUBLIC_APPWRITE_PROJECT", "test-project-id"),

	databaseId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_DATABASE",
		"test-database-id",
	),

	usersCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_USERS_COLLECTION",
		"test-users",
	),

	filesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_FILES_COLLECTION",
		"test-files",
	),

	contractsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CONTRACTS_COLLECTION",
		"test-contracts",
	),

	contractsEnterpriseMetadataCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CONTRACTS_ENTERPRISE_METADATA_COLLECTION",
		"test-contracts-enterprise-metadata",
	),

	contractExtensionsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CONTRACT_EXTENSIONS_COLLECTION",
		"test-contract-extensions",
	),

	contractDraftsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CONTRACT_DRAFTS_COLLECTION",
		"test-contract-drafts",
	),

	calendarEventsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CALENDAR_EVENTS_COLLECTION",
		"test-calendar-events",
	),

	recentActivityCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_RECENT_ACTIVITIES_COLLECTION",
		"test-recent-activities",
	),

	invitationsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_INVITATIONS_COLLECTION",
		"test-invitations",
	),

	reportsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_REPORTS_COLLECTION",
		"test-reports",
	),

	licensesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_LICENSES_COLLECTION",
		"test-licenses",
	),

	licenseDraftsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_LICENSE_DRAFTS_COLLECTION",
		"test-license-drafts",
	),

	/** Org clause library (name: clauses) */
	clausesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CLAUSES_COLLECTION",
		"test-clauses",
	),

	/** Contract recipes that reference clause families (name: contract_templates) */
	contractTemplatesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CONTRACT_TEMPLATES_COLLECTION",
		"test-contract-templates",
	),

	/** Guided create-from-template wizard drafts (name: contract_wizard_sessions) */
	contractWizardSessionsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CONTRACT_WIZARD_SESSIONS_COLLECTION",
		"test-contract-wizard-sessions",
	),

	/** Contract document snapshots for negotiation diffs (name: contract_document_versions) */
	contractDocumentVersionsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CONTRACT_DOCUMENT_VERSIONS_COLLECTION",
		"test-contract-document-versions",
	),

	/** Inline comments / redlines on a draft (name: contract_negotiation_comments) */
	contractNegotiationCommentsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CONTRACT_NEGOTIATION_COMMENTS_COLLECTION",
		"test-contract-negotiation-comments",
	),

	/** Hashed counterparty invite tokens (name: contract_negotiation_access) */
	contractNegotiationAccessCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CONTRACT_NEGOTIATION_ACCESS_COLLECTION",
		"test-contract-negotiation-access",
	),

	tasksCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION",
		"test-tasks",
	),

	permissionsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_PERMISSIONS_COLLECTION",
		"test-permissions",
	),

	otpTokensCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_OTPTOKENS_COLLECTION",
		"test-otp-tokens",
	),

	notificationsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION",
		"test-notifications",
	),

	notificationTypesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_NOTIFICATION_TYPES_COLLECTION",
		"test-notification-types",
	),

	notificationSettingsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_NOTIFICATION_SETTINGS_COLLECTION",
		"test-notification-settings",
	),

	pushSubscriptionsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_PUSH_SUBSCRIPTIONS_COLLECTION",
		"test-push-subscriptions",
	),

	smsFormSubmissionsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_SMS_FORM_SUBMISSIONS_COLLECTION",
		"test-sms-form-submissions",
	),

	notificationDigestQueueCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_NOTIFICATION_DIGEST_QUEUE_COLLECTION",
		"test-notification-digest-queue",
	),

	notesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION",
		"test-notes",
	),

	assistantConversationsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_ASSISTANT_CONVERSATIONS_COLLECTION",
		"test-assistant-conversations",
	),

	assistantMessagesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_ASSISTANT_MESSAGES_COLLECTION",
		"test-assistant-messages",
	),

	calendarApprovalRequestsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CALENDAR_APPROVALS_COLLECTION",
		"test-calendar-approvals",
	),

	calendarPermissionOverridesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CALENDAR_PERMISSION_OVERRIDES_COLLECTION",
		"test-calendar-permission-overrides",
	),

	bucketId: getTestFallback("NEXT_PUBLIC_APPWRITE_BUCKET", "test-bucket"),

	/** Agreement blueprints + wizard draft artifacts (name: contract_blueprints) */
	contractBlueprintsBucketId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CONTRACT_BLUEPRINTS_BUCKET",
		"test-contract-blueprints-bucket",
	),

	profilePicturesBucketId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_PROFILE_PICTURES_BUCKET",
		"test-profile-pictures-bucket",
	),

	/** Optional company logos for agreement letterheads (name: organization_logos) */
	organizationLogosBucketId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_ORGANIZATION_LOGOS_BUCKET",
		"test-organization-logos-bucket",
	),

	auditLogsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_AUDIT_LOGS_COLLECTION",
		"test-audit-logs",
	),

	auditsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_AUDITS_COLLECTION",
		"test-audits",
	),

	/** Customer-facing audit readiness snapshots (name: audit_readiness_snapshots) */
	auditReadinessSnapshotsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_AUDIT_READINESS_SNAPSHOTS_COLLECTION",
	),

	/** Evidence map rows for audit prep (name: audit_evidence_map) */
	auditEvidenceMapCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_AUDIT_EVIDENCE_MAP_COLLECTION",
	),

	secretKey: getTestFallback("NEXT_APPWRITE_API_KEY", "test-api-key-for-ci"),

	govApiKey: process.env.GOV_API_KEY,

	// Twilio SMS configuration
	twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
	twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
	twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,

	// Microsoft Calendar Integration
	microsoftClientId: process.env.MICROSOFT_CLIENT_ID,
	microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET,
	microsoftTenantId: process.env.MICROSOFT_TENANT_ID,
	microsoftRedirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI,

	// Calendar Integrations Collection
	calendarIntegrationsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CALENDAR_INTEGRATIONS_COLLECTION",
		"test-calendar-integrations",
	),

	// Shared Calendars
	sharedCalendarsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_SHARED_CALENDARS_COLLECTION",
		"test-shared-calendars",
	),

	// Resource Management
	calendarResourcesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CALENDAR_RESOURCES_COLLECTION",
		"test-calendar-resources",
	),
	resourceBookingsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_RESOURCE_BOOKINGS_COLLECTION",
		"test-resource-bookings",
	),

	calendarRemindersCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CALENDAR_REMINDERS_COLLECTION",
		"test-calendar-reminders",
	),
	escalationRulesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_ESCALATION_RULES_COLLECTION",
		"test-escalation-rules",
	),
	escalationJobsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_ESCALATION_JOBS_COLLECTION",
		"test-escalation-jobs",
	),

	// News Articles
	newsArticlesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_NEWS_ARTICLES_COLLECTION",
		"test-news-articles",
	),
	newsVersionsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_NEWS_VERSIONS_COLLECTION",
		"test-news-versions",
	),

	// IT Runbooks
	runbooksCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_RUNBOOKS_COLLECTION",
		"test-runbooks",
	),

	ticketsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_TICKETS_COLLECTION",
		"test-tickets",
	),

	ticketEventsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_TICKET_EVENTS_COLLECTION",
		"test-ticket-events",
	),

	/** Per-org year counters for TKT-YYYY-#### numbers (name: ticket_sequences). */
	ticketSequencesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_TICKET_SEQUENCES_COLLECTION",
		"test-ticket-sequences",
	),

	webhookDeliveriesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_WEBHOOK_DELIVERIES_COLLECTION",
		"test-webhook-deliveries",
	),

	ticketAttachmentsBucketId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_TICKET_ATTACHMENTS_BUCKET",
		"test-ticket-attachments-bucket",
	),

	orgUnitsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_ORG_UNITS_COLLECTION",
		"test-org-units",
	),

	costCentersCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_COST_CENTERS_COLLECTION",
		"test-cost-centers",
	),

	orgUnitHistoryCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_ORG_UNIT_HISTORY_COLLECTION",
		"test-org-unit-history",
	),

	/** CLM Completion Roadmap — IDs come from env; test fallbacks only for CI */
	roadmapSectionsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_ROADMAP_SECTIONS_COLLECTION",
		"test-roadmap-sections",
	),
	roadmapTasksCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_ROADMAP_TASKS_COLLECTION",
		"test-roadmap-tasks",
	),
	roadmapTestRunsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_ROADMAP_TEST_RUNS_COLLECTION",
		"test-roadmap-test-runs",
	),
	roadmapStatusLogCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_ROADMAP_STATUS_LOG_COLLECTION",
		"test-roadmap-status-log",
	),

	/** Funding pursuits pipeline (name: funding_pursuits) */
	fundingPursuitsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_FUNDING_PURSUITS_COLLECTION",
		"test-funding-pursuits",
	),

	/** Constituent CRM people file (name: constituents) */
	constituentsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CONSTITUENTS_COLLECTION",
		"69c8d4f100a8c4d1e2f0",
	),

	/** Household / relationship edges (name: constituent_relationships) */
	constituentRelationshipsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CONSTITUENT_RELATIONSHIPS_COLLECTION",
		"69c8e8a1001f4e8c2a10",
	),

	/** Timeline notes on a constituent (name: constituent_notes) */
	constituentNotesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CONSTITUENT_NOTES_COLLECTION",
		"69c8e8a2001f4e8c2a11",
	),

	/** Posted and draft gifts (name: gifts) */
	giftsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_GIFTS_COLLECTION",
		"69d91201001f4e8c2b01",
	),

	/** Fundraising campaigns (name: campaigns) */
	campaignsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CAMPAIGNS_COLLECTION",
		"69d91202001f4e8c2b02",
	),

	/** Per-org receipt sequence (name: gift_receipt_counters) */
	giftReceiptCountersCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_GIFT_RECEIPT_COUNTERS_COLLECTION",
		"69d91203001f4e8c2b03",
	),

	/** Gift designations → fundCode (name: gift_designations) */
	giftDesignationsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_GIFT_DESIGNATIONS_COLLECTION",
		"69d91401001f4e8c2b04",
	),

	/** Recurring sustainer schedules (name: recurring_gift_schedules) */
	recurringGiftSchedulesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_RECURRING_GIFT_SCHEDULES_COLLECTION",
		"69d91402001f4e8c2b05",
	),

	/** Pledges (name: pledges) */
	pledgesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_PLEDGES_COLLECTION",
		"69d91403001f4e8c2b06",
	),

	/** Pledge installment rows (name: pledge_installments) */
	pledgeInstallmentsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_PLEDGE_INSTALLMENTS_COLLECTION",
		"69d91404001f4e8c2b07",
	),

	/** Soft-credit recognition rows (name: gift_soft_credits) */
	giftSoftCreditsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_GIFT_SOFT_CREDITS_COLLECTION",
		"69d91405001f4e8c2b08",
	),

	/** Stored RFM lifecycle segment per constituent (name: constituent_segments) */
	constituentSegmentsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CONSTITUENT_SEGMENTS_COLLECTION",
		"69d91501001f4e8c2b09",
	),

	/** Imported wealth-screen rows (name: constituent_wealth_screens) */
	constituentWealthScreensCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CONSTITUENT_WEALTH_SCREENS_COLLECTION",
		"69d91601001f4e8c2b10",
	),

	/** Org fund records (name: org_funds) */
	orgFundsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_ORG_FUNDS_COLLECTION",
		"69d91701001f4e8c2b11",
	),

	/** Grant budget lines (name: grant_budget_lines) */
	grantBudgetLinesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_GRANT_BUDGET_LINES_COLLECTION",
		"69d91702001f4e8c2b12",
	),

	/** Grant contract → fundId (name: contract_grant_funds; Contracts table is at column cap) */
	contractGrantFundsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CONTRACT_GRANT_FUNDS_COLLECTION",
		"69d91703001f4e8c2b13",
	),

	/** 990 Part IX category mappings (name: form_990_expense_mappings) */
	form990ExpenseMappingsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_FORM_990_EXPENSE_MAPPINGS_COLLECTION",
		"69d91801001f4e8c2b14",
	),

	/** ASC 958 restriction release events (name: restriction_releases) */
	restrictionReleasesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_RESTRICTION_RELEASES_COLLECTION",
		"69d91802001f4e8c2b15",
	),

	/** Contract obligations for retention (name: contract_obligations) */
	contractObligationsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CONTRACT_OBLIGATIONS_COLLECTION",
		"test-contract-obligations",
	),

	/** Org-level CRM connections (name: crm_integrations) */
	crmIntegrationsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CRM_INTEGRATIONS_COLLECTION",
		"test-crm-integrations",
	),

	/** CRM deal → contract idempotency (name: crm_origin_links) */
	crmOriginLinksCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CRM_ORIGIN_LINKS_COLLECTION",
		"test-crm-origin-links",
	),

	/** Per-org approval step SLA policies (name: approval_sla_policies) */
	approvalSlaPoliciesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_APPROVAL_SLA_POLICIES_COLLECTION",
		"test-approval-sla-policies",
	),

	/** Org approval routing templates (name: approval_workflow_templates) */
	approvalWorkflowTemplatesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_APPROVAL_WORKFLOW_TEMPLATES_COLLECTION",
		"test-approval-workflow-templates",
	),

	/** Out-of-office approval delegates (name: approval_delegations) */
	approvalDelegationsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_APPROVAL_DELEGATIONS_COLLECTION",
		"test-approval-delegations",
	),

	/** Email/Slack approval action tokens (name: approval_action_tokens) */
	approvalActionTokensCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_APPROVAL_ACTION_TOKENS_COLLECTION",
		"test-approval-action-tokens",
	),

	/** Expiration accountability records (name: document_expiration_attestations) */
	documentExpirationAttestationsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_DOCUMENT_EXPIRATION_ATTESTATIONS_COLLECTION",
		"test-document-expiration-attestations",
	),

	/** CAALM Execute envelopes (name: signature_envelopes) */
	signatureEnvelopesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_SIGNATURE_ENVELOPES_COLLECTION",
		"test-signature-envelopes",
	),

	// Imagine Art API (AI Image Generation)
	imagineArtApiKey: process.env.IMAGINE_ART_API_KEY,

	// Legacy: Stable Diffusion API (deprecated - kept for reference)
	stableDiffusionApiUrl:
		process.env.STABLE_DIFFUSION_API_URL || "http://localhost:8000",

	// Legacy: Replicate API (deprecated - kept for reference)
	replicateApiToken: process.env.REPLICATE_API_TOKEN,
	replicateModel: process.env.REPLICATE_MODEL || "stability-ai/sdxl",
};

/**
 * Check if Appwrite configuration is complete
 */
export const isAppwriteConfigured = (): boolean => {
	return !!(
		appwriteConfig.endpointUrl &&
		appwriteConfig.projectId &&
		appwriteConfig.secretKey
	);
};

/**
 * Check if using test/CI Appwrite configuration values
 */
export const isTestAppwriteConfig = (): boolean => {
	if (!(process.env.CI || process.env.NODE_ENV === "test")) {
		return false;
	}

	// Check if project ID or secret key are test values
	return (
		appwriteConfig.projectId === "test-project-id" ||
		appwriteConfig.secretKey === "test-api-key-for-ci" ||
		(appwriteConfig.projectId?.startsWith("test-") ?? false) ||
		(appwriteConfig.secretKey?.startsWith("test-") ?? false)
	);
};
