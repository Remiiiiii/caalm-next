import twilio from 'twilio';
import { appwriteConfig } from '@/lib/appwrite/config';

interface SMSNotificationData {
  to: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

class TwilioService {
  private client: twilio.Twilio | null = null;
  private phoneNumber: string | null = null;
  private initialized: boolean = false;

  private initialize() {
    if (this.initialized) return;

    if (!appwriteConfig.twilioAccountSid || !appwriteConfig.twilioAuthToken) {
      throw new Error('Twilio credentials not configured');
    }

    this.client = twilio(
      appwriteConfig.twilioAccountSid,
      appwriteConfig.twilioAuthToken
    );
    this.phoneNumber = appwriteConfig.twilioPhoneNumber;
    this.initialized = true;
  }

  /**
   * Send SMS notification to a user
   */
  async sendSMS(data: SMSNotificationData): Promise<boolean> {
    try {
      // Initialize if not already done
      this.initialize();

      if (!this.client || !this.phoneNumber) {
        throw new Error('Twilio client not initialized');
      }

      // Validate phone number format
      if (!this.isValidPhoneNumber(data.to)) {
        throw new Error(`Invalid phone number format: ${data.to}`);
      }

      // Truncate message if it's too long (SMS limit is 160 characters)
      const truncatedMessage =
        data.message.length > 160
          ? data.message.substring(0, 157) + '...'
          : data.message;

      const message = await this.client.messages.create({
        body: truncatedMessage,
        from: this.phoneNumber,
        to: data.to,
      });

      console.log(`SMS sent successfully to ${data.to}. SID: ${message.sid}`);
      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      throw new Error(
        `Failed to send SMS: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Send bulk SMS notifications
   */
  async sendBulkSMS(
    notifications: SMSNotificationData[]
  ): Promise<{ success: number; failed: number }> {
    const results = await Promise.allSettled(
      notifications.map((notification) => this.sendSMS(notification))
    );

    const success = results.filter(
      (result) => result.status === 'fulfilled'
    ).length;
    const failed = results.filter(
      (result) => result.status === 'rejected'
    ).length;

    return { success, failed };
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic validation - should start with + and contain only digits
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Format phone number to international format
   */
  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');

    // If it doesn't start with +, assume it's a US number
    if (!cleaned.startsWith('+')) {
      cleaned = '+1' + cleaned;
    }

    return cleaned;
  }

  /**
   * Check if Twilio is properly configured
   */
  isConfigured(): boolean {
    return !!(
      appwriteConfig.twilioAccountSid &&
      appwriteConfig.twilioAuthToken &&
      appwriteConfig.twilioPhoneNumber
    );
  }

  /**
   * Get account information (for testing)
   */
  async getAccountInfo() {
    try {
      // Initialize if not already done
      this.initialize();

      if (!this.client) {
        throw new Error('Twilio client not initialized');
      }

      const account = await this.client.api
        .accounts(appwriteConfig.twilioAccountSid)
        .fetch();
      return {
        sid: account.sid,
        status: account.status,
        type: account.type,
        balance: account.balance,
      };
    } catch (error) {
      console.error('Failed to get account info:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const twilioService = new TwilioService();
