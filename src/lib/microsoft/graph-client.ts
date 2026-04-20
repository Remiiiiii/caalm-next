import { Client } from "@microsoft/microsoft-graph-client";
import { appwriteConfig } from "@/lib/appwrite/config";
import { isTokenExpired, refreshAccessToken } from "./oauth";

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
		contentType: "text" | "html";
	};
	location?: {
		displayName: string;
	};
	attendees?: Array<{
		emailAddress: {
			address: string;
			name: string;
		};
		type: "required" | "optional" | "resource";
	}>;
	isAllDay?: boolean;
	showAs?:
		| "free"
		| "tentative"
		| "busy"
		| "oof"
		| "workingElsewhere"
		| "unknown";
	sensitivity?: "normal" | "personal" | "private" | "confidential";
	importance?: "low" | "normal" | "high";
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
	private accessToken: string;
	private refreshToken: string;
	private tokenExpiry: Date;

	constructor(accessToken: string, refreshToken: string, tokenExpiry: Date) {
		this.accessToken = accessToken;
		this.refreshToken = refreshToken;
		this.tokenExpiry = tokenExpiry;

		// Initialize the Graph client with a minimal auth provider
		// We'll handle authentication manually in each method, but the SDK requires an auth provider
		this.client = Client.init({
			authProvider: {
				getAccessToken: async () => {
					// Return the current access token - we'll refresh manually if needed
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
			console.log(
				"Refreshing tokens with refresh token:",
				`${this.refreshToken.substring(0, 20)}...`,
			);
			console.log("Current token expiry:", this.tokenExpiry.toISOString());
			console.log("Current time:", new Date().toISOString());

			const tokens = await refreshAccessToken(this.refreshToken);
			console.log(
				"Token refresh successful, new access token:",
				`${tokens.access_token.substring(0, 20)}...`,
			);
			console.log(
				"New refresh token:",
				`${tokens.refresh_token.substring(0, 20)}...`,
			);
			console.log("Token expires in:", tokens.expires_in, "seconds");

			this.accessToken = tokens.access_token;
			this.refreshToken = tokens.refresh_token;
			this.tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);
			console.log("New token expiry:", this.tokenExpiry.toISOString());
		} catch (error) {
			console.error("Token refresh failed:", error);
			console.error(
				"Refresh token being used:",
				`${this.refreshToken.substring(0, 20)}...`,
			);
			throw new Error(`Failed to refresh tokens: ${error}`);
		}
	}

	/**
	 * Get user's calendars
	 */
	async getCalendars(): Promise<GraphCalendar[]> {
		try {
			// Check if token needs refresh before making the request
			if (isTokenExpired(this.tokenExpiry)) {
				console.log("Token expired, refreshing...");
				await this.refreshTokens();
			}

			const response = await fetch(
				"https://graph.microsoft.com/v1.0/me/calendars",
				{
					headers: {
						Authorization: `Bearer ${this.accessToken}`,
						"Content-Type": "application/json",
					},
				},
			);

			if (!response.ok) {
				const errorText = await response.text();
				console.error("Graph API calendars error:", errorText);
				throw new Error(
					`Graph API error: ${response.status} ${response.statusText}`,
				);
			}

			const data = await response.json();
			return data.value || [];
		} catch (error) {
			console.error("Error getting calendars:", error);
			throw new Error(`Failed to get calendars: ${error}`);
		}
	}

	/**
	 * Get events from a specific calendar
	 */
	async getEvents(
		calendarId: string = "primary",
		startDate?: Date,
		endDate?: Date,
	): Promise<GraphEvent[]> {
		try {
			// Check if token needs refresh before making the request
			if (isTokenExpired(this.tokenExpiry)) {
				console.log("Token expired, refreshing...");
				await this.refreshTokens();
			}

			// Use direct HTTP requests instead of the Graph client
			let url = `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/calendarView`;

			// Add basic query parameters for better compatibility
			const params = new URLSearchParams();

			// Use calendarView endpoint which returns times in user's timezone
			// Specify timezone explicitly
			if (startDate && endDate) {
				params.append("startDateTime", startDate.toISOString());
				params.append("endDateTime", endDate.toISOString());
			}

			params.append("$orderby", "start/dateTime asc");
			params.append("$top", "250"); // Increase limit to reduce pagination
			params.append(
				"$select",
				"id,subject,start,end,body,location,attendees,isAllDay,showAs,sensitivity,importance,categories,createdDateTime,lastModifiedDateTime",
			); // Request attendees field

			url += `?${params.toString()}`;

			console.log("Graph API URL:", url);
			console.log(
				"Using access token:",
				`${this.accessToken.substring(0, 20)}...`,
			);

			// Fetch all pages of events (handle pagination)
			const allEvents: GraphEvent[] = [];
			let nextLink: string | undefined = url;

			while (nextLink) {
				// Get the server's local timezone (e.g., "Eastern Standard Time")
				const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
				const outlookTimezone =
					timezone === "America/New_York" ? "Eastern Standard Time" : timezone; // Use server timezone dynamically

				const response = await fetch(nextLink, {
					headers: {
						Authorization: `Bearer ${this.accessToken}`,
						"Content-Type": "application/json",
						Prefer: `outlook.timezone="${outlookTimezone}"`,
					},
				});

				if (!response.ok) {
					const errorText = await response.text();
					console.error("Graph API error response:", errorText);
					throw new Error(
						`Graph API error: ${response.status} ${response.statusText}`,
					);
				}

				const data = await response.json();

				// Add events from this page
				if (data.value && Array.isArray(data.value)) {
					allEvents.push(...data.value);
				}

				// Check for next page
				nextLink = data["@odata.nextLink"];

				// Safety check: limit to 5 pages (1250 events max) to prevent infinite loops
				if (allEvents.length >= 1250) {
					console.warn(
						"Reached maximum event limit (1250), stopping pagination",
					);
					break;
				}
			}

			console.log(`Graph API fetched ${allEvents.length} events total`);

			// Remove duplicates based on event ID
			const uniqueEvents = Array.from(
				new Map(allEvents.map((event) => [event.id, event])).values(),
			);

			console.log(`After deduplication: ${uniqueEvents.length} unique events`);
			return uniqueEvents;
		} catch (error) {
			console.error("Graph API error:", error);
			throw new Error(`Failed to get events: ${error}`);
		}
	}

	/**
	 * Get a specific event by ID
	 */
	async getEvent(
		eventId: string,
		calendarId: string = "primary",
	): Promise<GraphEvent> {
		try {
			// Check if token needs refresh before making the request
			if (isTokenExpired(this.tokenExpiry)) {
				console.log("Token expired, refreshing...");
				await this.refreshTokens();
			}

			const response = await fetch(
				`https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events/${eventId}`,
				{
					headers: {
						Authorization: `Bearer ${this.accessToken}`,
						"Content-Type": "application/json",
					},
				},
			);

			if (!response.ok) {
				const errorText = await response.text();
				console.error("Graph API event error:", errorText);
				throw new Error(
					`Graph API error: ${response.status} ${response.statusText}`,
				);
			}

			return await response.json();
		} catch (error) {
			console.error("Error getting event:", error);
			throw new Error(`Failed to get event: ${error}`);
		}
	}

	/**
	 * Create a new event
	 */
	async createEvent(
		event: Omit<GraphEvent, "id">,
		calendarId: string = "primary",
	): Promise<GraphEvent> {
		try {
			// Check if token needs refresh before making the request
			if (isTokenExpired(this.tokenExpiry)) {
				console.log("Token expired, refreshing...");
				await this.refreshTokens();
			}

			console.log(
				"Creating event in Outlook with payload:",
				JSON.stringify(event, null, 2),
			);

			const response = await fetch(
				`https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${this.accessToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(event),
				},
			);

			if (!response.ok) {
				const errorText = await response.text();
				console.error("Graph API create event error:", errorText);
				console.error(
					"Request body that failed:",
					JSON.stringify(event, null, 2),
				);
				throw new Error(
					`Graph API error: ${response.status} ${response.statusText} - ${errorText}`,
				);
			}

			return await response.json();
		} catch (error) {
			console.error("Error creating event:", error);
			throw new Error(`Failed to create event: ${error}`);
		}
	}

	/**
	 * Update an existing event
	 */
	async updateEvent(
		eventId: string,
		event: Partial<GraphEvent>,
		calendarId: string = "primary",
	): Promise<GraphEvent> {
		try {
			// Check if token needs refresh before making the request
			if (isTokenExpired(this.tokenExpiry)) {
				console.log("Token expired, refreshing...");
				await this.refreshTokens();
			}

			const response = await fetch(
				`https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events/${eventId}`,
				{
					method: "PATCH",
					headers: {
						Authorization: `Bearer ${this.accessToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(event),
				},
			);

			if (!response.ok) {
				const errorText = await response.text();
				console.error("Graph API update event error:", errorText);
				throw new Error(
					`Graph API error: ${response.status} ${response.statusText}`,
				);
			}

			return await response.json();
		} catch (error) {
			console.error("Error updating event:", error);
			throw new Error(`Failed to update event: ${error}`);
		}
	}

	/**
	 * Delete an event
	 */
	async deleteEvent(
		eventId: string,
		calendarId: string = "primary",
	): Promise<void> {
		try {
			// Check if token needs refresh before making the request
			if (isTokenExpired(this.tokenExpiry)) {
				console.log("Token expired, refreshing...");
				await this.refreshTokens();
			}

			const response = await fetch(
				`https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events/${eventId}`,
				{
					method: "DELETE",
					headers: {
						Authorization: `Bearer ${this.accessToken}`,
						"Content-Type": "application/json",
					},
				},
			);

			if (!response.ok) {
				const errorText = await response.text();
				console.error("Graph API delete event error:", errorText);
				throw new Error(
					`Graph API error: ${response.status} ${response.statusText}`,
				);
			}
		} catch (error) {
			console.error("Error deleting event:", error);
			throw new Error(`Failed to delete event: ${error}`);
		}
	}

	/**
	 * Get events for a specific date range
	 */
	async getEventsInRange(
		startDate: Date,
		endDate: Date,
		calendarId: string = "primary",
	): Promise<GraphEvent[]> {
		return this.getEvents(calendarId, startDate, endDate);
	}

	/**
	 * Get today's events
	 */
	async getTodaysEvents(calendarId: string = "primary"): Promise<GraphEvent[]> {
		const today = new Date();
		const startOfDay = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate(),
		);
		const endOfDay = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate(),
			23,
			59,
			59,
		);

		return this.getEventsInRange(startOfDay, endOfDay, calendarId);
	}

	/**
	 * Get this week's events
	 */
	async getThisWeeksEvents(
		calendarId: string = "primary",
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
	 * Get user information from Microsoft Graph
	 */
	async getUserInfo(): Promise<any> {
		try {
			const response = await fetch("https://graph.microsoft.com/v1.0/me", {
				headers: {
					Authorization: `Bearer ${this.accessToken}`,
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error("Graph API user info error:", errorText);
				throw new Error(
					`Graph API error: ${response.status} ${response.statusText}`,
				);
			}

			return await response.json();
		} catch (error) {
			console.error("Error getting user info:", error);
			throw new Error(`Failed to get user info: ${error}`);
		}
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
	tokenExpiry: Date,
): MicrosoftGraphClient {
	return new MicrosoftGraphClient(accessToken, refreshToken, tokenExpiry);
}

/**
 * Validate Microsoft Graph configuration
 */
export function validateGraphConfig(): void {
	if (!appwriteConfig.microsoftClientId) {
		throw new Error("Microsoft Client ID is not configured");
	}
	if (!appwriteConfig.microsoftClientSecret) {
		throw new Error("Microsoft Client Secret is not configured");
	}
}
