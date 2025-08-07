import { Client, Account, Databases, Storage } from 'appwrite';
import { appwriteConfig } from './config';

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(appwriteConfig.endpointUrl)
  .setProject(appwriteConfig.projectId);

// Initialize services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export { client };
