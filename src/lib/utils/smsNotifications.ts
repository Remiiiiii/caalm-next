import { twilioService } from '@/lib/services/twilioService';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';

// Get users by roles from users collection
async function getUsersByRoles(roles: string[]) {
  const { tablesDB } = await createAdminClient();
  const result = await tablesDB.listRows({
    databaseId: appwriteConfig.databaseId!,
    tableId: appwriteConfig.usersCollectionId!,
    queries: [Query.equal('role', roles), Query.equal('status', 'active')],
  });
  return result.rows;
}

// Get phone numbers from Appwrite Auth for users
async function getUsersWithPhoneNumbers(users: any[]) {
  const { Client, Users } = await import('node-appwrite');
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
    .setKey(process.env.NEXT_APPWRITE_API_KEY!);

  const authUsers = new Users(client);
  const usersWithPhones = [];

  console.log(`SMS: Checking ${users.length} users for phone numbers`);

  for (const user of users) {
    try {
      console.log(
        `SMS: Fetching Auth data for ${user.fullName} (${user.accountId})`
      );
      // Get user from Auth using accountId
      const authUser = await authUsers.get(user.accountId);

      console.log(`SMS: Auth user data for ${user.fullName}:`, {
        phone: authUser.phone,
        email: authUser.email,
        name: authUser.name,
      });

      // Check if user has phone number in Auth
      if (authUser.phone) {
        usersWithPhones.push({
          ...user,
          phone: authUser.phone,
        });
        console.log(`SMS: Added ${user.fullName} with phone ${authUser.phone}`);
      } else {
        console.log(`SMS: No phone found for ${user.fullName}`);
      }
    } catch (error) {
      console.warn(
        `SMS: Could not fetch phone for user ${user.fullName}:`,
        error
      );
    }
  }

  console.log(`SMS: Found ${usersWithPhones.length} users with phone numbers`);
  return usersWithPhones;
}

// Get managers in a specific department
async function getDepartmentManagers(department: string) {
  const { tablesDB } = await createAdminClient();
  const result = await tablesDB.listRows({
    databaseId: appwriteConfig.databaseId!,
    tableId: appwriteConfig.usersCollectionId!,
    queries: [
      Query.equal('role', 'manager'),
      Query.equal('department', department),
      Query.equal('status', 'active'),
    ],
  });
  return result.rows;
}

// Send SMS (awaitable for reliability in serverless environments)
export async function sendOnboardingSMS(recipients: any[], message: string) {
  try {
    if (recipients.length === 0) {
      console.log('SMS: No recipients with phone numbers for SMS notification');
      return;
    }

    console.log(`SMS: Preparing to send to ${recipients.length} recipients`);

    const notifications = recipients.map((user) => ({
      to: twilioService.formatPhoneNumber(user.phone),
      message,
      priority: 'medium' as const,
    }));

    await twilioService.sendBulkSMS(notifications);
    console.log(
      `SMS: Successfully sent ${notifications.length} onboarding SMS notifications`
    );
  } catch (error) {
    console.error('SMS: Failed to send SMS:', error);
    // Don't throw - let the parent function continue
  }
}

// Notification 1: OTP Verified - Admin only
export async function notifyOTPVerified(email: string, name?: string) {
  console.log('SMS: notifyOTPVerified called for', email);
  const adminUsers = await getUsersByRoles(['admin']);
  console.log('SMS: Found admin users:', adminUsers.length);
  const adminsWithPhones = await getUsersWithPhoneNumbers(adminUsers);
  const message = `New user ${name} (${email}) has verified their email and is pending approval.`;
  await sendOnboardingSMS(adminsWithPhones, message);
}

// Notification 2: Invitation Sent - Admin, Executive, Department Managers only
export async function notifyInvitationSent(
  email: string,
  name: string,
  role: string,
  department: string
) {
  console.log('SMS: notifyInvitationSent called for', {
    email,
    name,
    role,
    department,
  });

  const adminAndExecUsers = await getUsersByRoles(['admin', 'executive']);
  console.log('SMS: Found admin/exec users:', adminAndExecUsers.length);

  const deptManagerUsers = await getDepartmentManagers(department);
  console.log('SMS: Found department managers:', deptManagerUsers.length);

  const adminAndExecWithPhones = await getUsersWithPhoneNumbers(
    adminAndExecUsers
  );
  const deptManagersWithPhones = await getUsersWithPhoneNumbers(
    deptManagerUsers
  );
  const allRecipients = [...adminAndExecWithPhones, ...deptManagersWithPhones];

  console.log('SMS: Total recipients with phones:', allRecipients.length);

  const message = `Invitation sent to ${name} (${email}) for the ${role} role in the ${department} department.`;
  await sendOnboardingSMS(allRecipients, message);
}

// Notification 3: Invitation Accepted - Admin, Executive, Department Managers
export async function notifyInvitationAccepted(
  email: string,
  name: string,
  role: string,
  department: string
) {
  console.log('SMS: notifyInvitationAccepted called for', {
    email,
    name,
    role,
    department,
  });

  const adminAndExecUsers = await getUsersByRoles(['admin', 'executive']);
  console.log('SMS: Found admin/exec users:', adminAndExecUsers.length);

  const deptManagerUsers = await getDepartmentManagers(department);
  console.log('SMS: Found department managers:', deptManagerUsers.length);

  const adminAndExecWithPhones = await getUsersWithPhoneNumbers(
    adminAndExecUsers
  );
  const deptManagersWithPhones = await getUsersWithPhoneNumbers(
    deptManagerUsers
  );
  const allRecipients = [...adminAndExecWithPhones, ...deptManagersWithPhones];

  console.log('SMS: Total recipients with phones:', allRecipients.length);

  const message = `${name} has accepted the invitation for ${role} in the ${department} department.`;
  await sendOnboardingSMS(allRecipients, message);
}

// Notification 4: 2FA Completed - Admin, Executive, and Department Managers
export async function notify2FACompleted(
  email: string,
  name: string,
  department: string
) {
  console.log('SMS: notify2FACompleted called for', {
    email,
    name,
    department,
  });

  const adminAndExecUsers = await getUsersByRoles(['admin', 'executive']);
  console.log('SMS: Found admin/exec users:', adminAndExecUsers.length);

  const deptManagerUsers = await getDepartmentManagers(department);
  console.log('SMS: Found department managers:', deptManagerUsers.length);

  const adminAndExecWithPhones = await getUsersWithPhoneNumbers(
    adminAndExecUsers
  );
  const deptManagersWithPhones = await getUsersWithPhoneNumbers(
    deptManagerUsers
  );
  const allRecipients = [...adminAndExecWithPhones, ...deptManagersWithPhones];

  console.log('SMS: Total recipients with phones:', allRecipients.length);

  const message = `${name} (${email}) has completed 2FA setup and is ready to access the system.`;
  await sendOnboardingSMS(allRecipients, message);
}
