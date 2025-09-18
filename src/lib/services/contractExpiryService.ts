import { createAdminClient } from '@/lib/appwrite';
import { triggerContractExpiryNotification } from '@/lib/utils/notificationTriggers';

// Lazy import to avoid initialization errors when messaging service is not configured
let appwriteMessagingService: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

async function getAppwriteMessagingService() {
  if (!appwriteMessagingService) {
    const { appwriteMessagingService: service } = await import(
      './appwriteMessagingService'
    );
    appwriteMessagingService = service;
  }
  return appwriteMessagingService;
}

interface Contract {
  $id: string;
  contractName: string;
  contractExpiryDate: string;
  status: string;
  assignedManagers?: string[];
  department?: string;
}

interface NotificationSettings {
  user_id: string;
  push_enabled: boolean;
  phone_number?: string;
  notification_types: string[];
}

class ContractExpiryService {
  private client: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

  private async getClient() {
    if (!this.client) {
      this.client = await createAdminClient();
    }
    return this.client;
  }

  /**
   * Check for contracts expiring soon and send notifications
   */
  async checkContractExpiry(): Promise<void> {
    try {
      console.log('🔍 Checking for contracts expiring soon...');

      // Get all active contracts
      const contracts = await this.getActiveContracts();

      // Get all users with notification settings
      const usersWithNotifications = await this.getUsersWithNotifications();

      for (const contract of contracts) {
        const daysUntilExpiry = this.calculateDaysUntilExpiry(
          contract.contractExpiryDate
        );

        // Check if contract expires within 30 days
        if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
          console.log(
            `📅 Contract "${contract.contractName}" expires in ${daysUntilExpiry} days`
          );

          // Send notifications to assigned managers and users with contract-expiry enabled
          await this.sendExpiryNotifications(
            contract,
            daysUntilExpiry,
            usersWithNotifications
          );
        }
      }

      console.log('✅ Contract expiry check completed');
    } catch (error) {
      console.error('❌ Error checking contract expiry:', error);
    }
  }

  /**
   * Get all active contracts
   */
  private async getActiveContracts(): Promise<Contract[]> {
    try {
      const client = await this.getClient();
      const response = await client.tablesDB.listRows({
        databaseId: '685ed87c0009d8189fc7',
        tableId: 'contracts',
        queries: [
          // Only get active contracts
          // Note: You might want to adjust this filter based on your status values
        ],
      });

      return response.rows as Contract[];
    } catch (error) {
      console.error('Error fetching contracts:', error);
      return [];
    }
  }

  /**
   * Get users with notification settings enabled
   */
  private async getUsersWithNotifications(): Promise<NotificationSettings[]> {
    try {
      const client = await this.getClient();
      const response = await client.tablesDB.listRows({
        databaseId: '685ed87c0009d8189fc7',
        tableId: 'notification_settings',
        queries: [
          // Only get users with push notifications enabled
        ],
      });

      return response.rows as NotificationSettings[];
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      return [];
    }
  }

  /**
   * Calculate days until expiry
   */
  private calculateDaysUntilExpiry(expiryDate: string): number {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Send expiry notifications to relevant users
   */
  private async sendExpiryNotifications(
    contract: Contract,
    daysUntilExpiry: number,
    usersWithNotifications: NotificationSettings[]
  ): Promise<void> {
    const targetUserIds = new Set<string>();

    // Add assigned managers
    if (contract.assignedManagers) {
      contract.assignedManagers.forEach((managerId) =>
        targetUserIds.add(managerId)
      );
    }

    // Add users with contract-expiry notifications enabled
    usersWithNotifications.forEach((user) => {
      if (user.notification_types.includes('contract-expiry')) {
        targetUserIds.add(user.user_id);
      }
    });

    // Send notifications to each target user
    for (const userId of targetUserIds) {
      try {
        await triggerContractExpiryNotification(
          userId,
          contract.contractName,
          contract.contractExpiryDate,
          daysUntilExpiry
        );

        console.log(
          `📱 Sent expiry notification to user ${userId} for contract "${contract.contractName}"`
        );
      } catch (error) {
        console.error(`Failed to send notification to user ${userId}:`, error);
      }
    }
  }

  /**
   * Manual trigger for testing specific contract
   */
  async triggerContractExpiryNotification(
    contractId: string,
    userId: string
  ): Promise<void> {
    try {
      const client = await this.getClient();
      const contract = (await client.databases.getDocument(
        '685ed87c0009d8189fc7',
        'contracts',
        contractId
      )) as Contract;

      const daysUntilExpiry = this.calculateDaysUntilExpiry(
        contract.contractExpiryDate
      );

      await triggerContractExpiryNotification(
        userId,
        contract.contractName,
        contract.contractExpiryDate,
        daysUntilExpiry
      );

      console.log(
        `✅ Manual notification triggered for contract "${contract.contractName}"`
      );
    } catch (error) {
      console.error('Error triggering manual notification:', error);
      throw error;
    }
  }

  /**
   * Send contract expiry SMS notification using Appwrite messaging
   */
  async sendContractExpirySMS(
    userId: string,
    contractName: string,
    daysUntilExpiry: number,
    contractExpiryDate: string,
    userName?: string
  ): Promise<void> {
    try {
      const messaging = await getAppwriteMessagingService();

      if (!messaging.isConfigured()) {
        console.log('Appwrite messaging not configured, skipping SMS');
        return;
      }

      await messaging.sendContractExpiryNotification({
        userId,
        content: '', // Will be formatted by the service
        userName,
        contractName,
        daysUntilExpiry,
        contractExpiryDate,
      });

      console.log(`📱 Contract expiry SMS sent to user ${userId}`);
    } catch (error) {
      console.error('Failed to send contract expiry SMS:', error);
    }
  }
}

export const contractExpiryService = new ContractExpiryService();
