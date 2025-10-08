export const appwriteConfig = {
  endpointUrl:
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
    'https://fra.cloud.appwrite.io/v1',

  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT,

  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE,

  usersCollectionId: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION,

  filesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION,

  contractsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_CONTRACTS_COLLECTION,

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

  notesCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION || 'notes',

  bucketId: process.env.NEXT_PUBLIC_APPWRITE_BUCKET,

  profilePicturesBucketId:
    process.env.NEXT_PUBLIC_APPWRITE_PROFILE_PICTURES_BUCKET,

  secretKey: process.env.NEXT_APPWRITE_API_KEY,

  govApiKey: process.env.GOV_API_KEY,

  // Twilio SMS configuration
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
};
