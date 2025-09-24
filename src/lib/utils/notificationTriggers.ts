// Lazy import to avoid initialization errors when Twilio is not configured
let notificationService: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

interface NotificationType {
  type_key: string;
  label: string;
  description?: string;
  icon?: string;
  color_classes?: string;
  bg_color_classes?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  enabled: boolean;
}

interface NotificationTrigger {
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  defaultTitle: string;
  defaultMessage: string;
  icon?: string;
  colorClasses?: string;
  bgColorClasses?: string;
}

async function getNotificationService() {
  if (!notificationService) {
    const { notificationService: service } = await import(
      '@/lib/services/notificationService'
    );
    notificationService = service;
  }
  return notificationService;
}

// Dynamic notification trigger types that pull from database
export async function getNotificationTriggers(): Promise<
  Record<string, NotificationTrigger>
> {
  try {
    const service = await getNotificationService();
    const notificationTypes =
      (await service.getNotificationTypes()) as NotificationType[];

    const triggers: Record<string, NotificationTrigger> = {};

    notificationTypes.forEach((type: NotificationType) => {
      if (type.enabled) {
        triggers[type.type_key] = {
          type: type.type_key,
          priority: type.priority,
          defaultTitle: type.label,
          defaultMessage:
            type.description || `Notification for ${type.label.toLowerCase()}`,
          icon: type.icon,
          colorClasses: type.color_classes,
          bgColorClasses: type.bg_color_classes,
        };
      }
    });

    return triggers;
  } catch (error) {
    console.error('Failed to load notification triggers from database:', error);
    // Fallback to basic triggers if database fails
    return getFallbackTriggers();
  }
}

// Fallback triggers in case database is unavailable
function getFallbackTriggers(): Record<string, NotificationTrigger> {
  return {
    'contract-expiry': {
      type: 'contract-expiry',
      priority: 'high' as const,
      defaultTitle: 'Contract Expiry Warning',
      defaultMessage: 'A contract is approaching its expiry date.',
    },
    'contract-renewal': {
      type: 'contract-renewal',
      priority: 'medium' as const,
      defaultTitle: 'Contract Renewal',
      defaultMessage: 'A contract has been renewed.',
    },
    'audit-due': {
      type: 'audit-due',
      priority: 'high' as const,
      defaultTitle: 'Audit Due',
      defaultMessage: 'An audit is due soon.',
    },
    'compliance-alert': {
      type: 'compliance-alert',
      priority: 'urgent' as const,
      defaultTitle: 'Compliance Alert',
      defaultMessage: 'A compliance issue has been detected.',
    },
    'file-uploaded': {
      type: 'file-uploaded',
      priority: 'low' as const,
      defaultTitle: 'File Uploaded',
      defaultMessage: 'A new file has been uploaded to the system.',
    },
    'user-invited': {
      type: 'user-invited',
      priority: 'medium' as const,
      defaultTitle: 'User Invited',
      defaultMessage: 'A new user has been invited to the system.',
    },
    'system-update': {
      type: 'system-update',
      priority: 'low' as const,
      defaultTitle: 'System Update',
      defaultMessage: 'A system update has been applied.',
    },
    'performance-metric': {
      type: 'performance-metric',
      priority: 'medium' as const,
      defaultTitle: 'Performance Metric',
      defaultMessage: 'A new performance metric is available.',
    },
    'deadline-approaching': {
      type: 'deadline-approaching',
      priority: 'high' as const,
      defaultTitle: 'Deadline Approaching',
      defaultMessage: 'A deadline is approaching.',
    },
    'task-completed': {
      type: 'task-completed',
      priority: 'low' as const,
      defaultTitle: 'Task Completed',
      defaultMessage: 'A task has been completed.',
    },
    info: {
      type: 'info',
      priority: 'low' as const,
      defaultTitle: 'Information',
      defaultMessage: 'General information notification.',
    },
  };
}

export type NotificationTriggerType = string;

interface NotificationTriggerOptions {
  userId: string;
  title?: string;
  message?: string;
  metadata?: Record<string, unknown>;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
}

/**
 * Trigger a notification for a specific action
 */
export async function triggerNotification(
  triggerType: NotificationTriggerType,
  options: NotificationTriggerOptions
): Promise<void> {
  try {
    const service = await getNotificationService();
    const triggers = await getNotificationTriggers();
    const trigger = triggers[triggerType];

    if (!trigger) {
      console.warn(`Unknown notification trigger type: ${triggerType}`);
      return;
    }

    const title = options.title || trigger.defaultTitle;
    const message = options.message || trigger.defaultMessage;
    const priority = options.priority || trigger.priority;

    await service.triggerAutomaticNotification(
      triggerType,
      options.userId,
      title,
      message,
      {
        ...options.metadata,
        priority,
        triggerType,
        timestamp: new Date().toISOString(),
      }
    );

    console.log(
      `✅ Notification triggered: ${triggerType} for user ${options.userId}`
    );
  } catch (error) {
    console.error(`❌ Failed to trigger notification ${triggerType}:`, error);
    // Don't throw error to prevent breaking the main action
  }
}

/**
 * File Upload Notification Trigger
 */
export async function triggerFileUploadNotification(
  userId: string,
  fileName: string,
  fileType: string,
  fileSize: number
): Promise<void> {
  await triggerNotification('file-uploaded', {
    userId,
    title: 'File Uploaded Successfully',
    message: `File "${fileName}" (${fileType}, ${formatFileSize(
      fileSize
    )}) has been uploaded to the system.`,
    metadata: {
      fileName,
      fileType,
      fileSize,
      actionUrl: '/files',
      actionText: 'View Files',
    },
  });
}

/**
 * Contract Expiry Notification Trigger
 */
export async function triggerContractExpiryNotification(
  userId: string,
  contractName: string,
  expiryDate: string,
  daysUntilExpiry: number
): Promise<void> {
  const priority =
    daysUntilExpiry <= 7 ? 'urgent' : daysUntilExpiry <= 30 ? 'high' : 'medium';

  await triggerNotification('contract-expiry', {
    userId,
    title: `Contract Expiry: ${contractName}`,
    message: `Contract "${contractName}" expires on ${formatDate(
      expiryDate
    )} (${daysUntilExpiry} days remaining).`,
    priority,
    metadata: {
      contractName,
      expiryDate,
      daysUntilExpiry,
      actionUrl: '/contracts',
      actionText: 'View Contracts',
    },
  });
}

/**
 * Contract Renewal Notification Trigger
 */
export async function triggerContractRenewalNotification(
  userId: string,
  contractName: string,
  newExpiryDate: string
): Promise<void> {
  await triggerNotification('contract-renewal', {
    userId,
    title: 'Contract Renewed',
    message: `Contract "${contractName}" has been renewed until ${formatDate(
      newExpiryDate
    )}.`,
    metadata: {
      contractName,
      newExpiryDate,
      actionUrl: '/contracts',
      actionText: 'View Contracts',
    },
  });
}

/**
 * User Invitation Notification Trigger
 */
export async function triggerUserInvitationNotification(
  userId: string,
  invitedEmail: string,
  invitedBy: string
): Promise<void> {
  await triggerNotification('user-invited', {
    userId,
    title: 'New User Invited',
    message: `User ${invitedEmail} has been invited to the system by ${invitedBy}.`,
    metadata: {
      invitedEmail,
      invitedBy,
      actionUrl: '/users',
      actionText: 'View Users',
    },
  });
}

/**
 * New User Request Notification Trigger
 * Notifies executives when a new user signs up and requests access
 */
export async function triggerNewUserRequestNotification(
  userEmail: string,
  userFullName: string
): Promise<void> {
  // Get all executives to notify them
  const { createAdminClient } = await import('../appwrite');
  const { Query } = await import('node-appwrite');
  const { appwriteConfig } = await import('../appwrite/config');

  try {
    const { tablesDB } = await createAdminClient();

    // Get all executives and admins
    const executives = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.usersCollectionId,
      queries: [
        Query.or([
          Query.equal('role', 'executive'),
          Query.equal('role', 'admin'),
        ]),
      ],
    });

    // Send notification to each executive
    for (const executive of executives.rows) {
      await triggerNotification('new-user-request', {
        userId: executive.accountId,
        title: 'New User Request',
        message: `${userFullName} (${userEmail}) has requested access to CAALM Solutions.`,
        metadata: {
          userEmail,
          userFullName,
          actionUrl: '/dashboard',
          actionText: 'Review Request',
        },
      });
    }

    console.log(
      `Notified ${executives.rows.length} executives about new user request from ${userEmail}`
    );

    // Also send SMS notifications to executives who have SMS enabled
    await sendSMSNotificationsToExecutives(
      userEmail,
      userFullName,
      executives.rows
    );
  } catch (error) {
    console.error('Failed to trigger new user request notification:', error);
    // Don't throw error to avoid breaking the signup process
  }
}

/**
 * Send SMS notifications to executives about new user requests
 */
async function sendSMSNotificationsToExecutives(
  userEmail: string,
  userFullName: string,
  executives: any[]
): Promise<void> {
  try {
    const { createAdminClient } = await import('../appwrite');
    const { appwriteConfig } = await import('../appwrite/config');

    const { tablesDB } = await createAdminClient();

    // Get SMS targets for executives
    for (const executive of executives) {
      try {
        // Check if executive has SMS targets
        const client = new (await import('node-appwrite')).Client()
          .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
          .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
          .setKey(process.env.NEXT_APPWRITE_API_KEY!);

        const users = new (await import('node-appwrite')).Users(client);
        const targets = await users.listTargets({
          userId: executive.accountId,
        });

        // Find SMS targets
        const smsTargets = targets.targets.filter(
          (target: any) => target.providerType === 'sms'
        );

        if (smsTargets.length > 0) {
          // Send SMS to each phone number
          for (const smsTarget of smsTargets) {
            try {
              const { getAppwriteMessagingService } = await import(
                '../services/appwriteMessagingService'
              );
              const messaging = await getAppwriteMessagingService();

              if (messaging.isConfigured()) {
                const smsMessage = `CAALM Alert: New user request from ${userFullName} (${userEmail}). Please review in the dashboard.`;

                await messaging.sendSmsNotification(
                  executive.accountId,
                  smsMessage
                );

                console.log(
                  `SMS sent to executive ${executive.fullName} at ${smsTarget.identifier}`
                );
              }
            } catch (smsError) {
              console.error(
                `Failed to send SMS to executive ${executive.fullName}:`,
                smsError
              );
            }
          }
        }
      } catch (targetError) {
        console.error(
          `Failed to get SMS targets for executive ${executive.fullName}:`,
          targetError
        );
      }
    }
  } catch (error) {
    console.error('Failed to send SMS notifications to executives:', error);
    // Don't throw error to avoid breaking the main flow
  }
}

/**
 * Audit Due Notification Trigger
 */
export async function triggerAuditDueNotification(
  userId: string,
  auditName: string,
  dueDate: string,
  daysUntilDue: number
): Promise<void> {
  const priority =
    daysUntilDue <= 7 ? 'urgent' : daysUntilDue <= 30 ? 'high' : 'medium';

  await triggerNotification('audit-due', {
    userId,
    title: `Audit Due: ${auditName}`,
    message: `Audit "${auditName}" is due on ${formatDate(
      dueDate
    )} (${daysUntilDue} days remaining).`,
    priority,
    metadata: {
      auditName,
      dueDate,
      daysUntilDue,
      actionUrl: '/audits',
      actionText: 'View Audits',
    },
  });
}

/**
 * Compliance Alert Notification Trigger
 */
export async function triggerComplianceAlertNotification(
  userId: string,
  alertType: string,
  description: string,
  severity: 'critical' | 'high' | 'medium' | 'low'
): Promise<void> {
  const priority =
    severity === 'critical'
      ? 'urgent'
      : severity === 'high'
      ? 'high'
      : 'medium';

  await triggerNotification('compliance-alert', {
    userId,
    title: `Compliance Alert: ${alertType}`,
    message: description,
    priority,
    metadata: {
      alertType,
      severity,
      actionUrl: '/compliance',
      actionText: 'View Compliance',
    },
  });
}

/**
 * System Update Notification Trigger
 */
export async function triggerSystemUpdateNotification(
  userId: string,
  updateType: string,
  description: string
): Promise<void> {
  await triggerNotification('system-update', {
    userId,
    title: `System Update: ${updateType}`,
    message: description,
    metadata: {
      updateType,
      actionUrl: '/settings',
      actionText: 'View Settings',
    },
  });
}

/**
 * Performance Metric Notification Trigger
 */
export async function triggerPerformanceMetricNotification(
  userId: string,
  metricName: string,
  value: string,
  trend: 'up' | 'down' | 'stable'
): Promise<void> {
  const trendIcon = trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️';

  await triggerNotification('performance-metric', {
    userId,
    title: `Performance Metric: ${metricName}`,
    message: `${trendIcon} ${metricName}: ${value}`,
    metadata: {
      metricName,
      value,
      trend,
      actionUrl: '/analytics',
      actionText: 'View Analytics',
    },
  });
}

/**
 * Deadline Approaching Notification Trigger
 */
export async function triggerDeadlineApproachingNotification(
  userId: string,
  taskName: string,
  deadline: string,
  daysUntilDeadline: number
): Promise<void> {
  const priority =
    daysUntilDeadline <= 1
      ? 'urgent'
      : daysUntilDeadline <= 3
      ? 'high'
      : 'medium';

  await triggerNotification('deadline-approaching', {
    userId,
    title: `Deadline Approaching: ${taskName}`,
    message: `Task "${taskName}" is due on ${formatDate(
      deadline
    )} (${daysUntilDeadline} days remaining).`,
    priority,
    metadata: {
      taskName,
      deadline,
      daysUntilDeadline,
      actionUrl: '/tasks',
      actionText: 'View Tasks',
    },
  });
}

/**
 * Task Completed Notification Trigger
 */
export async function triggerTaskCompletedNotification(
  userId: string,
  taskName: string,
  completedBy: string
): Promise<void> {
  await triggerNotification('task-completed', {
    userId,
    title: 'Task Completed',
    message: `Task "${taskName}" has been completed by ${completedBy}.`,
    metadata: {
      taskName,
      completedBy,
      actionUrl: '/tasks',
      actionText: 'View Tasks',
    },
  });
}

/**
 * Information Notification Trigger
 */
export async function triggerInfoNotification(
  userId: string,
  title: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await triggerNotification('info', {
    userId,
    title,
    message,
    metadata,
  });
}

// Utility functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Bulk notification triggers for system-wide events
export async function triggerBulkNotifications(
  triggerType: NotificationTriggerType,
  userIds: string[],
  options: Omit<NotificationTriggerOptions, 'userId'>
): Promise<void> {
  const promises = userIds.map((userId) =>
    triggerNotification(triggerType, { ...options, userId })
  );

  await Promise.allSettled(promises);
}

/**
 * Dynamic demo function that uses actual database data
 */
export async function triggerDemoNotifications(userId: string): Promise<void> {
  console.log('🎭 Starting dynamic notification trigger demo...');

  try {
    const triggers = await getNotificationTriggers();
    const enabledTriggers = Object.keys(triggers).filter(
      (key) => triggers[key]
    );

    console.log(
      `Found ${enabledTriggers.length} enabled notification types in database`
    );

    const demoPromises = enabledTriggers.slice(0, 5).map((triggerType) => {
      const trigger = triggers[triggerType];

      switch (triggerType) {
        case 'file-uploaded':
          return triggerFileUploadNotification(
            userId,
            'demo-contract.pdf',
            'document',
            2048576
          );

        case 'contract-expiry':
          return triggerContractExpiryNotification(
            userId,
            'Vendor Agreement',
            '2025-02-15',
            3
          );

        case 'contract-renewal':
          return triggerContractRenewalNotification(
            userId,
            'Service Contract',
            '2025-01-15'
          );

        case 'user-invited':
          return triggerUserInvitationNotification(
            userId,
            'john.doe@company.com',
            'Admin User'
          );

        case 'audit-due':
          return triggerAuditDueNotification(
            userId,
            'Q4 Compliance Audit',
            '2025-03-01',
            15
          );

        case 'compliance-alert':
          return triggerComplianceAlertNotification(
            userId,
            'Data Breach',
            'Suspicious activity detected in user accounts',
            'critical'
          );

        case 'system-update':
          return triggerSystemUpdateNotification(
            userId,
            'Security Patch',
            'Critical security update applied to system'
          );

        case 'performance-metric':
          return triggerPerformanceMetricNotification(
            userId,
            'Response Time',
            '2.3s',
            'up'
          );

        case 'deadline-approaching':
          return triggerDeadlineApproachingNotification(
            userId,
            'Project Review',
            '2025-02-20',
            2
          );

        case 'task-completed':
          return triggerTaskCompletedNotification(
            userId,
            'Document Review',
            'Jane Smith'
          );

        case 'info':
          return triggerInfoNotification(
            userId,
            'System Maintenance',
            'Scheduled maintenance completed successfully'
          );

        default:
          // For any other trigger types, create a generic notification
          return triggerNotification(triggerType, {
            userId,
            title: trigger.defaultTitle,
            message: trigger.defaultMessage,
            priority: trigger.priority,
            metadata: {
              demo: true,
              triggerType,
              timestamp: new Date().toISOString(),
            },
          });
      }
    });

    await Promise.allSettled(demoPromises);
    console.log('✅ Dynamic demo notifications completed!');
  } catch (error) {
    console.error('❌ Failed to run dynamic demo notifications:', error);
  }
}
