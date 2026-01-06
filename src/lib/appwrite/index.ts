'use server';

import {
  Client,
  Databases,
  TablesDB,
  Account,
  Storage,
  Avatars,
  Messaging,
} from 'node-appwrite';
import { appwriteConfig, isAppwriteConfigured, isTestAppwriteConfig } from './config';
import { cookies } from 'next/headers';

export const createSessionClient = async () => {
  if (!appwriteConfig.endpointUrl || !appwriteConfig.projectId) {
    console.error('Appwrite configuration is incomplete:', {
      endpointUrl: appwriteConfig.endpointUrl,
      projectId: appwriteConfig.projectId,
    });
    throw new Error('Appwrite configuration is incomplete');
  }

  const client = new Client()
    .setEndpoint(appwriteConfig.endpointUrl)
    .setProject(appwriteConfig.projectId);

  const session = (await cookies()).get('appwrite-session');

  if (!session || !session.value) {
    // Don't log this as an error since it's expected in 2FA flow
    throw new Error('No session found');
  }

  client.setSession(session.value);

  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
    get tablesDB() {
      return new TablesDB(client);
    },
  };
};

export const createAdminClient = async () => {
  if (!isAppwriteConfigured()) {
    const error = new Error('Appwrite configuration is incomplete');
    // Add helpful context in test/CI environments
    if (process.env.CI || process.env.NODE_ENV === 'test') {
      (error as any).isTestEnvironment = true;
      (error as any).missingConfig = {
        endpointUrl: !appwriteConfig.endpointUrl,
        projectId: !appwriteConfig.projectId,
        secretKey: !appwriteConfig.secretKey,
      };
    }
    throw error;
  }

  // In test environments with test values, throw a specific error that can be caught
  if (isTestAppwriteConfig()) {
    const testError = new Error('Using test Appwrite configuration - Appwrite operations will fail');
    (testError as any).isTestConfig = true;
    (testError as any).code = 'TEST_CONFIG';
    throw testError;
  }

  const client = new Client()
    .setEndpoint(appwriteConfig.endpointUrl)
    .setProject(appwriteConfig.projectId)
    .setKey(appwriteConfig.secretKey);

  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
    get tablesDB() {
      return new TablesDB(client);
    },
    get storage() {
      return new Storage(client);
    },
    get avatars() {
      return new Avatars(client);
    },
    get messaging() {
      return new Messaging(client);
    },
  };
};
