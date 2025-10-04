'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient, createSessionClient } from '../appwrite';
import { appwriteConfig } from '../appwrite/config';
import { parseStringify } from '../utils';
import { cookies } from 'next/headers';
import { avatarPlaceholderUrl } from '../../../constants';
import { redirect } from 'next/navigation';
import * as crypto from 'crypto';
import * as sdk from 'node-appwrite';
import { triggerUserInvitationNotification } from '../utils/notificationTriggers';
import { type UserDivision } from '../../../constants';
import { tablesDB } from '../appwrite/client';

export type AppUser = {
  fullName: string;
  email: string;
  avatar: string;
  accountId: string;
  role: string;
  division?: UserDivision;
  status?: 'active' | 'inactive';
};

export const getUserByEmail = async (email: string) => {
  try {
    console.log('getUserByEmail: Looking for user with email:', email);
    const { tablesDB } = await createAdminClient();
    console.log('getUserByEmail: Admin client created successfully');

    const result = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: appwriteConfig.usersCollectionId || 'users',
      queries: [Query.equal('email', email)],
    });

    console.log('getUserByEmail: Query result:', {
      total: result.total,
      rowsLength: result.rows?.length || 0,
      firstRow: result.rows?.[0] ? 'Found' : 'Not found',
    });

    return result.total > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('getUserByEmail: Error occurred:', error);
    throw error;
  }
};

export const getUserById = async (userId: string) => {
  const { tablesDB } = await createAdminClient();
  try {
    const result = await tablesDB.getRow({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: appwriteConfig.usersCollectionId || 'users',
      rowId: userId,
    });
    return result;
  } catch (error) {
    console.error('Failed to get user by ID:', error);
    return null;
  }
};

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

export const sendEmailOTP = async ({ email }: { email: string }) => {
  try {
    console.log('sendEmailOTP: Starting OTP send for email:', email);

    const { tablesDB } = await createAdminClient();
    console.log('sendEmailOTP: Admin client created successfully');

    // Check if an OTP was recently sent (within the last 30 seconds) to prevent duplicates
    const thirtySecondsAgo = new Date();
    thirtySecondsAgo.setSeconds(thirtySecondsAgo.getSeconds() - 30);

    const recentOtpResponse = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: appwriteConfig.otpTokensCollectionId || 'otp-tokens',
      queries: [
        Query.equal('email', email),
        Query.equal('used', false),
        Query.greaterThan('$createdAt', thirtySecondsAgo.toISOString()),
      ],
    });

    if (recentOtpResponse.rows.length > 0) {
      console.log(
        'sendEmailOTP: Recent OTP found, skipping duplicate send for:',
        email
      );
      // Return success but don't send duplicate email
      return ID.unique();
    }

    // Also check if there's any valid (non-expired) unused OTP for this email
    const now = new Date();
    const validOtpResponse = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: appwriteConfig.otpTokensCollectionId || 'otp-tokens',
      queries: [
        Query.equal('email', email),
        Query.equal('used', false),
        Query.greaterThan('expiresAt', now.toISOString()),
      ],
    });

    if (validOtpResponse.rows.length > 0) {
      console.log(
        'sendEmailOTP: Valid unused OTP already exists, skipping duplicate send for:',
        email
      );
      // Return success but don't send duplicate email
      return ID.unique();
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('sendEmailOTP: Generated OTP:', otp);

    // Store OTP in database with expiration (5 minutes)
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 5);

    // Store OTP in the database
    await tablesDB.createRow({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: appwriteConfig.otpTokensCollectionId || 'otp-tokens',
      rowId: ID.unique(),
      data: {
        email,
        otp,
        expiresAt: expirationTime.toISOString(),
        used: false,
      },
    });
    console.log('sendEmailOTP: OTP stored in database');

    // Get user's full name from database
    let userFullName = 'User';
    try {
      const userResponse = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.usersCollectionId || 'users',
        queries: [Query.equal('email', email)],
      });

      if (userResponse.rows.length > 0) {
        userFullName = userResponse.rows[0].fullName || 'User';
      }
    } catch (error) {
      console.warn('Could not retrieve user full name:', error);
    }

    // Send OTP via Mailgun
    const { mailgunService } = await import('../services/mailgun');
    await mailgunService.sendOTPEmail(email, otp, { fullName: userFullName });
    console.log('sendEmailOTP: OTP sent via Mailgun successfully');

    // Return a dummy userId for compatibility with existing code
    return ID.unique();
  } catch (error) {
    // Handle specific errors with user-friendly messages
    if (error instanceof Error) {
      if (
        error.message.includes('Invalid email') ||
        error.message.includes('invalid email')
      ) {
        throw new Error('Please enter a valid email address.');
      } else if (
        error.message.includes('rate limit') ||
        error.message.includes('too many')
      ) {
        throw new Error(
          'Too many requests. Please wait a moment before requesting another code.'
        );
      } else if (
        error.message.includes('network') ||
        error.message.includes('connection')
      ) {
        throw new Error(
          'Network error. Please check your connection and try again.'
        );
      } else if (error.message.includes('Failed to send email')) {
        throw new Error('Failed to send verification code. Please try again.');
      } else {
        // Log the original error for debugging but return a user-friendly message
        console.error('Email OTP error:', error);
        throw new Error('Failed to send verification code. Please try again.');
      }
    }

    // Fallback for unknown error types
    console.error('Unknown email OTP error:', error);
    throw new Error('An unexpected error occurred. Please try again.');
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
    .setKey(process.env.NEXT_APPWRITE_API_KEY!);
  const users = new sdk.Users(client);
  // Check if user already exists in Auth
  const userList = await users.list({
    queries: [sdk.Query.equal('email', email)],
  });
  let authUser;
  if (userList.total > 0) {
    authUser = userList.users[0];
    // Update name if missing
    if ((!authUser.name || authUser.name === '') && fullName) {
      await users.updateName({
        userId: authUser.$id,
        name: fullName,
      });
    }
  } else {
    const randomPassword = crypto.randomBytes(16).toString('hex');
    authUser = await users.create({
      userId: sdk.ID.unique(),
      email: email,
      password: randomPassword,
      name: fullName,
    });
  }
  const accountId = authUser.$id;

  // 2. After OTP verification, update email verification status
  await users.updateEmailVerification({
    userId: accountId,
    emailVerification: true,
  });

  // 3. Create users collection document with the fullName (if not already exists)
  const { tablesDB } = await createAdminClient();
  try {
    // Check if user already exists in users collection
    const existingUser = await getUserByEmail(email);
    if (!existingUser) {
      await tablesDB.createRow({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.usersCollectionId || 'users',
        rowId: ID.unique(),
        data: {
          fullName: fullName,
          email: email,
          avatar: avatarPlaceholderUrl,
          accountId: accountId,
          role: '', // Empty role initially - will be set when user is invited
        },
      });
      console.log(
        'User document created in users collection with fullName:',
        fullName
      );
    } else {
      // Update existing user's fullName if it's empty
      if (!existingUser.fullName || existingUser.fullName === '') {
        await tablesDB.updateRow({
          databaseId: appwriteConfig.databaseId || 'default-db',
          tableId: appwriteConfig.usersCollectionId || 'users',
          rowId: existingUser.$id,
          data: {
            fullName: fullName,
          },
        });
        console.log('Updated existing user document with fullName:', fullName);
      } else {
        console.log(
          'User document already exists with fullName:',
          existingUser.fullName
        );
      }
    }
  } catch (error) {
    console.error(
      'Failed to create/update user document in users collection:',
      error
    );
    // Don't throw error here as the Auth user was created successfully
    // The user can still sign in, but their name won't be in the custom collection
  }

  // 4. Add messaging target so user can be added as a subscriber manually
  try {
    await addUserEmailTarget({ userId: accountId, email });
  } catch (error) {
    console.warn(
      'Failed to add email target, but continuing with account creation:',
      error
    );
    // Don't throw error here as the main account creation should still succeed
  }

  // 5. Send confirmation email to user about their request
  try {
    const { mailgunService } = await import('../services/mailgun');
    await mailgunService.sendAccountRequestConfirmation(email, fullName);
    console.log('Account request confirmation email sent to:', email);
  } catch (error) {
    console.error('Failed to send account request confirmation email:', error);
    // Don't throw error here as the main account creation should still succeed
  }

  // 6. Notify executives about the new user request
  try {
    const { triggerNewUserRequestNotification } = await import(
      '../utils/notificationTriggers'
    );
    await triggerNewUserRequestNotification(email, fullName);
    console.log(
      'Executive notification sent for new user request from:',
      email
    );
  } catch (error) {
    console.error('Failed to notify executives about new user request:', error);
    // Don't throw error here as the main account creation should still succeed
  }

  return { accountId };
};

export const verifyOTP = async ({
  email,
  otp,
  accountId,
}: {
  email: string;
  otp: string;
  accountId?: string;
}) => {
  try {
    console.log('verifyOTP: Starting OTP verification for email:', email);

    const { tablesDB } = await createAdminClient();

    // Find the OTP in the database
    const result = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: appwriteConfig.otpTokensCollectionId || 'otp-tokens',
      queries: [
        Query.equal('email', email),
        Query.equal('otp', otp),
        Query.equal('used', false),
      ],
    });

    if (result.total === 0) {
      throw new Error('Invalid verification code. Please check and try again.');
    }

    const otpRecord = result.rows[0];
    const now = new Date();
    const expiresAt = new Date(otpRecord.expiresAt);

    // Check if OTP has expired
    if (now > expiresAt) {
      throw new Error(
        'The verification code has expired. Please request a new one.'
      );
    }

    // Mark OTP as used
    await tablesDB.updateRow({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: appwriteConfig.otpTokensCollectionId || 'otp-tokens',
      rowId: otpRecord.$id,
      data: {
        used: true,
      },
    });

    console.log('verifyOTP: OTP verified successfully');

    // If accountId is provided (sign-in flow), return it for client-side session creation
    if (accountId) {
      console.log('verifyOTP: Returning accountId for sign-in flow');
      return {
        success: true,
        accountId: accountId,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('verifyOTP: Error occurred:', error);

    if (error instanceof Error) {
      if (
        error.message.includes('Invalid verification code') ||
        error.message.includes('expired')
      ) {
        throw error; // Re-throw user-friendly messages
      } else {
        throw new Error('Verification failed. Please try again.');
      }
    }

    throw new Error('An unexpected error occurred. Please try again.');
  }
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
    const session = await account.createSession({
      userId: accountId,
      secret: password,
    });

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
    // Handle specific Appwrite errors with user-friendly messages
    if (error instanceof Error) {
      if (
        error.message.includes('Invalid token') ||
        error.message.includes('invalid token')
      ) {
        throw new Error(
          'The verification code you entered is invalid. Please check and try again.'
        );
      } else if (
        error.message.includes('expired') ||
        error.message.includes('Expired')
      ) {
        throw new Error(
          'The verification code has expired. Please request a new one.'
        );
      } else if (
        error.message.includes('rate limit') ||
        error.message.includes('too many')
      ) {
        throw new Error(
          'Too many attempts. Please wait a moment before trying again.'
        );
      } else if (
        error.message.includes('user not found') ||
        error.message.includes('User not found')
      ) {
        throw new Error(
          'Account not found. Please check your email and try again.'
        );
      } else if (
        error.message.includes('permission') ||
        error.message.includes('unauthorized')
      ) {
        throw new Error('You do not have permission to perform this action.');
      } else if (
        error.message.includes('network') ||
        error.message.includes('connection')
      ) {
        throw new Error(
          'Network error. Please check your connection and try again.'
        );
      } else {
        // Log the original error for debugging but return a user-friendly message
        console.error('OTP verification error:', error);
        throw new Error('Verification failed. Please try again.');
      }
    }

    // Fallback for unknown error types
    console.error('Unknown OTP verification error:', error);
    throw new Error('An unexpected error occurred. Please try again.');
  }
};

export const getCurrentUser = async () => {
  try {
    const { tablesDB, account } = await createSessionClient();
    const result = await account.get();

    console.log('getCurrentUser - Account ID:', result.$id);

    const user = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: appwriteConfig.usersCollectionId || 'users',
      queries: [Query.equal('accountId', result.$id)],
    });

    console.log('getCurrentUser - Database query result:', {
      total: user.total,
      rows: user.rows,
      firstRow: user.rows[0] || null,
    });

    if (user.total === 0) return null;

    return parseStringify(user.rows[0]);
  } catch (error) {
    // Don't log session errors as they're expected in 2FA flow
    if (error instanceof Error && error.message.includes('No session found')) {
      // If no session found, try to get user from 2FA cookies
      console.log(
        'getCurrentUser - No session found, checking 2FA authentication'
      );
      return await getCurrentUserFrom2FA();
    }
    console.log('getCurrentUser - Error:', error);
    return null;
  }
};

export const getCurrentUserFrom2FA = async () => {
  try {
    const cookieStore = await cookies();
    const hasCompleted2FA = cookieStore.get('2fa_completed');
    const userIdFromCookie = cookieStore.get('2fa_user_id');

    console.log('getCurrentUserFrom2FA - Cookie check:', {
      hasCompleted2FA: hasCompleted2FA?.value || 'Not found',
      userIdFromCookie: userIdFromCookie?.value || 'Not found',
    });

    if (!hasCompleted2FA?.value || !userIdFromCookie?.value) {
      console.log(
        'getCurrentUserFrom2FA - No 2FA completion or user ID cookie found'
      );
      return null;
    }

    // Get the actual user data from the database using the stored user ID
    try {
      const { tablesDB } = await createAdminClient();
      const userResponse = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.usersCollectionId || 'users',
        queries: [Query.equal('$id', userIdFromCookie.value)],
      });

      if (userResponse.total === 0) {
        console.log('getCurrentUserFrom2FA - User not found in database');
        return null;
      }

      const user = userResponse.rows[0];
      console.log(
        'getCurrentUserFrom2FA - Returning actual user data for 2FA-authenticated user'
      );
      return parseStringify(user);
    } catch (fetchError) {
      console.error(
        'getCurrentUserFrom2FA - Database fetch failed:',
        fetchError
      );
      return null;
    }
  } catch (error) {
    console.error('getCurrentUserFrom2FA - Error occurred:', error);
    return null;
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
    // Always delete the session cookie and 2FA cookies, then redirect
    const cookieStore = await cookies();
    cookieStore.delete('appwrite-session');
    cookieStore.delete('2fa_completed');
    cookieStore.delete('2fa_user_id');
    redirect('/sign-in');
  }
};

export const signInUser = async ({ email }: { email: string }) => {
  try {
    console.log('signInUser: Starting sign-in process for:', email);

    // Check if user exists in our custom users collection
    console.log('signInUser: Calling getUserByEmail...');
    const existingUser = (await getUserByEmail(email)) as AppUser | null;
    console.log('signInUser: existingUser result:', existingUser);

    if (existingUser) {
      console.log('signInUser: User found, sending OTP...');
      await sendEmailOTP({ email });
      console.log(
        'signInUser: OTP sent successfully, returning accountId:',
        existingUser.accountId
      );
      return { accountId: existingUser.accountId };
    }

    console.log(
      'signInUser: User not found in custom collection, checking Appwrite Auth...'
    );

    // Try to find the user in Appwrite Auth (pseudo-code, depends on your SDK)
    const client = new sdk.Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
      .setKey(process.env.NEXT_APPWRITE_API_KEY!);

    const users = new sdk.Users(client);
    const userList = await users.list({
      queries: [sdk.Query.equal('email', email)],
    });
    const authUser = userList.total > 0 ? userList.users[0] : null;

    if (authUser) {
      // Create the missing users collection document
      const { tablesDB } = await createAdminClient();
      await tablesDB.createRow({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.usersCollectionId || 'users',
        rowId: ID.unique(),
        data: {
          fullName: authUser.name || '',
          email: authUser.email,
          avatar: avatarPlaceholderUrl,
          accountId: authUser.$id,
          role: '',
        },
      });
      await sendEmailOTP({ email });
      return { accountId: authUser.$id };
    }

    return {
      accountId: null,
      error:
        'No account found with this email address. Please check your email or sign up for a new account.',
    };
  } catch (error) {
    console.error('signInUser: Error occurred:', error);
    console.error('signInUser: Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
    });

    // Handle specific errors with user-friendly messages
    if (error instanceof Error) {
      if (
        error.message.includes('Invalid email') ||
        error.message.includes('invalid email')
      ) {
        return {
          accountId: null,
          error: 'Please enter a valid email address.',
        };
      } else if (
        error.message.includes('rate limit') ||
        error.message.includes('too many')
      ) {
        return {
          accountId: null,
          error: 'Too many requests. Please wait a moment before trying again.',
        };
      } else if (
        error.message.includes('network') ||
        error.message.includes('connection')
      ) {
        return {
          accountId: null,
          error: 'Network error. Please check your connection and try again.',
        };
      } else if (
        error.message.includes('permission') ||
        error.message.includes('unauthorized')
      ) {
        return {
          accountId: null,
          error:
            'You do not have permission to sign in. Please contact support.',
        };
      } else {
        return { accountId: null, error: 'Sign in failed. Please try again.' };
      }
    }

    return {
      accountId: null,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
};

const INVITATIONS_COLLECTION =
  appwriteConfig.invitationsCollectionId || 'invitations';

// Types for invitation functions
interface CreateInvitationParams {
  email: string;
  orgId: string;
  role: string;
  department: string;
  division?: string;
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
  division,
  name,
  expiresInDays = 7,
  invitedBy,
}: CreateInvitationParams) => {
  try {
    console.log('createInvitation: Starting invitation creation for:', email);
    console.log('createInvitation: Parameters:', {
      email,
      orgId,
      role,
      department,
      division,
      name,
      invitedBy,
    });
    const { tablesDB } = await createAdminClient();
    console.log('createInvitation: Admin client created successfully');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + expiresInDays * 24 * 60 * 60 * 1000
    ).toISOString();
    const status = 'pending';
    const revoked = false;

    const normalizedRole = role.toLowerCase();
    console.log('createInvitation: Role validation:', {
      originalRole: role,
      normalizedRole,
      allowedRoles,
    });
    if (!allowedRoles.includes(normalizedRole as AllowedRole)) {
      console.error('createInvitation: Invalid role:', {
        role,
        normalizedRole,
        allowedRoles,
      });
      throw new Error(
        `Invalid role: ${role}. Must be one of ${allowedRoles.join(', ')}`
      );
    }
    console.log('createInvitation: Role validation passed');

    // Validate division against expected enum values
    const validDivisions = [
      'c-suite',
      'clinic',
      'residential',
      'help-desk',
      'hr',
      'support',
      'accounting',
      'behavioral-health',
      'child-welfare',
      'cfs',
    ];

    // Debug: Log the received parameters
    console.log('createInvitation: Received parameters:', {
      email,
      role,
      department,
      division,
      divisionType: typeof division,
      divisionLength: division?.length,
      divisionTrimmed: division?.trim(),
      isValidDivision: validDivisions.includes(division?.trim() || ''),
      validDivisions,
      name,
      orgId,
      invitedBy,
    });

    // Validate division value if provided
    if (division && !validDivisions.includes(division.trim())) {
      console.error('createInvitation: Invalid division value:', {
        received: division,
        trimmed: division.trim(),
        validOptions: validDivisions,
      });
      throw new Error(
        `Invalid division value: "${division}". Must be one of: ${validDivisions.join(
          ', '
        )}`
      );
    }

    // 1. Create invitation document
    console.log('createInvitation: Creating database row...');
    await tablesDB.createRow({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: INVITATIONS_COLLECTION,
      rowId: ID.unique(),
      data: {
        email,
        orgId,
        role: normalizedRole,
        department: department?.trim(),
        division: division?.trim(),
        name,
        token,
        expiresAt,
        status,
        revoked,
        invitedBy,
      },
    });
    console.log('createInvitation: Database row created successfully');

    // 2. Send invite link email (using Mailgun)
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'https://www.caalmsolutions.com';
    const inviteLink = `${baseUrl}/invite/accept?token=${token}`;

    // Send the invite email via Mailgun
    try {
      const { mailgunService } = await import('../services/mailgun');
      await mailgunService.sendInvitationEmail(
        email,
        name,
        inviteLink,
        normalizedRole,
        department
      );
      console.log('Invitation email sent via Mailgun to:', email);
    } catch (error) {
      console.error('Failed to send invite email via Mailgun:', error);
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
  } catch (error) {
    console.error('createInvitation: Error occurred:', error);

    // Handle specific errors with user-friendly messages
    if (error instanceof Error) {
      if (
        error.message.includes('permission') ||
        error.message.includes('unauthorized')
      ) {
        throw new Error('You do not have permission to create invitations.');
      } else if (
        error.message.includes('network') ||
        error.message.includes('connection')
      ) {
        throw new Error(
          'Network error. Please check your connection and try again.'
        );
      } else if (
        error.message.includes('database') ||
        error.message.includes('collection')
      ) {
        throw new Error('Database error. Please try again later.');
      } else {
        // Log the original error for debugging but return a user-friendly message
        console.error('createInvitation: Original error:', error);
        throw new Error('Failed to create invitation. Please try again.');
      }
    }

    // Fallback for unknown error types
    console.error('createInvitation: Unknown error:', error);
    throw new Error('An unexpected error occurred. Please try again.');
  }
};

export const acceptInvitation = async ({ token }: AcceptInvitationParams) => {
  const { tablesDB } = await createAdminClient();
  const result = await tablesDB.listRows({
    databaseId: appwriteConfig.databaseId || 'default-db',
    tableId: INVITATIONS_COLLECTION,
    queries: [Query.equal('token', token)],
  });
  if (result.total === 0) throw new Error('Invalid invitation token');
  const invite = result.rows[0];
  if (invite.status !== 'pending' || invite.revoked)
    throw new Error('Invitation is not valid');
  if (new Date(invite.expiresAt) < new Date())
    throw new Error('Invitation expired');

  // 1. Find Auth user by email
  const client = new sdk.Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
    .setKey(process.env.NEXT_APPWRITE_API_KEY!);
  const users = new sdk.Users(client);
  const userList = await users.list({
    queries: [sdk.Query.equal('email', invite.email)],
  });
  const authUser = userList.total > 0 ? userList.users[0] : null;
  if (!authUser) throw new Error('User not found in Auth');
  const accountId = authUser.$id;

  // 2. Create users collection document with role if not exists
  let user = await getUserByEmail(invite.email);
  if (!user) {
    const normalizedRole = invite.role.toLowerCase();

    // Validate division against expected enum values
    const validDivisions = [
      'c-suite',
      'clinic',
      'residential',
      'help-desk',
      'hr',
      'support',
      'accounting',
      'behavioral-health',
      'child-welfare',
      'cfs',
    ];

    console.log('acceptInvitation: Creating user with data:', {
      fullName: invite.name,
      email: invite.email,
      role: normalizedRole,
      department: invite.department,
      division: invite.division,
      divisionType: typeof invite.division,
      divisionLength: invite.division?.length,
      divisionTrimmed: invite.division?.trim(),
      isValidDivision: validDivisions.includes(invite.division?.trim() || ''),
      validDivisions,
    });

    // Validate division value
    if (invite.division && !validDivisions.includes(invite.division.trim())) {
      console.error('acceptInvitation: Invalid division value:', {
        received: invite.division,
        trimmed: invite.division.trim(),
        validOptions: validDivisions,
      });
      throw new Error(
        `Invalid division value: "${
          invite.division
        }". Must be one of: ${validDivisions.join(', ')}`
      );
    }

    await tablesDB.createRow({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: appwriteConfig.usersCollectionId || 'users',
      rowId: sdk.ID.unique(),
      data: {
        fullName: invite.name,
        email: invite.email,
        avatar: avatarPlaceholderUrl,
        accountId,
        role: normalizedRole,
        department: invite.department,
        division: invite.division,
      },
    });
    user = await getUserByEmail(invite.email);
  }
  if (!user) throw new Error('User creation failed');

  // 3. Mark invitation as accepted
  await tablesDB.updateRow({
    databaseId: appwriteConfig.databaseId || 'default-db',
    tableId: INVITATIONS_COLLECTION,
    rowId: invite.$id,
    data: { status: 'accepted' },
  });

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
  const { tablesDB } = await createAdminClient();
  const result = await tablesDB.listRows({
    databaseId: appwriteConfig.databaseId || 'default-db',
    tableId: INVITATIONS_COLLECTION,
    queries: [Query.equal('token', token)],
  });
  if (result.total === 0) throw new Error('Invalid invitation token');
  const invite = result.rows[0];
  await tablesDB.updateRow({
    databaseId: appwriteConfig.databaseId || 'default-db',
    tableId: INVITATIONS_COLLECTION,
    rowId: invite.$id,
    data: { revoked: true, status: 'revoked' },
  });
  return { success: true };
};

export const deleteInvitation = async ({ token }: RevokeInvitationParams) => {
  const { tablesDB } = await createAdminClient();
  const result = await tablesDB.listRows({
    databaseId: appwriteConfig.databaseId || 'default-db',
    tableId: INVITATIONS_COLLECTION,
    queries: [Query.equal('token', token)],
  });
  if (result.total === 0) throw new Error('Invalid invitation token');
  const invite = result.rows[0];
  await tablesDB.deleteRow({
    databaseId: appwriteConfig.databaseId || 'default-db',
    tableId: INVITATIONS_COLLECTION,
    rowId: invite.$id,
  });
  return { success: true };
};

export const listPendingInvitations = async ({
  orgId,
}: ListPendingInvitationsParams) => {
  const { tablesDB } = await createAdminClient();
  const result = await tablesDB.listRows({
    databaseId: appwriteConfig.databaseId || 'default-db',
    tableId: INVITATIONS_COLLECTION,
    queries: [
      Query.equal('orgId', orgId),
      Query.equal('status', 'pending'),
      Query.equal('revoked', false),
    ],
  });
  return result.rows;
};

export const addUserEmailTarget = async ({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) => {
  const client = new sdk.Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
    .setKey(process.env.NEXT_APPWRITE_API_KEY!);

  const users = new sdk.Users(client);
  const targetType = sdk.MessagingProviderType.Email;

  try {
    // First, check if a target already exists for this user and email
    const existingTargets = await users.listTargets({ userId });
    const existingEmailTarget = existingTargets.targets.find(
      (target) => target.providerType === 'email' && target.identifier === email
    );

    if (existingEmailTarget) {
      console.log('Email target already exists for user:', userId);
      return existingEmailTarget;
    }

    // If no existing target, create a new one with a more specific ID
    const targetId = `email_${userId}_${Date.now()}`;
    const response = await users.createTarget({
      userId: userId,
      targetId: targetId,
      providerType: targetType,
      identifier: email,
    });
    return response;
  } catch (error) {
    // If the error is about duplicate ID, try with a different approach
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('Target ID conflict, trying with unique ID...');
      try {
        const response = await users.createTarget({
          userId,
          targetId: ID.unique(),
          providerType: targetType,
          identifier: email,
        });
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

export const addUserSmsTarget = async ({
  userId,
  e164Phone,
}: {
  userId: string;
  e164Phone: string;
}) => {
  const client = new sdk.Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
    .setKey(process.env.NEXT_APPWRITE_API_KEY!);

  const users = new sdk.Users(client);
  const targetType = sdk.MessagingProviderType.Sms;

  try {
    // Validate E.164 format
    if (!/^\+\d{10,15}$/.test(e164Phone)) {
      throw new Error('Phone must be in E.164 format, e.g. +15551234567');
    }

    // Check if an SMS target already exists for this user and phone
    const existingTargets = await users.listTargets({ userId });
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
      const response = await users.createTarget({
        userId: userId,
        targetId: targetId,
        providerType: targetType,
        identifier: e164Phone,
      });
      return response;
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        return await users.createTarget({
          userId: userId,
          targetId: sdk.ID.unique(),
          providerType: targetType,
          identifier: e164Phone,
        });
      }
      throw err;
    }
  } catch (error) {
    console.error('Error creating SMS target:', error);
    throw error;
  }
};

export const getInvitationByToken = async (token: string) => {
  const { tablesDB } = await createAdminClient();
  const result = await tablesDB.listRows({
    databaseId: appwriteConfig.databaseId || 'default-db',
    tableId: INVITATIONS_COLLECTION,
    queries: [Query.equal('token', token)],
  });
  return result.total > 0 ? result.rows[0] : null;
};

export const resendInvitation = async ({ token }: { token: string }) => {
  try {
    console.log('resendInvitation: Starting resend for token:', token);

    const { tablesDB } = await createAdminClient();

    // Get the invitation details
    const result = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: INVITATIONS_COLLECTION,
      queries: [Query.equal('token', token)],
    });

    if (result.rows.length === 0) {
      throw new Error('Invitation not found');
    }

    const invitation = result.rows[0];
    console.log('resendInvitation: Found invitation:', invitation);

    // Check if invitation is still valid (not revoked and not expired)
    if (invitation.revoked) {
      throw new Error('Cannot resend a revoked invitation');
    }

    const now = new Date();
    const expiresAt = new Date(invitation.expiresAt);
    if (now > expiresAt) {
      throw new Error('Cannot resend an expired invitation');
    }

    // Generate new invite link
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'https://www.caalmsolutions.com';
    const inviteLink = `${baseUrl}/invite/accept?token=${token}`;

    // Send the invite email via Mailgun
    const { mailgunService } = await import('../services/mailgun');
    await mailgunService.sendInvitationEmail(
      invitation.email,
      invitation.name,
      inviteLink,
      invitation.role,
      invitation.department
    );

    console.log(
      'resendInvitation: Email resent successfully to:',
      invitation.email
    );

    return { success: true, email: invitation.email };
  } catch (error) {
    console.error('resendInvitation: Error occurred:', error);

    if (error instanceof Error) {
      throw new Error(`Failed to resend invitation: ${error.message}`);
    } else {
      throw new Error('Failed to resend invitation');
    }
  }
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
  division,
  role,
}: {
  accountId: string;
  fullName?: string;
  division?: UserDivision;
  role?: string;
}) => {
  try {
    const { tablesDB } = await createAdminClient();
    // Find the user document by accountId
    const userList = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: appwriteConfig.usersCollectionId || 'users',
      queries: [Query.equal('accountId', accountId)],
    });
    if (userList.total === 0) throw new Error('User not found');
    const userDoc = userList.rows[0];
    // Prepare update payload
    const updatePayload: Record<string, unknown> = {};
    if (fullName !== undefined) updatePayload.fullName = fullName;
    if (role !== undefined) updatePayload.role = role;
    if (division !== undefined) updatePayload.division = division;
    // Update the user document
    const updatedUser = await tablesDB.updateRow({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: appwriteConfig.usersCollectionId || 'users',
      rowId: userDoc.$id,
      data: updatePayload,
    });
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
    const { tablesDB } = await createAdminClient();
    const result = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: appwriteConfig.usersCollectionId || 'users',
    });
    return result.rows;
  } catch (error) {
    handleError(error, 'Failed to list all users');
  }
};

export const getActiveUsersCount = async () => {
  try {
    const { tablesDB } = await createAdminClient();
    const result = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: appwriteConfig.usersCollectionId || 'users',
      queries: [Query.equal('status', 'active')],
    });
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
    const { tablesDB } = await createAdminClient();
    await tablesDB.deleteRow({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: appwriteConfig.usersCollectionId || 'users',
      rowId: userId,
    });
    return { success: true };
  } catch (error) {
    handleError(error, 'Failed to delete user');
  }
};

export const getContracts = async () => {
  const { tablesDB } = await createAdminClient();
  try {
    const res = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: appwriteConfig.contractsCollectionId || 'contracts',
    });
    return parseStringify(res.rows);
  } catch (error) {
    console.error('Failed to fetch contracts:', error);
    return [];
  }
};

export const getUnreadNotificationsCount = async (userId: string) => {
  const { tablesDB } = await createAdminClient();
  try {
    const res = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: 'notifications',
      queries: [Query.equal('userId', userId), Query.equal('read', false)],
    });
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
      .setKey(process.env.NEXT_APPWRITE_API_KEY!);
    const users = new sdk.Users(client);
    const authUsers = await users.list({});

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
  const { tablesDB } = await createAdminClient();
  try {
    // Get all Auth users
    const client = new sdk.Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
      .setKey(process.env.NEXT_APPWRITE_API_KEY!);
    const users = new sdk.Users(client);
    const authUsers = await users.list({});

    // Get all users in the users collection (invited users)
    const invitedUsers = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: appwriteConfig.usersCollectionId || 'users',
    });

    // Get all pending invitations
    const pendingInvitations = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: INVITATIONS_COLLECTION,
      queries: [Query.equal('status', 'pending')],
    });

    // Filter out users who are already in the users collection or have pending invitations
    const invitedEmails = new Set([
      ...invitedUsers.rows.map(
        (u: Record<string, unknown>) => u.email as string
      ),
      ...pendingInvitations.rows.map(
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
