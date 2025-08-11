import { notificationService } from '@/lib/services/notificationService';

// Notification trigger types based on the notification types in NotificationCenter
export const NOTIFICATION_TRIGGERS = {
  // File-related triggers
  'file-uploaded': {
    type: 'file-uploaded',
    priority: 'low' as const,
    defaultTitle: 'File Uploaded',
    defaultMessage: 'A new file has been uploaded to the system.',
  },
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
} as const;

export type NotificationTriggerType = keyof typeof NOTIFICATION_TRIGGERS;

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
    const trigger = NOTIFICATION_TRIGGERS[triggerType];
    const title = options.title || trigger.defaultTitle;
    const message = options.message || trigger.defaultMessage;
    const priority = options.priority || trigger.priority;

    await notificationService.triggerAutomaticNotification(
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
      actionUrl: '/files', // Link to files page
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
 * Demo function to test all notification triggers
 * This can be used for testing or demonstration purposes
 */
export async function triggerDemoNotifications(userId: string): Promise<void> {
  console.log('🎭 Starting notification trigger demo...');

  const demoPromises = [
    // File upload notification
    triggerFileUploadNotification(
      userId,
      'demo-contract.pdf',
      'document',
      2048576
    ),

    // Contract expiry notification (urgent)
    triggerContractExpiryNotification(
      userId,
      'Vendor Agreement',
      '2024-02-15',
      3
    ),

    // Contract renewal notification
    triggerContractRenewalNotification(
      userId,
      'Service Contract',
      '2025-01-15'
    ),

    // User invitation notification
    triggerUserInvitationNotification(
      userId,
      'john.doe@company.com',
      'Admin User'
    ),

    // Audit due notification (high priority)
    triggerAuditDueNotification(
      userId,
      'Q4 Compliance Audit',
      '2024-03-01',
      15
    ),

    // Compliance alert notification (urgent)
    triggerComplianceAlertNotification(
      userId,
      'Data Breach',
      'Suspicious activity detected in user accounts',
      'critical'
    ),

    // System update notification
    triggerSystemUpdateNotification(
      userId,
      'Security Patch',
      'Critical security update applied to system'
    ),

    // Performance metric notification
    triggerPerformanceMetricNotification(userId, 'Response Time', '2.3s', 'up'),

    // Deadline approaching notification
    triggerDeadlineApproachingNotification(
      userId,
      'Project Review',
      '2024-02-20',
      2
    ),

    // Task completed notification
    triggerTaskCompletedNotification(userId, 'Document Review', 'Jane Smith'),

    // Information notification
    triggerInfoNotification(
      userId,
      'System Maintenance',
      'Scheduled maintenance completed successfully'
    ),
  ];

  await Promise.allSettled(demoPromises);
  console.log('✅ Demo notifications completed!');
}
