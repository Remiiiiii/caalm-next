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
import { appwriteConfig } from './config';
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
    console.error('createSessionClient: No session found');
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
  if (
    !appwriteConfig.endpointUrl ||
    !appwriteConfig.projectId ||
    !appwriteConfig.secretKey
  ) {
    throw new Error('Appwrite configuration is incomplete');
  }

  const client = new Client()
    .setEndpoint(appwriteConfig.endpointUrl)
    .setProject(appwriteConfig.projectId)
    .setKey(appwriteConfig.secretKey);

  return {
    get account() {
      return new Account(client);
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
