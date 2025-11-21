import { createAdminClient } from '@/lib/appwrite';
import { ID, Query } from 'node-appwrite';
import { appwriteConfig } from '../appwrite/config';
import { notificationService } from './notificationService';

/**
 * Calendar Event Notifications Service
 * Priority 2: Advanced notifications with configurable reminders, escalation rules, and multi-channel delivery
 */

export interface CalendarEventReminder {
  $id: string;
  eventId: string;
  userId: string;
  reminderType: 'before_start' | 'before_end' | 'custom';
  reminderMinutes: number; // Minutes before event (e.g., 15, 30, 60, 1440 for 1 day)
  channels: NotificationChannel[];
  isSent: boolean;
  sentAt?: string;
  createdAt: string;
}

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';

export interface EscalationRule {
  $id: string;
  organizationId: string;
  name: string;
  triggerEvent: 'reminder_not_sent' | 'event_created' | 'event_updated' | 'event_cancelled';
  delayMinutes: number; // Delay before escalation
  escalationChannels: NotificationChannel[];
  escalateToUserIds: string[]; // User IDs to escalate to
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReminderData {
  eventId: string;
  userId: string;
  reminderType: 'before_start' | 'before_end' | 'custom';
  reminderMinutes: number;
  channels: NotificationChannel[];
}

export interface CreateEscalationRuleData {
  organizationId: string;
  name: string;
  triggerEvent: EscalationRule['triggerEvent'];
  delayMinutes: number;
  escalationChannels: NotificationChannel[];
  escalateToUserIds: string[];
}

const getRemindersCollectionId = (): string => {
  const collectionId =
    process.env.NEXT_PUBLIC_APPWRITE_CALENDAR_REMINDERS_COLLECTION ||
    'calendar_reminders';
  if (!collectionId) {
    throw new Error('Calendar reminders collection ID not configured');
  }
  return collectionId;
};

const getEscalationRulesCollectionId = (): string => {
  const collectionId =
    process.env.NEXT_PUBLIC_APPWRITE_ESCALATION_RULES_COLLECTION ||
    'escalation_rules';
  if (!collectionId) {
    throw new Error('Escalation rules collection ID not configured');
  }
  return collectionId;
};

/**
 * Create a reminder for a calendar event
 */
export const createEventReminder = async (
  data: CreateReminderData
): Promise<CalendarEventReminder> => {
  const { tablesDB } = await createAdminClient();
  const collectionId = getRemindersCollectionId();

  const reminderId = ID.unique();

  const response = await tablesDB.createRow({
    databaseId: appwriteConfig.databaseId!,
    tableId: collectionId,
    rowId: reminderId,
    data: {
      eventId: data.eventId,
      userId: data.userId,
      reminderType: data.reminderType,
      reminderMinutes: data.reminderMinutes,
      channels: JSON.stringify(data.channels),
      isSent: false,
      sentAt: null,
      createdAt: new Date().toISOString(),
    },
  });

  // Parse channels back from JSON
  const result = response as unknown as Record<string, unknown>;
  if (typeof result.channels === 'string') {
    try {
      result.channels = JSON.parse(result.channels);
    } catch (error) {
      console.error('[SERVER] createEventReminder] Error parsing channels:', error);
      result.channels = [];
    }
  }

  return result as unknown as CalendarEventReminder;
};

/**
 * Send reminder notification through configured channels
 * Uses the existing NotificationService to create notifications in the notifications collection
 */
export const sendReminderNotification = async (
  reminder: CalendarEventReminder,
  eventTitle: string,
  eventStartDate: string,
  eventStartTime: string,
  userEmail?: string,
  userPhone?: string
): Promise<void> => {
  const channels = reminder.channels as NotificationChannel[];

  const reminderTime = new Date(eventStartDate);
  if (eventStartTime) {
    const [hours, minutes] = eventStartTime.split(':').map(Number);
    reminderTime.setHours(hours, minutes, 0, 0);
  }
  reminderTime.setMinutes(reminderTime.getMinutes() - reminder.reminderMinutes);

  const timeString = reminderTime.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const message = `Reminder: "${eventTitle}" starts in ${reminder.reminderMinutes} minutes (${timeString})`;

  // Always create in-app notification using the existing NotificationService
  // This ensures it appears in the notifications collection
  try {
    await notificationService.createNotification({
      userId: reminder.userId,
      title: 'Event Reminder',
      message,
      type: 'event_reminder',
      priority: 'medium',
      actionUrl: `/calendar?eventId=${reminder.eventId}`,
      actionText: 'View Event',
      metadata: {
        eventId: reminder.eventId,
        reminderId: reminder.$id,
        eventTitle,
        eventStartDate,
        eventStartTime,
      },
    });
    console.log('[SERVER] sendReminderNotification] Created in-app notification');
  } catch (error) {
    console.error('[SERVER] sendReminderNotification] Error creating in-app notification:', error);
  }

  // Send through additional configured channels
  for (const channel of channels) {
    try {
      switch (channel) {
        case 'in_app':
          // Already handled above
          break;

        case 'email':
          if (userEmail) {
            // Use mailgun service for email
            const { sendEmail } = await import('./mailgun');
            await sendEmail({
              to: userEmail,
              subject: `[CAALM] Event Reminder: ${eventTitle}`,
              text: message,
            });
            console.log('[SERVER] sendReminderNotification] Sent email notification');
          }
          break;

        case 'sms':
          if (userPhone) {
            // Use notificationService to send SMS notification
            await notificationService.sendSMSNotification(reminder.userId, {
              title: 'Event Reminder',
              message,
              priority: 'medium',
              actionUrl: `/calendar?eventId=${reminder.eventId}`,
              type: 'event_reminder',
            });
            console.log('[SERVER] sendReminderNotification] Sent SMS notification');
          }
          break;

        case 'push':
          // Push notifications would be implemented here
          // This would typically use a push notification service
          console.log('[SERVER] sendReminderNotification] Push notification not yet implemented');
          break;
      }
    } catch (error) {
      console.error(`[SERVER] sendReminderNotification] Error sending ${channel} notification:`, error);
      // Continue with other channels even if one fails
    }
  }

  // Mark reminder as sent
  const { tablesDB } = await createAdminClient();
  const collectionId = getRemindersCollectionId();
  await tablesDB.updateRow({
    databaseId: appwriteConfig.databaseId!,
    tableId: collectionId,
    rowId: reminder.$id,
    data: {
      isSent: true,
      sentAt: new Date().toISOString(),
    },
  });
};

/**
 * Create an escalation rule
 */
export const createEscalationRule = async (
  data: CreateEscalationRuleData
): Promise<EscalationRule> => {
  const { tablesDB } = await createAdminClient();
  const collectionId = getEscalationRulesCollectionId();

  const ruleId = ID.unique();

  const response = await tablesDB.createRow({
    databaseId: appwriteConfig.databaseId!,
    tableId: collectionId,
    rowId: ruleId,
    data: {
      organizationId: data.organizationId,
      name: data.name,
      triggerEvent: data.triggerEvent,
      delayMinutes: data.delayMinutes,
      escalationChannels: JSON.stringify(data.escalationChannels),
      escalateToUserIds: JSON.stringify(data.escalateToUserIds),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });

  // Parse arrays back from JSON
  const result = response as unknown as Record<string, unknown>;
  if (typeof result.escalationChannels === 'string') {
    try {
      result.escalationChannels = JSON.parse(result.escalationChannels);
    } catch (error) {
      console.error('[SERVER] createEscalationRule] Error parsing escalationChannels:', error);
      result.escalationChannels = [];
    }
  }
  if (typeof result.escalateToUserIds === 'string') {
    try {
      result.escalateToUserIds = JSON.parse(result.escalateToUserIds);
    } catch (error) {
      console.error('[SERVER] createEscalationRule] Error parsing escalateToUserIds:', error);
      result.escalateToUserIds = [];
    }
  }

  return result as unknown as EscalationRule;
};

/**
 * Get active escalation rules for an organization
 */
export const getActiveEscalationRules = async (
  organizationId: string,
  triggerEvent?: EscalationRule['triggerEvent']
): Promise<EscalationRule[]> => {
  const { tablesDB } = await createAdminClient();
  const collectionId = getEscalationRulesCollectionId();

  const queries = [
    Query.equal('organizationId', organizationId),
    Query.equal('isActive', true),
  ];

  if (triggerEvent) {
    queries.push(Query.equal('triggerEvent', triggerEvent));
  }

  const response = await tablesDB.listRows({
    databaseId: appwriteConfig.databaseId!,
    tableId: collectionId,
    queries,
  });

  // Parse arrays from JSON
  const rules = response.rows.map((row) => {
    const rule = row as unknown as Record<string, unknown>;
    if (typeof rule.escalationChannels === 'string') {
      try {
        rule.escalationChannels = JSON.parse(rule.escalationChannels);
      } catch (error) {
        console.error('[SERVER] getActiveEscalationRules] Error parsing escalationChannels:', error);
        rule.escalationChannels = [];
      }
    }
    if (typeof rule.escalateToUserIds === 'string') {
      try {
        rule.escalateToUserIds = JSON.parse(rule.escalateToUserIds);
      } catch (error) {
        console.error('[SERVER] getActiveEscalationRules] Error parsing escalateToUserIds:', error);
        rule.escalateToUserIds = [];
      }
    }
    return rule;
  });

  return rules as unknown as EscalationRule[];
};

