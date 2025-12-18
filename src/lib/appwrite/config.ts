export const appwriteConfig = {
  endpointUrl:
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
    'https://fra.cloud.appwrite.io/v1',

  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT,

  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE,

  usersCollectionId: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION,

  filesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION,

  contractsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_CONTRACTS_COLLECTION,

  contractsEnterpriseMetadataCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_CONTRACTS_ENTERPRISE_METADATA_COLLECTION,

  contractExtensionsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_CONTRACT_EXTENSIONS_COLLECTION,

  contractDraftsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_CONTRACT_DRAFTS_COLLECTION ||
    '692f4a86002ae8f45cae',

  calendarEventsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_CALENDAR_EVENTS_COLLECTION,

  recentActivityCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_RECENT_ACTIVITIES_COLLECTION,

  invitationsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_INVITATIONS_COLLECTION,

  reportsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_REPORTS_COLLECTION,

  otpTokensCollectionId: process.env.NEXT_PUBLIC_APPWRITE_OTPTOKENS_COLLECTION,

  notificationsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION,

  notificationTypesCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATION_TYPES_COLLECTION,

  notificationSettingsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATION_SETTINGS_COLLECTION,

  smsFormSubmissionsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_SMS_FORM_SUBMISSIONS_COLLECTION,

  notificationDigestQueueCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATION_DIGEST_QUEUE_COLLECTION,

  notesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION,

  calendarApprovalRequestsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_CALENDAR_APPROVALS_COLLECTION,

  calendarPermissionOverridesCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_CALENDAR_PERMISSION_OVERRIDES_COLLECTION,

  bucketId: process.env.NEXT_PUBLIC_APPWRITE_BUCKET,

  profilePicturesBucketId:
    process.env.NEXT_PUBLIC_APPWRITE_PROFILE_PICTURES_BUCKET,

  auditLogsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_AUDIT_LOGS_COLLECTION,

  secretKey: process.env.NEXT_APPWRITE_API_KEY,

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
  calendarIntegrationsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_CALENDAR_INTEGRATIONS_COLLECTION,

  // Priority 2: Shared Calendars and Delegation
  sharedCalendarsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_SHARED_CALENDARS_COLLECTION,
  calendarDelegationsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_CALENDAR_DELEGATIONS_COLLECTION,

  // Priority 2: Resource Management
  calendarResourcesCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_CALENDAR_RESOURCES_COLLECTION,
  resourceBookingsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_RESOURCE_BOOKINGS_COLLECTION,

  // Priority 2: Advanced Notifications
  calendarRemindersCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_CALENDAR_REMINDERS_COLLECTION,
  escalationRulesCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_ESCALATION_RULES_COLLECTION,
};
