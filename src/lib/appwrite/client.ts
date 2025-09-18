import { Client, Account, Storage } from 'appwrite';
import { appwriteConfig } from './config';

const sdk = require('node-appwrite');
// Initialize Appwrite client
const client = new Client()
  .setEndpoint(appwriteConfig.endpointUrl)
  .setProject(appwriteConfig.projectId);

// Initialize services
export const account = new Account(client);
export const tablesDB = new sdk.TablesDB(client);
export const storage = new Storage(client);

export { client };

// Firebase Web Push (client-side helper)
// Note: Web push (FCM) is intentionally removed. Mobile apps will register
// their own FCM tokens and save to Appwrite via server endpoints.
