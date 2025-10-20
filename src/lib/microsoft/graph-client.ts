import { Client } from '@microsoft/microsoft-graph-client';
import { appwriteConfig } from '@/lib/appwrite/config';
import { refreshAccessToken, isTokenExpired } from './oauth';

export interface GraphEvent {
  id?: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  body?: {
    content: string;
    contentType: 'text' | 'html';
  };
  location?: {
    displayName: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
    type: 'required' | 'optional' | 'resource';
  }>;
  isAllDay?: boolean;
  showAs?:
    | 'free'
    | 'tentative'
    | 'busy'
    | 'oof'
    | 'workingElsewhere'
    | 'unknown';
  sensitivity?: 'normal' | 'personal' | 'private' | 'confidential';
  importance?: 'low' | 'normal' | 'high';
  categories?: string[];
  createdDateTime?: string;
  lastModifiedDateTime?: string;
}

export interface GraphCalendar {
  id: string;
  name: string;
  color?: string;
  isDefaultCalendar?: boolean;
  canEdit?: boolean;
  canShare?: boolean;
  canViewPrivateItems?: boolean;
}

export interface GraphCalendarListResponse {
  value: GraphCalendar[];
}

export interface GraphEventListResponse {
  value: GraphEvent[];
}

export class MicrosoftGraphClient {
  private client: Client;
  private accessToken: string;
  private refreshToken: string;
  private tokenExpiry: Date;

  constructor(accessToken: string, refreshToken: string, tokenExpiry: Date) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpiry = tokenExpiry;

    this.client = Client.init({
      authProvider: {
        getAccessToken: async () => {
          // Check if token needs refresh
          if (isTokenExpired(this.tokenExpiry)) {
            await this.refreshTokens();
          }
          return this.accessToken;
        },
      },
    });
  }

  /**
   * Refresh access tokens
   */
  private async refreshTokens(): Promise<void> {
    try {
      const tokens = await refreshAccessToken(this.refreshToken);
      this.accessToken = tokens.access_token;
      this.refreshToken = tokens.refresh_token;
      this.tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);
    } catch (error) {
      throw new Error(`Failed to refresh tokens: ${error}`);
    }
  }

  /**
   * Get user's calendars
   */
  async getCalendars(): Promise<GraphCalendar[]> {
    try {
      const response = (await this.client
        .api('/me/calendars')
        .get()) as GraphCalendarListResponse;
      return response.value;
    } catch (error) {
      throw new Error(`Failed to get calendars: ${error}`);
    }
  }

  /**
   * Get events from a specific calendar
   */
  async getEvents(
    calendarId: string = 'primary',
    startDate?: Date,
    endDate?: Date
  ): Promise<GraphEvent[]> {
    try {
      let query = `/me/calendars/${calendarId}/events`;

      if (startDate && endDate) {
        const start = startDate.toISOString();
        const end = endDate.toISOString();
        query += `?$filter=start/dateTime ge '${start}' and end/dateTime le '${end}'`;
      }

      const response = (await this.client
        .api(query)
        .get()) as GraphEventListResponse;

      return response.value;
    } catch (error) {
      throw new Error(`Failed to get events: ${error}`);
    }
  }

  /**
   * Get a specific event by ID
   */
  async getEvent(
    eventId: string,
    calendarId: string = 'primary'
  ): Promise<GraphEvent> {
    try {
      return (await this.client
        .api(`/me/calendars/${calendarId}/events/${eventId}`)
        .get()) as GraphEvent;
    } catch (error) {
      throw new Error(`Failed to get event: ${error}`);
    }
  }

  /**
   * Create a new event
   */
  async createEvent(
    event: Omit<GraphEvent, 'id'>,
    calendarId: string = 'primary'
  ): Promise<GraphEvent> {
    try {
      return (await this.client
        .api(`/me/calendars/${calendarId}/events`)
        .post(event)) as GraphEvent;
    } catch (error) {
      throw new Error(`Failed to create event: ${error}`);
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    eventId: string,
    event: Partial<GraphEvent>,
    calendarId: string = 'primary'
  ): Promise<GraphEvent> {
    try {
      return (await this.client
        .api(`/me/calendars/${calendarId}/events/${eventId}`)
        .patch(event)) as GraphEvent;
    } catch (error) {
      throw new Error(`Failed to update event: ${error}`);
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(
    eventId: string,
    calendarId: string = 'primary'
  ): Promise<void> {
    try {
      await this.client
        .api(`/me/calendars/${calendarId}/events/${eventId}`)
        .delete();
    } catch (error) {
      throw new Error(`Failed to delete event: ${error}`);
    }
  }

  /**
   * Get events for a specific date range
   */
  async getEventsInRange(
    startDate: Date,
    endDate: Date,
    calendarId: string = 'primary'
  ): Promise<GraphEvent[]> {
    return this.getEvents(calendarId, startDate, endDate);
  }

  /**
   * Get today's events
   */
  async getTodaysEvents(calendarId: string = 'primary'): Promise<GraphEvent[]> {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59
    );

    return this.getEventsInRange(startOfDay, endOfDay, calendarId);
  }

  /**
   * Get this week's events
   */
  async getThisWeeksEvents(
    calendarId: string = 'primary'
  ): Promise<GraphEvent[]> {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return this.getEventsInRange(startOfWeek, endOfWeek, calendarId);
  }

  /**
   * Get current token information
   */
  getTokenInfo(): { accessToken: string; refreshToken: string; expiry: Date } {
    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expiry: this.tokenExpiry,
    };
  }
}

/**
 * Create a Microsoft Graph client instance
 */
export function createGraphClient(
  accessToken: string,
  refreshToken: string,
  tokenExpiry: Date
): MicrosoftGraphClient {
  return new MicrosoftGraphClient(accessToken, refreshToken, tokenExpiry);
}

/**
 * Validate Microsoft Graph configuration
 */
export function validateGraphConfig(): void {
  if (!appwriteConfig.microsoftClientId) {
    throw new Error('Microsoft Client ID is not configured');
  }
  if (!appwriteConfig.microsoftClientSecret) {
    throw new Error('Microsoft Client Secret is not configured');
  }
}
