export const appwriteConfig = {
  endpointUrl:
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',

  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT || '685ed77d00186ae8176b',

  databaseId:
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE || '685ed87c0009d8189fc7',

  usersCollectionId: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION || '',

  filesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION || '',

  contractsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_CONTRACTS_COLLECTION || '',

  calendarEventsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_CALENDAR_EVENTS_COLLECTION ||
    'calendar_events',

  recentActivityCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_RECENT_ACTIVITIES_COLLECTION ||
    '6883bd610000fa195147',

  bucketId: process.env.NEXT_PUBLIC_APPWRITE_BUCKET || '',

  secretKey: process.env.NEXT_APPWRITE_KEY || '',
};
