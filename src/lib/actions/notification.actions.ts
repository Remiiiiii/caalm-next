'use server';

import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { ID, Query } from 'node-appwrite';
import {
  formatDepartmentName,
  type ContractDepartment,
} from '../../../constants';

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

interface CreateNotificationProps {
  userId: string;
  title: string;
  message: string;
  type: string;
  read?: boolean;
}

export const createNotification = async ({
  userId,
  title,
  message,
  type,
  read = false,
}: CreateNotificationProps) => {
  const { databases } = await createAdminClient();
  try {
    const notification = await databases.createDocument(
      appwriteConfig.databaseId,
      'notifications',
      ID.unique(),
      {
        userId,
        title,
        message,
        type,
        read,
      }
    );
    // SMS notification is now handled automatically by the notification service
    // when creating notifications, so no additional action needed here
    return notification;
  } catch (error) {
    handleError(error, 'Failed to create notification');
  }
};

export const getNotifications = async (userId: string) => {
  const { databases } = await createAdminClient();
  try {
    const notifications = await databases.listDocuments(
      appwriteConfig.databaseId,
      'notifications',
      [Query.equal('userId', userId), Query.orderDesc('$createdAt')]
    );
    return notifications;
  } catch (error) {
    handleError(error, 'Failed to get notifications');
  }
};

export const markNotificationAsRead = async (notificationId: string) => {
  const { databases } = await createAdminClient();
  try {
    const notification = await databases.updateDocument(
      appwriteConfig.databaseId,
      'notifications',
      notificationId,
      { read: true }
    );
    return notification;
  } catch (error) {
    handleError(error, 'Failed to mark notification as read');
  }
};

export const markNotificationAsUnread = async (notificationId: string) => {
  const { databases } = await createAdminClient();
  try {
    const notification = await databases.updateDocument(
      appwriteConfig.databaseId,
      'notifications',
      notificationId,
      { read: false }
    );
    return notification;
  } catch (error) {
    handleError(error, 'Failed to mark notification as unread');
  }
};

export const deleteNotification = async (notificationId: string) => {
  const { databases } = await createAdminClient();
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      'notifications',
      notificationId
    );
    return { success: true };
  } catch (error) {
    handleError(error, 'Failed to delete notification');
  }
};

export const getUnreadNotificationsCount = async (userId: string) => {
  const { databases } = await createAdminClient();
  try {
    const notifications = await databases.listDocuments(
      appwriteConfig.databaseId,
      'notifications',
      [Query.equal('userId', userId), Query.equal('read', false)]
    );
    return notifications.total;
  } catch (error) {
    console.error('Failed to fetch unread notifications count:', error);
    return 0;
  }
};

// Contract expiration notification functions
const getDaysUntilExpiry = (expiryDate: string): number => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diff = expiry.getTime() - today.setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const shouldSendNotification = (daysUntil: number): boolean => {
  const thresholds = [30, 15, 10, 5, 1];
  return thresholds.includes(daysUntil);
};

export const checkContractExpirations = async () => {
  const { databases } = await createAdminClient();
  try {
    // Get all contracts with expiry dates
    const contracts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.contractsCollectionId,
      [Query.isNotNull('contractExpiryDate')]
    );

    // Get all users with allowed roles
    const allowedRoles = ['executive', 'manager', 'admin'];
    const users = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.equal('role', allowedRoles)]
    );

    const notificationsCreated: string[] = [];

    for (const contract of contracts.documents) {
      if (!contract.contractExpiryDate) continue;

      const daysUntil = getDaysUntilExpiry(contract.contractExpiryDate);

      if (!shouldSendNotification(daysUntil)) continue;

      // Check if notification already exists for this contract and threshold
      const existingNotifications = await databases.listDocuments(
        appwriteConfig.databaseId,
        'notifications',
        [
          Query.equal('type', 'contract-expiry'),
          Query.equal('contractId', contract.$id),
          Query.equal('daysUntil', daysUntil),
        ]
      );

      if (existingNotifications.total > 0) continue;

      for (const user of users.documents) {
        let shouldNotify = false;

        // Executive and Admin get notifications for all contracts
        if (user.role === 'executive' || user.role === 'admin') {
          shouldNotify = true;
        }
        // Manager only gets notifications for contracts in their department
        else if (user.role === 'manager' && contract.department) {
          shouldNotify = user.department === contract.department;
        }

        if (shouldNotify) {
          const departmentLabel = contract.department
            ? formatDepartmentName(contract.department)
            : 'Unknown Department';

          const notification = await createNotification({
            userId: user.accountId,
            title: 'Contract Expiry Reminder',
            message: `The contract "${
              contract.contractName
            }" in ${departmentLabel} is set to expire in ${daysUntil} days (on ${contract.contractExpiryDate.slice(
              0,
              10
            )}).`,
            type: 'contract-expiry',
            read: false,
          });

          if (notification) {
            notificationsCreated.push(notification.$id);
          }
        }
      }
    }

    return { notificationsCreated: notificationsCreated.length };
  } catch (error) {
    handleError(error, 'Failed to check contract expirations');
  }
};

export const assignContractToDepartment = async ({
  contractId,
  department,
}: {
  contractId: string;
  department: ContractDepartment;
}) => {
  const { databases } = await createAdminClient();
  try {
    const updatedContract = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.contractsCollectionId,
      contractId,
      { department }
    );

    // Trigger expiration check after department assignment
    await checkContractExpirations();

    return updatedContract;
  } catch (error) {
    handleError(error, 'Failed to assign contract to department');
  }
};
