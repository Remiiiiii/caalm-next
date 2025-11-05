import { createAdminClient } from '@/lib/appwrite';
import { ID, Query } from 'node-appwrite';
import { appwriteConfig } from '../appwrite/config';
import { createEventActivity } from './recentActivity.actions';
import {
  getValidIntegration,
  hasActiveCalendarIntegration,
} from './calendar-integration.actions';

// Event attachments are stored as file ID references (same pattern as contracts use fileId)
// Full file details are fetched from files collection when needed
export interface CalendarEventAttachment {
  $id: string; // File ID from files collection (reference)
  name?: string; // Cached for display, can be fetched from files collection
  url?: string; // Cached for display, can be fetched from files collection
  type?: string;
  extension?: string;
  size?: number;
  bucketFileId?: string;
}

export interface CalendarEvent {
  $id?: string;
  title: string;
  startDate: string;
  endDate?: string;
  type: 'contract' | 'deadline' | 'meeting' | 'review' | 'audit';
  description?: string;
  contractName?: string;
  amount?: string;
  startTime?: string;
  endTime?: string;
  participants?: string;
  location?: string;
  createdBy: string;
  outlook_id?: string;
  attachments?: string[]; // Array of file IDs (references to files collection, same pattern as contracts use fileId)
  deleted_at?: string;
  deleted_by?: string;
  deletion_status?:
    | 'pending_outlook_deletion'
    | 'deleted_from_outlook'
    | 'deletion_failed';
  deletion_synced?: boolean;
  $createdAt?: string;
  $updatedAt?: string;
}

export interface CreateCalendarEventData {
  title: string;
  startDate: string;
  endDate?: string;
  type: 'contract' | 'deadline' | 'meeting' | 'review' | 'audit';
  description?: string;
  contractName?: string;
  amount?: string;
  startTime?: string;
  endTime?: string;
  participants?: string;
  location?: string;
  createdBy: string;
  outlook_id?: string;
  attachments?: string[]; // Array of file IDs (references to files collection, same pattern as contracts use fileId)
}

// Get all calendar events
export const getCalendarEvents = async (): Promise<CalendarEvent[]> => {
  try {
    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.calendarEventsCollectionId
    ) {
      throw new Error('Missing required Appwrite configuration');
    }

    const adminClient = await createAdminClient();
    const response = await adminClient.tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId,
      [
        Query.isNull('deleted_at'), // Exclude soft-deleted events
        Query.orderDesc('$createdAt'),
      ]
    );
    return response.rows as unknown as CalendarEvent[];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
};

// Get calendar events for a specific month
export const getCalendarEventsByMonth = async (
  year: number,
  month: number
): Promise<CalendarEvent[]> => {
  try {
    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.calendarEventsCollectionId
    ) {
      throw new Error('Missing required Appwrite configuration');
    }

    console.log('Server action called with year:', year, 'month:', month);
    console.log('Database ID:', appwriteConfig.databaseId);
    console.log('Collection ID:', appwriteConfig.calendarEventsCollectionId);

    const adminClient = await createAdminClient();

    // Format dates as YYYY-MM-DD strings to avoid timezone conversion issues
    // when querying date strings stored in the same format
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endYear = month === 12 ? year + 1 : year;
    const endMonth = month === 12 ? 1 : month + 1;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(
      lastDay
    ).padStart(2, '0')}`;

    console.log('Date range:', startDate, 'to', endDate);

    const response = await adminClient.tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId,
      [
        Query.isNull('deleted_at'), // Exclude soft-deleted events
        Query.greaterThanEqual('startDate', startDate),
        Query.lessThanEqual('startDate', endDate),
        Query.orderAsc('startDate'),
      ]
    );
    console.log('Database response:', response);
    return response.rows as unknown as CalendarEvent[];
  } catch (error) {
    console.error('Error fetching calendar events by month:', error);
    throw error;
  }
};

// Get calendar events with Microsoft Outlook sync
export const getCalendarEventsWithSync = async (
  year: number,
  month: number,
  userId: string
): Promise<CalendarEvent[]> => {
  try {
    // First, get local CAALM events
    const localEvents = await getCalendarEventsByMonth(year, month);

    // Check if user has Microsoft integration
    const hasIntegration = await hasMicrosoftCalendarIntegration(userId);

    if (hasIntegration) {
      try {
        // Trigger sync to fetch Outlook events
        const syncResult = await syncMicrosoftCalendar(userId);
        console.log('Microsoft sync result:', syncResult);

        // After sync, get updated events (including synced Outlook events)
        const syncedEvents = await getCalendarEventsByMonth(year, month);
        return syncedEvents;
      } catch (syncError) {
        console.error('Error syncing Microsoft calendar:', syncError);
        // Return local events even if sync fails
        return localEvents;
      }
    }

    return localEvents;
  } catch (error) {
    console.error('Error fetching calendar events with sync:', error);
    return [];
  }
};

// Get calendar events for a specific date
export const getCalendarEventsByDate = async (
  date: string
): Promise<CalendarEvent[]> => {
  try {
    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.calendarEventsCollectionId
    ) {
      throw new Error('Missing required Appwrite configuration');
    }

    const adminClient = await createAdminClient();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const response = await adminClient.tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId,
      [
        Query.isNull('deleted_at'), // Exclude soft-deleted events
        Query.greaterThanEqual('startDate', startOfDay.toISOString()),
        Query.lessThanEqual('startDate', endOfDay.toISOString()),
        Query.orderAsc('startTime'),
      ]
    );
    return response.rows as unknown as CalendarEvent[];
  } catch (error) {
    console.error('Error fetching calendar events by date:', error);
    throw error;
  }
};

// Create a new calendar event
export const createCalendarEvent = async (
  eventData: CreateCalendarEventData
): Promise<CalendarEvent> => {
  try {
    console.log('createCalendarEvent called with data:', eventData);
    console.log('Database ID:', appwriteConfig.databaseId);
    console.log(
      'Calendar Events Collection ID:',
      appwriteConfig.calendarEventsCollectionId
    );

    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.calendarEventsCollectionId
    ) {
      throw new Error('Missing required Appwrite configuration');
    }

    const adminClient = await createAdminClient();
    console.log('Admin client created successfully');

    // Filter out attachments if empty to avoid sending empty arrays
    const dataToCreate = { ...eventData };
    if (!dataToCreate.attachments || dataToCreate.attachments.length === 0) {
      delete dataToCreate.attachments;
    }

    const response = await adminClient.tablesDB.createRow(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId,
      ID.unique(),
      dataToCreate
    );

    console.log('Event created successfully:', response);

    // Create a recent activity for the new event
    try {
      await createEventActivity(
        'New Calendar Event Added',
        eventData.title,
        response.$id,
        eventData.createdBy,
        eventData.createdBy
      );
      console.log('Recent activity created successfully');
    } catch (activityError) {
      console.warn('Failed to create recent activity:', activityError);
      // Don't throw here as the main event was created successfully
    }

    return response as unknown as CalendarEvent;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      eventData,
      databaseId: appwriteConfig.databaseId,
      calendarEventsCollectionId: appwriteConfig.calendarEventsCollectionId,
    });
    throw error;
  }
};

// Update a calendar event
export const updateCalendarEvent = async (
  eventId: string,
  eventData: Partial<CreateCalendarEventData>
): Promise<CalendarEvent> => {
  try {
    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.calendarEventsCollectionId
    ) {
      throw new Error('Missing required Appwrite configuration');
    }

    const adminClient = await createAdminClient();

    // Filter out attachments if empty or undefined to avoid schema errors
    const dataToUpdate = { ...eventData };
    if (dataToUpdate.attachments && dataToUpdate.attachments.length === 0) {
      delete dataToUpdate.attachments;
    }

    const response = await adminClient.tablesDB.updateRow(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId,
      eventId,
      dataToUpdate
    );
    return response as unknown as CalendarEvent;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
};

// Delete a calendar event (soft delete)
export const deleteCalendarEvent = async (
  eventId: string,
  deletedBy?: string
): Promise<void> => {
  try {
    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.calendarEventsCollectionId
    ) {
      throw new Error('Missing required Appwrite configuration');
    }

    const adminClient = await createAdminClient();

    // Perform soft delete by setting deleted_at timestamp
    await adminClient.tablesDB.updateRow(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId,
      eventId,
      {
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy || null,
        deletion_status: 'pending_outlook_deletion',
        deletion_synced: false,
      }
    );
  } catch (error) {
    console.error('Error soft deleting calendar event:', error);
    throw error;
  }
};

// Hard delete a calendar event (permanent deletion)
export const hardDeleteCalendarEvent = async (
  eventId: string
): Promise<void> => {
  try {
    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.calendarEventsCollectionId
    ) {
      throw new Error('Missing required Appwrite configuration');
    }

    const adminClient = await createAdminClient();
    await adminClient.tablesDB.deleteRow(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId,
      eventId
    );
  } catch (error) {
    console.error('Error hard deleting calendar event:', error);
    throw error;
  }
};

// Restore a soft-deleted calendar event
export const restoreCalendarEvent = async (eventId: string): Promise<void> => {
  try {
    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.calendarEventsCollectionId
    ) {
      throw new Error('Missing required Appwrite configuration');
    }

    const adminClient = await createAdminClient();

    // Remove soft delete markers
    await adminClient.tablesDB.updateRow(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId,
      eventId,
      {
        deleted_at: null,
        deleted_by: null,
        deletion_status: null,
        deletion_synced: false,
      }
    );
  } catch (error) {
    console.error('Error restoring calendar event:', error);
    throw error;
  }
};

// Get calendar events for a specific week
export const getCalendarEventsByWeek = async (
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> => {
  try {
    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.calendarEventsCollectionId
    ) {
      throw new Error('Missing required Appwrite configuration');
    }

    const adminClient = await createAdminClient();
    const response = await adminClient.tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId,
      [
        Query.isNull('deleted_at'), // Exclude soft-deleted events
        Query.greaterThanEqual('startDate', startDate),
        Query.lessThanEqual('startDate', endDate),
        Query.orderAsc('startDate'),
      ]
    );
    return response.rows as unknown as CalendarEvent[];
  } catch (error) {
    console.error('Error fetching calendar events by week:', error);
    throw error;
  }
};

// Microsoft Calendar Integration Functions

/**
 * Check if user has Microsoft calendar integration
 */
export const hasMicrosoftCalendarIntegration = async (
  userId: string
): Promise<boolean> => {
  try {
    return await hasActiveCalendarIntegration(userId, 'microsoft');
  } catch (error) {
    console.error('Error checking Microsoft calendar integration:', error);
    return false;
  }
};

/**
 * Get Microsoft calendar integration status
 */
export const getMicrosoftCalendarIntegration = async (userId: string) => {
  try {
    return await getValidIntegration(userId, 'microsoft');
  } catch (error) {
    console.error('Error getting Microsoft calendar integration:', error);
    return null;
  }
};

/**
 * Trigger Microsoft calendar sync
 */
export const syncMicrosoftCalendar = async (
  userId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const integration = await getValidIntegration(userId, 'microsoft');

    if (!integration) {
      return {
        success: false,
        message: 'Microsoft calendar integration not found or expired',
      };
    }

    // Call the sync API endpoint with absolute URL and user ID
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/microsoft/calendar/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': userId, // Pass user ID in header
      },
      body: JSON.stringify({
        userId, // Also pass in body for redundancy
        startDate: new Date(
          Date.now() - 90 * 24 * 60 * 60 * 1000
        ).toISOString(), // 90 days ago
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        strategy: 'newest',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.error || 'Sync failed',
      };
    }

    return {
      success: true,
      message: result.message || 'Sync completed successfully',
    };
  } catch (error) {
    console.error('Error syncing Microsoft calendar:', error);
    return {
      success: false,
      message: 'Failed to sync calendar',
    };
  }
};

/**
 * Create event and sync to Microsoft if integration exists
 */
export const createCalendarEventWithSync = async (
  eventData: CreateCalendarEventData
): Promise<CalendarEvent> => {
  try {
    // Create the event in CAALM
    const event = await createCalendarEvent(eventData);

    // Check if user has Microsoft integration
    const hasIntegration = await hasActiveCalendarIntegration(
      eventData.createdBy,
      'microsoft'
    );

    if (hasIntegration) {
      try {
        // Sync the new event to Microsoft
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const response = await fetch(
          `${baseUrl}/api/microsoft/calendar/events`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData),
          }
        );

        if (response.ok) {
          const result = await response.json();
          // Update the CAALM event with the Microsoft event ID
          await updateCalendarEvent(event.$id!, {
            ...event,
            outlook_id: result.event.id,
          } as any);
        }
      } catch (syncError) {
        console.error('Failed to sync new event to Microsoft:', syncError);
        // Don't fail the entire operation if sync fails
      }
    }

    return event;
  } catch (error) {
    console.error('Error creating calendar event with sync:', error);
    throw error;
  }
};

/**
 * Update event and sync to Microsoft if integration exists
 */
export const updateCalendarEventWithSync = async (
  eventId: string,
  eventData: Partial<CreateCalendarEventData>
): Promise<CalendarEvent> => {
  try {
    // Update the event in CAALM
    const event = await updateCalendarEvent(eventId, eventData);

    // Check if this event has a Microsoft ID and user has integration
    const hasIntegration = await hasActiveCalendarIntegration(
      event.createdBy,
      'microsoft'
    );
    const outlookId = (event as any).outlook_id;

    if (hasIntegration && outlookId) {
      try {
        // Sync the updated event to Microsoft
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const response = await fetch(
          `${baseUrl}/api/microsoft/calendar/events`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              eventId: outlookId,
              eventData: eventData,
            }),
          }
        );

        if (!response.ok) {
          console.error('Failed to sync updated event to Microsoft');
        }
      } catch (syncError) {
        console.error('Failed to sync updated event to Microsoft:', syncError);
        // Don't fail the entire operation if sync fails
      }
    }

    return event;
  } catch (error) {
    console.error('Error updating calendar event with sync:', error);
    throw error;
  }
};

/**
 * Delete event and sync to Microsoft if integration exists
 */
export const deleteCalendarEventWithSync = async (
  eventId: string
): Promise<void> => {
  try {
    // Get the event first to check for Microsoft ID
    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.calendarEventsCollectionId
    ) {
      throw new Error('Missing required Appwrite configuration');
    }

    const adminClient = await createAdminClient();
    const event = (await adminClient.tablesDB.getRow(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId,
      eventId
    )) as unknown as CalendarEvent;

    // Check if this event has a Microsoft ID and user has integration
    const hasIntegration = await hasActiveCalendarIntegration(
      event.createdBy,
      'microsoft'
    );
    const outlookId = (event as any).outlook_id;

    if (hasIntegration && outlookId) {
      try {
        // Delete the event from Microsoft
        const response = await fetch(
          `/api/microsoft/calendar/events?eventId=${outlookId}`,
          {
            method: 'DELETE',
          }
        );

        if (!response.ok) {
          console.error('Failed to delete event from Microsoft');
        }
      } catch (syncError) {
        console.error('Failed to delete event from Microsoft:', syncError);
        // Don't fail the entire operation if sync fails
      }
    }

    // Delete the event from CAALM
    await deleteCalendarEvent(eventId);
  } catch (error) {
    console.error('Error deleting calendar event with sync:', error);
    throw error;
  }
};
