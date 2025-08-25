import { ID } from 'appwrite';
import { createAdminClient } from '@/lib/appwrite';

interface SMSNotificationData {
  userId: string;
  content: string;
  type_key?: string;
  userName?: string;
  contractName?: string;
  daysUntilExpiry?: number;
  contractExpiryDate?: string;
}

interface AppwriteMessageResponse {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  [key: string]: unknown;
}

class AppwriteMessagingService {
  private client: Awaited<ReturnType<typeof createAdminClient>> | null = null;

  private async getClient() {
    if (!this.client) {
      this.client = await createAdminClient();
    }
    return this.client;
  }

  /**
   * Send SMS notification using Appwrite messaging service
   */
  async sendSmsNotification(
    userId: string,
    content: string
  ): Promise<AppwriteMessageResponse> {
    try {
      const client = await this.getClient();
      const message = await client.messaging.createSms(
        ID.unique(),
        content,
        [],
        [userId]
      );

      console.log(`SMS sent successfully to user ${userId}`);
      return JSON.parse(JSON.stringify(message)) as AppwriteMessageResponse;
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
      throw new Error(
        `Failed to send SMS: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Send contract expiry SMS notification with professional formatting
   */
  async sendContractExpiryNotification(
    data: SMSNotificationData
  ): Promise<AppwriteMessageResponse> {
    const {
      userId,
      userName,
      contractName,
      daysUntilExpiry,
      contractExpiryDate,
    } = data;

    const smsMessage = `📋 Contract Renewal Reminder

Hi ${
      userName || 'there'
    }! Your contract "${contractName}" expires in ${daysUntilExpiry} days (${contractExpiryDate}).

✅ Action needed: Please review and complete the renewal process at your earliest convenience to maintain uninterrupted services.

Thank you for using Caalm!`;

    return this.sendSmsNotification(userId, smsMessage);
  }

  /**
   * Send generic SMS notification
   */
  async sendGenericNotification(
    userId: string,
    title: string,
    message: string
  ): Promise<AppwriteMessageResponse> {
    const smsMessage = `${title}

${message}

Thank you!`;

    return this.sendSmsNotification(userId, smsMessage);
  }

  /**
   * Check if messaging service is available
   */
  async isConfigured(): Promise<boolean> {
    try {
      const client = await this.getClient();
      return !!client.messaging;
    } catch {
      return false;
    }
  }
}

export const appwriteMessagingService = new AppwriteMessagingService();
