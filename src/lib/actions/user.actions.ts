'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient, createSessionClient } from '../appwrite';
import { appwriteConfig } from '../appwrite/config';
import { parseStringify } from '../utils';
import { cookies } from 'next/headers';
import { avatarPlaceholderUrl } from '../../../constants';
import { redirect } from 'next/navigation';
import crypto from 'crypto';

export const getUserByEmail = async (email: string) => {
  const { databases } = await createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [Query.equal('email', email)]
  );

  return result.total > 0 ? result.documents[0] : null;
};

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

export const sendEmailOTP = async ({ email }: { email: string }) => {
  const { account } = await createAdminClient();

  try {
    {
      /*TODO: change ID.unique() to a UUID*/
    }
    const session = await account.createEmailToken(ID.unique(), email);
    return session.userId;
  } catch (error) {
    handleError(error, 'Failed to send email OTP');
  }
};

export const createAccount = async ({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) => {
  const existingUser = await getUserByEmail(email);

  const accountId = await sendEmailOTP({ email });
  if (!accountId) {
    throw new Error('Failed to send email OTP');
  }
  if (!existingUser) {
    const { databases } = await createAdminClient();

    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      ID.unique(),
      {
        fullName,
        email,
        avatar: avatarPlaceholderUrl,
        accountId,
      }
    );
  }

  return { accountId };
};

export const verifySecret = async ({
  accountId,
  password,
}: {
  accountId: string;
  password: string;
}) => {
  try {
    const { account } = await createAdminClient();
    const session = await account.createSession(accountId, password);

    (await cookies()).set('appwrite-session', session.secret, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
    });
    return parseStringify({ sessionId: session.$id });
  } catch (error) {
    handleError(error, 'Failed to verify OTP');
  }
};

export const getCurrentUser = async () => {
  const { databases, account } = await createSessionClient();
  const result = await account.get();
  const user = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [Query.equal('accountId', result.$id)]
  );

  if (user.total < 0) return null;

  return parseStringify(user.documents[0]);
};

export const signOutUser = async () => {
  const { account } = await createSessionClient();
  try {
    await account.deleteSession('current');
    (await cookies()).delete('appwrite-session');
  } catch (error) {
    handleError(error, 'Failed to sign out user');
  } finally {
    redirect('/sign-in');
  }
};

export const signInUser = async ({ email }: { email: string }) => {
  try {
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      await sendEmailOTP({ email });
      return parseStringify({ accountId: existingUser.accountId });
    }

    return parseStringify({ accountId: null, error: 'User not found' });
  } catch (error) {
    handleError(error, 'Failed to sign in user');
  }
};

const INVITATIONS_COLLECTION = 'invitations';

// Types for invitation functions
interface CreateInvitationParams {
  email: string;
  orgId: string;
  role: string;
  name: string;
  expiresInDays?: number;
  invitedBy: string;
}

interface AcceptInvitationParams {
  token: string;
}

interface RevokeInvitationParams {
  token: string;
}

interface ListPendingInvitationsParams {
  orgId: string;
}

export const createInvitation = async ({
  email,
  orgId,
  role,
  name,
  expiresInDays = 7,
  invitedBy,
}: CreateInvitationParams) => {
  const { databases } = await createAdminClient();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(
    Date.now() + expiresInDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const status = 'pending';
  const revoked = false;
  await databases.createDocument(
    appwriteConfig.databaseId,
    INVITATIONS_COLLECTION,
    ID.unique(),
    { email, orgId, role, name, token, expiresAt, status, revoked, invitedBy }
  );
  // TODO: send invitation email with link containing token
  return { email, token, expiresAt };
};

export const acceptInvitation = async ({ token }: AcceptInvitationParams) => {
  const { databases } = await createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    INVITATIONS_COLLECTION,
    [Query.equal('token', token)]
  );
  if (result.total === 0) throw new Error('Invalid invitation token');
  const invite = result.documents[0];
  if (invite.status !== 'pending' || invite.revoked)
    throw new Error('Invitation is not valid');
  if (new Date(invite.expiresAt) < new Date())
    throw new Error('Invitation expired');
  // Check if user exists
  const user = await getUserByEmail(invite.email);
  if (!user) {
    // Create user (reuse createAccount logic, but pass name/email)
    await createAccount({ fullName: invite.name, email: invite.email });
    // Optionally, set password here if needed
  }
  // Mark invitation as accepted
  await databases.updateDocument(
    appwriteConfig.databaseId,
    INVITATIONS_COLLECTION,
    invite.$id,
    { status: 'accepted' }
  );
  return { success: true };
};

export const revokeInvitation = async ({ token }: RevokeInvitationParams) => {
  const { databases } = await createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    INVITATIONS_COLLECTION,
    [Query.equal('token', token)]
  );
  if (result.total === 0) throw new Error('Invalid invitation token');
  const invite = result.documents[0];
  await databases.updateDocument(
    appwriteConfig.databaseId,
    INVITATIONS_COLLECTION,
    invite.$id,
    { revoked: true, status: 'revoked' }
  );
  return { success: true };
};

export const listPendingInvitations = async ({
  orgId,
}: ListPendingInvitationsParams) => {
  const { databases } = await createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    INVITATIONS_COLLECTION,
    [
      Query.equal('orgId', orgId),
      Query.equal('status', 'pending'),
      Query.equal('revoked', false),
    ]
  );
  return result.documents;
};
