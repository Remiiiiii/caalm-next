export const appwriteConfig = {
  endpointUrl:
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT || '',
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE || '',
  usersCollectionId: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION || '',
  filesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION || '',
  contractsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_CONTRACTS_COLLECTION || '',
  bucketId: process.env.NEXT_PUBLIC_APPWRITE_BUCKET || '',
  secretKey: process.env.NEXT_APPWRITE_KEY || '',
};
