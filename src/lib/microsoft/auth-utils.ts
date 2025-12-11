import { createSessionClient } from '@/lib/appwrite';
import { getCurrentUserFrom2FA } from '@/lib/actions/user.actions';

/**
 * Get current user ID from either Appwrite session or 2FA authentication
 */
export async function getCurrentUserId(): Promise<string> {
  try {
    // First try traditional Appwrite session
    const sessionClient = await createSessionClient();
    const account = await sessionClient.account.get();
    return account.$id;
  } catch (sessionError) {
    // If session fails, try 2FA authentication
    const user2FA = await getCurrentUserFrom2FA();
    if (user2FA) {
      // Return accountId for 2FA users, as that's what getUserByAccountId expects
      // If accountId is not set, fall back to $id
      const accountId = user2FA.accountId || user2FA.$id;
      return accountId;
    } else {
      throw new Error('No valid authentication found');
    }
  }
}
