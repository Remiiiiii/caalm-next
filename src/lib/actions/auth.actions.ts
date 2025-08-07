'use server';

import { cookies } from 'next/headers';
import { Client, Account, Models } from 'appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

export const getSessionUser =
  async (): Promise<Models.User<Models.Preferences> | null> => {
    try {
      if (!appwriteConfig.endpointUrl || !appwriteConfig.projectId) {
        console.error('Appwrite configuration is incomplete');
        return null;
      }

      const session = (await cookies()).get('appwrite-session');

      if (!session || !session.value) {
        return null;
      }

      const client = new Client()
        .setEndpoint(appwriteConfig.endpointUrl)
        .setProject(appwriteConfig.projectId)
        .setSession(session.value);

      const account = new Account(client);
      const user = await account.get();

      return user;
    } catch (error) {
      console.error('Session check failed:', error);
      return null;
    }
  };
