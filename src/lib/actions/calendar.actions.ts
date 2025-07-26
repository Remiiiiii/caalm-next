import { createAdminClient } from '@/lib/appwrite';
import { ID, Query } from 'node-appwrite';
import { appwriteConfig } from '../appwrite/config';
import { createEventActivity } from './recentActivity.actions';

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
    const response = await adminClient.databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId,
      [Query.orderDesc('$createdAt')]
    );
    return response.documents as unknown as CalendarEvent[];
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

    const response = await adminClient.databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId,
      [
        Query.greaterThanEqual('date', startDate),
        Query.lessThanEqual('date', endDate),
        Query.orderAsc('date'),
      ]
    );
    console.log('Database response:', response);
    return response.documents as unknown as CalendarEvent[];
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

    const response = await adminClient.databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId,
      [
        Query.greaterThanEqual('date', startOfDay.toISOString()),
        Query.lessThanEqual('date', endOfDay.toISOString()),
        Query.orderAsc('startTime'),
      ]
    );
    return response.documents as unknown as CalendarEvent[];
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
    const response = await adminClient.databases.createDocument(
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
    const response = await adminClient.databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId,
      eventId,
      eventData
    );
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
    await adminClient.databases.deleteDocument(
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
    const response = await adminClient.databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.calendarEventsCollectionId,
      [
        Query.greaterThanEqual('date', startDate),
        Query.lessThanEqual('date', endDate),
        Query.orderAsc('date'),
      ]
    );
    return response.documents as unknown as CalendarEvent[];
  } catch (error) {
    console.error('Error fetching calendar events by week:', error);
    throw error;
  }
};
