import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Users, ID, Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { tablesDB } from '@/lib/appwrite/client';

const THRESHOLDS = [30, 15, 10, 5, 1];
const DB_ID = '685ed87c0009d8189fc7';
const COLLECTIONS = {
  contracts: 'contracts',
  audits: 'audits',
  licenses: 'licenses',
  notifications: 'notifications',
};

const getDaysUntil = (dateStr: string) => {
  const today = new Date();
  const expiry = new Date(dateStr);
  const diff = expiry.getTime() - today.setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const getDocInfo = (doc: Record<string, unknown>, type: string) => {
  if (type === 'contracts') {
    return {
      name: (doc.contractName as string) || '',
      expiry: (doc.contractExpiryDate as string) || '',
    };
  } else if (type === 'audits') {
    return {
      name: (doc.auditName as string) || '',
      expiry: (doc.auditExpiryDate as string) || '',
    };
  } else if (type === 'licenses') {
    return {
      name: (doc.licenseName as string) || '',
      expiry: (doc.licenseExpiryDate as string) || '',
    };
  }
  return { name: '', expiry: '' };
};

async function sendExpiryEmail({
  subject,
  message,
}: {
  to: string;
  subject: string;
  message: string;
}) {
  const { messaging } = await createAdminClient();

  // You may want to use a specific topic or target for expiry notifications.
  // For now, use the same topic as invitations.
  const topicId = '6874366b003d9fefafd2';

  try {
    await messaging.createEmail({
      messageId: ID.unique(),
      subject: subject,
      content: message,
      topics: [topicId], // topics
      users: [], // users (optional)
      targets: [], // targets (can be used for direct emails if needed)
      cc: [], // cc (optional)
      bcc: [], // bcc (optional)
      attachments: [], // attachments (optional)
      draft: false, // draft (optional)
      html: true, // html (optional)
      scheduledAt: '', // scheduledAt (optional)
    });
  } catch (error) {
    console.error('Failed to send expiry notification email:', error);
    throw error;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_req: NextRequest) {
  // Setup Appwrite client
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_NOTIFICATION_API_KEY!);
  const db = new Databases(client);
  const users = new Users(client);

  // 1. Fetch all users with allowed roles
  const allowedRoles = ['executive', 'manager', 'admin'];
  const userList = await tablesDB.listRows({
    queries: [Query.or(allowedRoles.map((role) => Query.equal('role', role)))],
  });
  const recipients = userList.users;

  // 2. For each collection, check for expiring docs
  for (const [type, collection] of Object.entries(COLLECTIONS)) {
    if (type === 'notifications') continue;
    const docs = await tablesDB.listRows({
      databaseId: DB_ID,
      tableId: collection,
    });
    for (const doc of docs.rows) {
      const { name, expiry } = getDocInfo(doc, type);
      if (!expiry) continue;
      const daysUntil = getDaysUntil(expiry);
      if (THRESHOLDS.includes(daysUntil)) {
        for (const user of recipients) {
          // Create in-app notification
          await tablesDB.createRow({
            databaseId: DB_ID,
            tableId: COLLECTIONS.notifications,
            rowId: ID.unique(),
            data: {
              userId: user.$id,
              title: `${type.slice(0, -1).toUpperCase()} Expiry Reminder`,
              message: `The ${type.slice(
                0,
                -1
              )} "${name}" is set to expire in ${daysUntil} days (on ${expiry.slice(
                0,
                10
              )}).`,
              type: 'expiry',
              read: false,
            },
          });
          // Send email (placeholder)
          await sendExpiryEmail({
            to: user.email,
            subject: `[CAALM] ${type.slice(
              0,
              -1
            )} Expiry Reminder: "${name}" Expires in ${daysUntil} Days`,
            message: `Hello ${
              user.name
            },\n\nThis is a reminder that the ${type.slice(
              0,
              -1
            )} "${name}" is set to expire in ${daysUntil} days, on ${expiry.slice(
              0,
              10
            )}.\n\nPlease review the document and take any necessary action to ensure compliance.\n\nBest regards,\nCAALM Team`,
          });
        }
      }
    }
  }
  return NextResponse.json({ status: 'ok' });
}
