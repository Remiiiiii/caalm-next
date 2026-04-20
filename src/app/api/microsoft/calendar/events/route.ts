import { type NextRequest, NextResponse } from "next/server";
import { getValidIntegration } from "@/lib/actions/calendar-integration.actions";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";
import { createGraphClient } from "@/lib/microsoft/graph-client";
import { caalmEventToGraph } from "@/lib/microsoft/sync";

export async function GET(request: NextRequest) {
	try {
		// Get current user ID
		let userId: string;

		try {
			userId = await getCurrentUserId();
		} catch (_authError) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		// Get valid integration
		const integration = await getValidIntegration(userId, "microsoft");

		if (!integration) {
			return NextResponse.json(
				{ error: "Microsoft calendar integration not found or expired" },
				{ status: 404 },
			);
		}

		// Create Graph client
		const graphClient = createGraphClient(
			integration.access_token,
			integration.refresh_token,
			new Date(integration.token_expiry),
		);

		// Get query parameters
		const { searchParams } = new URL(request.url);
		const startDate = searchParams.get("startDate");
		const endDate = searchParams.get("endDate");
		const calendarId = searchParams.get("calendarId") || "primary";

		// Fetch events from Microsoft Graph
		let events;
		if (startDate && endDate) {
			events = await graphClient.getEventsInRange(
				new Date(startDate),
				new Date(endDate),
				calendarId,
			);
		} else {
			events = await graphClient.getEvents(calendarId);
		}

		return NextResponse.json({
			success: true,
			events,
			count: events.length,
		});
	} catch (error) {
		console.error("Error fetching Microsoft calendar events:", error);

		return NextResponse.json(
			{
				error: "Failed to fetch calendar events",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		// Get current user ID
		let userId: string;

		try {
			userId = await getCurrentUserId();
		} catch (_authError) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		// Get valid integration
		const integration = await getValidIntegration(userId, "microsoft");

		if (!integration) {
			return NextResponse.json(
				{ error: "Microsoft calendar integration not found or expired" },
				{ status: 404 },
			);
		}

		// Parse request body
		const eventData = await request.json();

		// Accept newer payload shape using startDate
		if (!eventData.title || !eventData.startDate) {
			return NextResponse.json(
				{ error: "Event title and startDate are required" },
				{ status: 400 },
			);
		}

		// Create Graph client
		const graphClient = createGraphClient(
			integration.access_token,
			integration.refresh_token,
			new Date(integration.token_expiry),
		);

		// Convert CAALM event to Graph format
		const graphEvent = caalmEventToGraph(eventData);

		// Get calendar ID from query params
		const { searchParams } = new URL(request.url);
		const calendarId = searchParams.get("calendarId") || "primary";

		// Create event in Microsoft Graph
		const createdEvent = await graphClient.createEvent(graphEvent, calendarId);

		return NextResponse.json({
			success: true,
			event: createdEvent,
		});
	} catch (error) {
		console.error("Error creating Microsoft calendar event:", error);

		return NextResponse.json(
			{
				error: "Failed to create calendar event",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		// Get current user ID
		let userId: string;

		try {
			userId = await getCurrentUserId();
		} catch (_authError) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		// Get valid integration
		const integration = await getValidIntegration(userId, "microsoft");

		if (!integration) {
			return NextResponse.json(
				{ error: "Microsoft calendar integration not found or expired" },
				{ status: 404 },
			);
		}

		// Parse request body
		const { eventId, eventData } = await request.json();

		if (!eventId) {
			return NextResponse.json(
				{ error: "Event ID is required" },
				{ status: 400 },
			);
		}

		// Create Graph client
		const graphClient = createGraphClient(
			integration.access_token,
			integration.refresh_token,
			new Date(integration.token_expiry),
		);

		// Convert CAALM event to Graph format
		const graphEvent = caalmEventToGraph(eventData);

		// Get calendar ID from query params
		const { searchParams } = new URL(request.url);
		const calendarId = searchParams.get("calendarId") || "primary";

		// Update event in Microsoft Graph
		const updatedEvent = await graphClient.updateEvent(
			eventId,
			graphEvent,
			calendarId,
		);

		return NextResponse.json({
			success: true,
			event: updatedEvent,
		});
	} catch (error) {
		console.error("Error updating Microsoft calendar event:", error);

		return NextResponse.json(
			{
				error: "Failed to update calendar event",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		// Get current user ID
		let userId: string;

		try {
			userId = await getCurrentUserId();
		} catch (_authError) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		// Get valid integration
		const integration = await getValidIntegration(userId, "microsoft");

		if (!integration) {
			return NextResponse.json(
				{ error: "Microsoft calendar integration not found or expired" },
				{ status: 404 },
			);
		}

		// Get event ID from query params
		const { searchParams } = new URL(request.url);
		const eventId = searchParams.get("eventId");

		if (!eventId) {
			return NextResponse.json(
				{ error: "Event ID is required" },
				{ status: 400 },
			);
		}

		// Create Graph client
		const graphClient = createGraphClient(
			integration.access_token,
			integration.refresh_token,
			new Date(integration.token_expiry),
		);

		// Get calendar ID from query params
		const calendarId = searchParams.get("calendarId") || "primary";

		// Delete event from Microsoft Graph
		await graphClient.deleteEvent(eventId, calendarId);

		return NextResponse.json({
			success: true,
			message: "Event deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting Microsoft calendar event:", error);

		return NextResponse.json(
			{
				error: "Failed to delete calendar event",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
