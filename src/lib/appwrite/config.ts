export const appwriteConfig = {
  endpointUrl:
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',

  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT || '685ed77d00186ae8176b',

  databaseId:
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE || '685ed87c0009d8189fc7',

  usersCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION || '685ed8a60030f6d7b1f3',

  filesCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION || '685ed9e90020d8f09173',

  contractsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_CONTRACTS_COLLECTION || 'contracts',

  calendarEventsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_CALENDAR_EVENTS_COLLECTION ||
    'calendar_events',

  recentActivityCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_RECENT_ACTIVITIES_COLLECTION ||
    '6883bd610000fa195147',

  reportsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_REPORTS_COLLECTION ||
    '6885147d003d9de593d3',

  otpTokensCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_OTPTOKENS_COLLECTION ||
    '688a64a900046399bc54',

  notificationsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION ||
    'notifications',

  notificationTypesCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATION_TYPES_COLLECTION ||
    'notification_types',

  notificationSettingsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATION_SETTINGS_COLLECTION ||
    'notification_settings',

  bucketId: process.env.NEXT_PUBLIC_APPWRITE_BUCKET || '685edb60000bb7a088a2',

  secretKey: process.env.NEXT_APPWRITE_KEY || '',

  govApiKey: process.env.GOV_API_KEY || '',

  // Twilio SMS configuration
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
};
