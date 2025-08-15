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
import { triggerUserInvitationNotification } from '../utils/notificationTriggers';

export type AppUser = {
  fullName: string;
  email: string;
  avatar: string;
  accountId: string;
  role: string;
  department?:
    | 'childwelfare'
    | 'behavioralhealth'
    | 'clinic'
    | 'residential'
    | 'cins-fins-snap'
    | 'administration'
    | 'c-suite'
    | 'management';
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
  try {
    await addUserEmailTarget(accountId, email);
  } catch (error) {
    console.warn(
      'Failed to add email target, but continuing with account creation:',
      error
    );
    // Don't throw error here as the main account creation should still succeed
  }

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

    const cookieStore = await cookies();
    cookieStore.set('appwrite-session', session.secret, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
    });

    // Note: 2fa_completed cookie will be set after 2FA setup/verification
    // This is just the OTP verification step

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

    if (user.total === 0) return null;

    return parseStringify(user.documents[0]);
  } catch (error) {
    console.log(error);
  }
};

export const signOutUser = async () => {
  try {
    // Try to get session client, but don't fail if no session exists
    const { account } = await createSessionClient();
    await account.deleteSession('current');
  } catch (error) {
    console.log('No active session to delete:', error);
  } finally {
    // Always delete the session cookie and redirect
    (await cookies()).delete('appwrite-session');
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
  department: string;
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
  department,
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
      department,
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
      `You have been invited to! Click the link to join Caalm: <a href="${inviteLink}">${inviteLink}</a>`,
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

  // Trigger user invitation notification
  try {
    await triggerUserInvitationNotification(
      invitedBy, // Notify the person who sent the invitation
      email,
      name
    );
  } catch (error) {
    console.error('Failed to trigger user invitation notification:', error);
    // Don't throw error here as the invitation was created successfully
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
        department: invite.department,
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
    department: user.department,
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
  const targetType = sdk.MessagingProviderType.Email;

  try {
    // First, check if a target already exists for this user and email
    const existingTargets = await users.listTargets(userId);
    const existingEmailTarget = existingTargets.targets.find(
      (target) => target.providerType === 'email' && target.identifier === email
    );

    if (existingEmailTarget) {
      console.log('Email target already exists for user:', userId);
      return existingEmailTarget;
    }

    // If no existing target, create a new one with a more specific ID
    const targetId = `email_${userId}_${Date.now()}`;
    const response = await users.createTarget(
      userId,
      targetId,
      targetType,
      email
    );
    return response;
  } catch (error) {
    // If the error is about duplicate ID, try with a different approach
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('Target ID conflict, trying with unique ID...');
      try {
        const response = await users.createTarget(
          userId,
          ID.unique(),
          targetType,
          email
        );
        return response;
      } catch (retryError) {
        console.error('Error creating email target on retry:', retryError);
        throw retryError;
      }
    }
    console.error('Error creating email target:', error);
    throw error;
  }
};

export const addUserSmsTarget = async (userId: string, e164Phone: string) => {
  const client = new sdk.Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
    .setKey(process.env.NEXT_APPWRITE_KEY!);

  const users = new sdk.Users(client);
  const targetType = sdk.MessagingProviderType.Sms;

  try {
    // Validate E.164 format
    if (!/^\+\d{10,15}$/.test(e164Phone)) {
      throw new Error('Phone must be in E.164 format, e.g. +15551234567');
    }

    // Check if an SMS target already exists for this user and phone
    const existingTargets = await users.listTargets(userId);
    const existingSmsTarget = existingTargets.targets.find(
      (target) =>
        target.providerType === 'sms' && target.identifier === e164Phone
    );

    if (existingSmsTarget) {
      return existingSmsTarget;
    }

    // Create with deterministic ID, fallback to unique on conflict
    const targetId = `sms_${userId}_${Date.now()}`;
    try {
      const response = await users.createTarget(
        userId,
        targetId,
        targetType,
        e164Phone
      );
      return response;
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        return await users.createTarget(
          userId,
          sdk.ID.unique(),
          targetType,
          e164Phone
        );
      }
      throw err;
    }
  } catch (error) {
    console.error('Error creating SMS target:', error);
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
    | 'clinic'
    | 'residential'
    | 'cins-fins-snap'
    | 'administration'
    | 'c-suite'
    | 'management';
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

// Get all users from Auth database
export const getAllAuthUsers = async () => {
  try {
    // Get all Auth users
    const client = new sdk.Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
      .setKey(process.env.NEXT_APPWRITE_KEY!);
    const users = new sdk.Users(client);
    const authUsers = await users.list();

    return authUsers.users.map((user) => ({
      $id: user.$id,
      email: user.email,
      fullName: user.name || 'Unknown',
      $createdAt: user.$createdAt,
    }));
  } catch (error) {
    console.error('Failed to fetch Auth users:', error);
    return [];
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
      ...invitedUsers.documents.map(
        (u: Record<string, unknown>) => u.email as string
      ),
      ...pendingInvitations.documents.map(
        (inv: Record<string, unknown>) => inv.email as string
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
