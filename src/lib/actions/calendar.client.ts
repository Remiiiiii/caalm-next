'use client';

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

// Client-side API calls for calendar events
const API_BASE = '/api/calendar';

// Get calendar events for a specific month
export const getCalendarEventsByMonth = async (
  year: number,
  month: number
): Promise<CalendarEvent[]> => {
  try {
    const url = `${API_BASE}/events?year=${year}&month=${month}`;
    console.log('Fetching from URL:', url);
    const response = await fetch(url);
    console.log('Response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response error:', errorText);
      throw new Error(
        `Failed to fetch calendar events: ${response.status} ${errorText}`
      );
    }
    const data = await response.json();
    console.log('Response data:', data);
    return data;
  } catch (error) {
    console.error('Error fetching calendar events by month:', error);
    return [];
  }
};

// Create a new calendar event
export const createCalendarEvent = async (
  eventData: CreateCalendarEventData
): Promise<CalendarEvent | null> => {
  try {
    const response = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });
    if (!response.ok) {
      throw new Error('Failed to create calendar event');
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return null;
  }
};
