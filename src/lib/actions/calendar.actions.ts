import { createAdminClient } from '@/lib/appwrite';
import { ID, Query } from 'node-appwrite';
import { appwriteConfig } from '../appwrite/config';
import { createEventActivity } from './recentActivity.actions';
import {
  getValidIntegration,
  hasActiveCalendarIntegration,
} from './calendar-integration.actions';

export interface CalendarEvent {
  $id?: string;
  title: string;
  date: string;
  type: 'contract' | 'deadline' | 'meeting' | 'review' | 'audit';
  description?: string;
  contractName?: string;
  amount?: string;
  startTime?: string;
  endTime?: string;
  participants?: string;
  createdBy: string;
  $createdAt?: string;
  $updatedAt?: string;
}

export interface CreateCalendarEventData {
  title: string;
  date: string;
  type: 'contract' | 'deadline' | 'meeting' | 'review' | 'audit';
  description?: string;
  contractName?: string;
  amount?: string;
  startTime?: string;
  endTime?: string;
  participants?: string;
  createdBy: string;
}

// Get all calendar events
export const getCalendarEvents = async (): Promise<CalendarEvent[]> => {
  try {
    const adminClient = await createAdminClient();
    const response = await adminClient.tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId,
      [Query.orderDesc('$createdAt')]
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
    console.log('Server action called with year:', year, 'month:', month);
    console.log('Database ID:', appwriteConfig.databaseId);
    console.log('Collection ID:', appwriteConfig.calendarEventsCollectionId);

    const adminClient = await createAdminClient();
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString();

    console.log('Date range:', startDate, 'to', endDate);

    const response = await adminClient.tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId,
      [
        Query.greaterThanEqual('date', startDate),
        Query.lessThanEqual('date', endDate),
        Query.orderAsc('date'),
      ]
    );
    console.log('Database response:', response);
    return response.rows as unknown as CalendarEvent[];
  } catch (error) {
    console.error('Error fetching calendar events by month:', error);
    throw error;
  }
};

// Get calendar events for a specific date
export const getCalendarEventsByDate = async (
  date: string
): Promise<CalendarEvent[]> => {
  try {
    const adminClient = await createAdminClient();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const response = await adminClient.tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId,
      [
        Query.greaterThanEqual('date', startOfDay.toISOString()),
        Query.lessThanEqual('date', endOfDay.toISOString()),
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
    const adminClient = await createAdminClient();
    const response = await adminClient.tablesDB.createRow(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId,
      ID.unique(),
      eventData
    );

    // Create a recent activity for the new event
    await createEventActivity(
      'New Event Added',
      eventData.title,
      response.$id,
      eventData.createdBy,
      eventData.createdBy
    );

    return response as unknown as CalendarEvent;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
};

// Update a calendar event
export const updateCalendarEvent = async (
  eventId: string,
  eventData: Partial<CreateCalendarEventData>
): Promise<CalendarEvent> => {
  try {
    const adminClient = await createAdminClient();
    const response = await adminClient.tablesDB.updateRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.calendarEventsCollectionId,
      rowId: eventId,
      data: eventData,
    });
    return response as unknown as CalendarEvent;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
};

// Delete a calendar event
export const deleteCalendarEvent = async (eventId: string): Promise<void> => {
  try {
    const adminClient = await createAdminClient();
    await adminClient.tablesDB.deleteRow(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId,
      eventId
    );
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
};

// Get calendar events for a specific week
export const getCalendarEventsByWeek = async (
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> => {
  try {
    const adminClient = await createAdminClient();
    const response = await adminClient.tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId,
      [
        Query.greaterThanEqual('date', startDate),
        Query.lessThanEqual('date', endDate),
        Query.orderAsc('date'),
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

    // Call the sync API endpoint
    const response = await fetch('/api/microsoft/calendar/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000
        ).toISOString(), // 30 days ago
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
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
        const response = await fetch('/api/microsoft/calendar/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        });

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
        const response = await fetch('/api/microsoft/calendar/events', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId: outlookId,
            eventData: eventData,
          }),
        });

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
