'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient, createSessionClient } from '../appwrite';
import { appwriteConfig } from '../appwrite/config';
import { parseStringify } from '../utils';
import { cookies } from 'next/headers';
import { avatarPlaceholderUrl } from '../../../constants';
import { redirect } from 'next/navigation';
import crypto from 'crypto';
import * as sdk from 'node-appwrite';

type AppUser = {
  fullName: string;
  email: string;
  avatar: string;
  accountId: string;
  role: string;
  // add other fields as needed
};

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
  const existingUser = (await getUserByEmail(email)) as AppUser | null;

  let accountId: string;
  if (!existingUser) {
    const maybeAccountId = await sendEmailOTP({ email });
    if (!maybeAccountId) throw new Error('Failed to send email OTP');
    accountId = maybeAccountId;
  } else {
    accountId = existingUser.accountId;
  }

  // Always ensure a document exists in the users collection
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
        role: '',
      }
    );
    await addUserEmailTarget(accountId, email);
  } else {
    // If user exists in Auth but not in users collection, create the document
    const { databases } = await createAdminClient();
    const userDoc = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.equal('email', email)]
    );
    if (userDoc.total === 0) {
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.usersCollectionId,
        ID.unique(),
        {
          fullName,
          email,
          avatar: avatarPlaceholderUrl,
          accountId,
          role: '',
        }
      );
      await addUserEmailTarget(accountId, email);
    }
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
    const existingUser = (await getUserByEmail(email)) as AppUser | null;
    if (existingUser) {
      await sendEmailOTP({ email });
      return { accountId: existingUser.accountId };
    }

    // Try to find the user in Appwrite Auth (pseudo-code, depends on your SDK)
    const client = new sdk.Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
      .setKey(process.env.NEXT_APPWRITE_KEY!);

    const users = new sdk.Users(client);
    const userList = await users.list([sdk.Query.equal('email', email)]);
    const authUser = userList.total > 0 ? userList.users[0] : null;

    if (authUser) {
      // Create the missing users collection document
      const { databases } = await createAdminClient();
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.usersCollectionId,
        ID.unique(),
        {
          fullName: authUser.name || '',
          email: authUser.email,
          avatar: avatarPlaceholderUrl,
          accountId: authUser.$id,
          role: '',
        }
      );
      await sendEmailOTP({ email });
      return { accountId: authUser.$id };
    }

    return { accountId: null, error: 'User not found' };
  } catch {
    return { accountId: null, error: 'Failed to sign in user' };
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

const allowedRoles = ['executive', 'hr', 'manager'] as const;

type AllowedRole = (typeof allowedRoles)[number];

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

  const normalizedRole = role.toLowerCase();
  if (!allowedRoles.includes(normalizedRole as AllowedRole)) {
    throw new Error(
      `Invalid role: ${role}. Must be one of ${allowedRoles.join(', ')}`
    );
  }

  // 1. Create invitation document
  await databases.createDocument(
    appwriteConfig.databaseId,
    INVITATIONS_COLLECTION,
    ID.unique(),
    {
      email,
      orgId,
      role: normalizedRole,
      name,
      token,
      expiresAt,
      status,
      revoked,
      invitedBy,
    }
  );

  // 2. Send invite link email (using Appwrite Messaging API)
  const client = new sdk.Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
    .setKey(process.env.NEXT_APPWRITE_KEY!);

  // Find or create a messaging target for the email
  // (You may need to adjust this depending on your Appwrite Messaging setup)
  const messaging = new sdk.Messaging(client);

  // Compose invite link
  const inviteLink = `http://localhost:3000/invite/accept?token=${token}`;

  // Send the invite email
  try {
    await messaging.createEmail(
      ID.unique(),
      "You're invited to join CAALM Solutions",
      `You have been invited! Click the link to join: <a href="${inviteLink}">${inviteLink}</a>`,
      ['68659c97003b73e38fcb'], // topics
      [], // targets
      [],
      [],
      [],
      [],
      false,
      true
    );
  } catch (error) {
    console.error('Failed to send invite email:', error);
    throw error;
  }

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

  // 1. Check if user exists in your users collection
  let user = await getUserByEmail(invite.email);

  // 2. If not, create Auth user and users collection document
  if (!user) {
    // Optionally, create the Auth user here if you want to pre-create them
    // Otherwise, just create the users collection document
    const { databases } = await createAdminClient();
    const roleToAssign = allowedRoles.includes(invite.role)
      ? invite.role
      : 'member'; // fallback or throw

    // Optionally, throw an error if invalid:
    if (!allowedRoles.includes(invite.role)) {
      throw new Error(
        `Invalid role: ${invite.role}. Must be one of ${allowedRoles.join(
          ', '
        )}`
      );
    }

    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      ID.unique(),
      {
        fullName: invite.name,
        email: invite.email,
        avatar: avatarPlaceholderUrl,
        accountId: '', // Fill this after OTP verification if needed
        role: roleToAssign, // Now guaranteed to be valid
      }
    );
    user = await getUserByEmail(invite.email);
  }

  if (!user) throw new Error('User creation failed');

  // 3. Mark invitation as accepted
  await databases.updateDocument(
    appwriteConfig.databaseId,
    INVITATIONS_COLLECTION,
    invite.$id,
    { status: 'accepted' }
  );

  // 4. Return info for frontend to proceed to sign-in/OTP
  return { success: true, email: invite.email, accountId: user.accountId };
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

export const addUserEmailTarget = async (userId: string, email: string) => {
  const client = new sdk.Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
    .setKey(process.env.NEXT_APPWRITE_KEY!);

  const users = new sdk.Users(client);
  const newUserId = userId; // The ID of the user you want to add the target to
  const targetType = sdk.MessagingProviderType.Email; // The type of target you are adding

  try {
    const response = await users.createTarget(
      newUserId,
      ID.unique(),
      targetType,
      email
    );
    return response;
  } catch (error) {
    console.error('Error creating email target:', error);
    throw error;
  }
};
