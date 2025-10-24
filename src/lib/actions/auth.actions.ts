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

      // Return only plain user data, not the full Appwrite user object
      return {
        $id: user.$id,
        name: user.name,
        email: user.email,
        emailVerification: user.emailVerification,
        phone: user.phone,
        phoneVerification: user.phoneVerification,
        prefs: user.prefs,
        registration: user.registration,
        status: user.status,
        passwordUpdate: user.passwordUpdate,
        accessedAt: user.accessedAt,
        $createdAt: user.$createdAt,
        $updatedAt: user.$updatedAt,
      } as Models.User<Models.Preferences>;
    } catch (error) {
      console.error('Session check failed:', error);
      return null;
    }
  };
