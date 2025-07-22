'use server';

import { ID, Query, Models } from 'node-appwrite';
import { createAdminClient, createSessionClient } from '../appwrite';
import { appwriteConfig } from '../appwrite/config';
import { parseStringify } from '../utils';
import { cookies } from 'next/headers';
import { avatarPlaceholderUrl } from '../../../constants';
import { redirect } from 'next/navigation';
import crypto from 'crypto';
import * as sdk from 'node-appwrite';

export type AppUser = {
  fullName: string;
  email: string;
  avatar: string;
  accountId: string;
  role: string;
  department?:
    | 'childwelfare'
    | 'behavioralhealth'
    | 'finance'
    | 'operations'
    | 'administration'
    | 'c-suite'
    | 'managerial';
  status?: 'active' | 'inactive';
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

export const createAccount = async ({ email }: { email: string }) => {
  // Only send OTP, do not create Auth user or messaging target yet
  await sendEmailOTP({ email });
  return { sent: true };
};

// This function should be called only after OTP is verified
export const finalizeAccountAfterEmailVerification = async ({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) => {
  // 1. Create Auth user if not exists, or update name if missing
  const client = new sdk.Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
    .setKey(process.env.NEXT_APPWRITE_KEY!);
  const users = new sdk.Users(client);
  // Check if user already exists in Auth
  const userList = await users.list([sdk.Query.equal('email', email)]);
  let authUser;
  if (userList.total > 0) {
    authUser = userList.users[0];
    // Update name if missing
    if ((!authUser.name || authUser.name === '') && fullName) {
      await users.updateName(authUser.$id, fullName);
    }
  } else {
    const randomPassword = crypto.randomBytes(16).toString('hex');
    authUser = await users.create(
      sdk.ID.unique(),
      email,
      undefined,
      randomPassword,
      fullName
    );
  }
  const accountId = authUser.$id;

  // 2. After OTP verification, update email verification status
  await users.updateEmailVerification(accountId, true);

  // 3. Add messaging target so user can be added as a subscriber manually
  await addUserEmailTarget(accountId, email);

  // Do NOT create users collection document here
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
  try {
    const { databases, account } = await createSessionClient();
    const result = await account.get();
    const user = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.equal('accountId', result.$id)]
    );

    if (user.total < 0) return null;

    return parseStringify(user.documents[0]);
  } catch (error) {
    console.log(error);
  }
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
          department: undefined,
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

const allowedRoles = ['executive', 'admin', 'manager'] as const;

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
  const { messaging } = await createAdminClient();

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

  // 1. Find Auth user by email
  const client = new sdk.Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
    .setKey(process.env.NEXT_APPWRITE_KEY!);
  const users = new sdk.Users(client);
  const userList = await users.list([sdk.Query.equal('email', invite.email)]);
  const authUser = userList.total > 0 ? userList.users[0] : null;
  if (!authUser) throw new Error('User not found in Auth');
  const accountId = authUser.$id;

  // 2. Create users collection document with role if not exists
  let user = await getUserByEmail(invite.email);
  if (!user) {
    const normalizedRole = invite.role.toLowerCase();
    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      sdk.ID.unique(),
      {
        fullName: invite.name,
        email: invite.email,
        avatar: avatarPlaceholderUrl,
        accountId,
        role: normalizedRole,
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

  // 4. Return info for frontend to redirect to dashboard
  return {
    success: true,
    email: invite.email,
    accountId: user.accountId,
    role: user.role,
  };
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

export const getInvitationByToken = async (token: string) => {
  const { databases } = await createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    'invitations',
    [Query.equal('token', token)]
  );
  return result.total > 0 ? result.documents[0] : null;
};

/**
 * Update a user's profile in the users collection.
 * @param {Object} params
 * @param {string} params.accountId - The user's accountId (Appwrite Auth user ID)
 * @param {string} [params.fullName] - The user's full name
 * @param {string} [params.role] - The user's role
 * @returns {Promise<Object>} The updated user document
 */
export const updateUserProfile = async ({
  accountId,
  fullName,
  department,
  role,
}: {
  accountId: string;
  fullName?: string;
  department?:
    | 'childwelfare'
    | 'behavioralhealth'
    | 'finance'
    | 'operations'
    | 'administration'
    | 'c-suite'
    | 'managerial';
  role?: string;
}) => {
  try {
    const { databases } = await createAdminClient();
    // Find the user document by accountId
    const userList = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.equal('accountId', accountId)]
    );
    if (userList.total === 0) throw new Error('User not found');
    const userDoc = userList.documents[0];
    // Prepare update payload
    const updatePayload: Record<string, unknown> = {};
    if (fullName !== undefined) updatePayload.fullName = fullName;
    if (role !== undefined) updatePayload.role = role;
    if (department !== undefined) updatePayload.department = department;
    // Update the user document
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userDoc.$id,
      updatePayload
    );
    return updatedUser;
  } catch (error) {
    handleError(error, 'Failed to update user profile');
  }
};

/**
 * List all users in the users collection.
 * @returns {Promise<any[]>} Array of user documents
 */
export const listAllUsers = async () => {
  try {
    const { databases } = await createAdminClient();
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId
    );
    return result.documents;
  } catch (error) {
    handleError(error, 'Failed to list all users');
  }
};

export const getActiveUsersCount = async () => {
  try {
    const { databases } = await createAdminClient();
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.equal('status', 'active')]
    );
    return result.total;
  } catch (error) {
    console.error('Failed to fetch active users count:', error);
    return 0;
  }
};

/**
 * Delete a user document from the users collection by $id.
 * @param {string} userId - The $id of the user document to delete
 */
export const deleteUser = async (userId: string) => {
  try {
    const { databases } = await createAdminClient();
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId
    );
    return { success: true };
  } catch (error) {
    handleError(error, 'Failed to delete user');
  }
};

export const getContracts = async () => {
  const { databases } = await createAdminClient();
  try {
    const res = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.contractsCollectionId
    );
    return parseStringify(res.documents);
  } catch (error) {
    console.error('Failed to fetch contracts:', error);
    return [];
  }
};

export const getUnreadNotificationsCount = async (userId: string) => {
  const { databases } = await createAdminClient();
  try {
    const res = await databases.listDocuments(
      appwriteConfig.databaseId,
      'notifications',
      [Query.equal('userId', userId), Query.equal('read', false)]
    );
    return res.total;
  } catch (error) {
    console.error('Failed to fetch unread notifications:', error);
    return 0;
  }
};

// Get users who have signed up but haven't been invited yet
export const getUninvitedUsers = async () => {
  const { databases } = await createAdminClient();
  try {
    // Get all Auth users
    const client = new sdk.Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
      .setKey(process.env.NEXT_APPWRITE_KEY!);
    const users = new sdk.Users(client);
    const authUsers = await users.list();

    // Get all users in the users collection (invited users)
    const invitedUsers = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId
    );

    // Get all pending invitations
    const pendingInvitations = await databases.listDocuments(
      appwriteConfig.databaseId,
      'invitations',
      [Query.equal('status', 'pending')]
    );

    // Filter out users who are already in the users collection or have pending invitations
    const invitedEmails = new Set([
      ...invitedUsers.documents.map((u: Models.Document) => u.email as string),
      ...pendingInvitations.documents.map(
        (inv: Models.Document) => inv.email as string
      ),
    ]);

    const uninvitedUsers = authUsers.users.filter(
      (authUser) => !invitedEmails.has(authUser.email)
    );

    return uninvitedUsers.map((user) => ({
      $id: user.$id,
      email: user.email,
      fullName: user.name || 'Unknown',
      $createdAt: user.$createdAt,
    }));
  } catch (error) {
    console.error('Failed to fetch uninvited users:', error);
    return [];
  }
};
