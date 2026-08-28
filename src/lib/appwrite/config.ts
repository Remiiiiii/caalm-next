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
		"69c8f401001a2b3c4d01",
	),

	tasksCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION",
		"tasks",
	),

	permissionsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_PERMISSIONS_COLLECTION",
		"685ed87c0009d8189fc8",
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
		"69b8a208008a1f5d9b08",
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
		"assistant_conversations",
	),

	assistantMessagesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_ASSISTANT_MESSAGES_COLLECTION",
		"assistant_messages",
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

	profilePicturesBucketId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_PROFILE_PICTURES_BUCKET",
		"test-profile-pictures-bucket",
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
		"69c0b101001a2b3c4d11",
	),
	escalationRulesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_ESCALATION_RULES_COLLECTION",
		"69c0b102002b3c4d5e12",
	),
	escalationJobsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_ESCALATION_JOBS_COLLECTION",
		"69c0b103003c4d5e6f13",
	),

	// News Articles
	newsArticlesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_NEWS_ARTICLES_COLLECTION",
		"newsarticles",
	),
	newsVersionsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_NEWS_VERSIONS_COLLECTION",
		"newsversions",
	),

	// IT Runbooks
	runbooksCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_RUNBOOKS_COLLECTION",
		"69a3f91200a8c4d1e2f0",
	),

	ticketsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_TICKETS_COLLECTION",
		"69b8a201001f4e8c2a01",
	),

	ticketEventsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_TICKET_EVENTS_COLLECTION",
		"69b8a202002e5f9d3b02",
	),

	/** Per-org year counters for TKT-YYYY-#### numbers (name: ticket_sequences). */
	ticketSequencesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_TICKET_SEQUENCES_COLLECTION",
		"69b8a209009b2a6e0c09",
	),

	webhookDeliveriesCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_WEBHOOK_DELIVERIES_COLLECTION",
		"69b8a203003d6a0e4c03",
	),

	ticketAttachmentsBucketId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_TICKET_ATTACHMENTS_BUCKET",
		"69b8a204004c7b1f5d04",
	),

	orgUnitsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_ORG_UNITS_COLLECTION",
		"69b8a205005d8c2a6e05",
	),

	costCentersCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_COST_CENTERS_COLLECTION",
		"69b8a206006e9d3b7f06",
	),

	orgUnitHistoryCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_ORG_UNIT_HISTORY_COLLECTION",
		"69b8a207007f0e4c8a07",
	),

	/** CLM Completion Roadmap — alphanumeric Appwrite table IDs */
	roadmapSectionsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_ROADMAP_SECTIONS_COLLECTION",
		"69c0a101001a2b3c4d01",
	),
	roadmapTasksCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_ROADMAP_TASKS_COLLECTION",
		"69c0a102002b3c4d5e02",
	),
	roadmapTestRunsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_ROADMAP_TEST_RUNS_COLLECTION",
		"69c0a103003c4d5e6f03",
	),
	roadmapStatusLogCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_ROADMAP_STATUS_LOG_COLLECTION",
		"69c0a104004d5e6f7a04",
	),

	/** Funding pursuits pipeline (name: funding_pursuits) */
	fundingPursuitsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_FUNDING_PURSUITS_COLLECTION",
		"69c4f201001a2b3c4d01",
	),

	/** Contract obligations for retention (name: contract_obligations) */
	contractObligationsCollectionId: getTestFallback(
		"NEXT_PUBLIC_APPWRITE_CONTRACT_OBLIGATIONS_COLLECTION",
		"69c4f202002b3c4d5e02",
	),

	// Imagine Art API (AI Image Generation)
	imagineArtApiKey: process.env.IMAGINE_ART_API_KEY,

	// Legacy: Stable Diffusion API (deprecated - kept for reference)
	stableDiffusionApiUrl:
		process.env.STABLE_DIFFUSION_API_URL || "http://localhost:8000",

	// Legacy: Replicate API (deprecated - kept for reference)
	replicateApiToken: process.env.REPLICATE_API_TOKEN,
	replicateModel:
		process.env.REPLICATE_MODEL ||
		"stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
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
