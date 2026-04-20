import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "../appwrite/config";

/**
 * Resource Management Actions
 * Priority 2: Resource management for rooms and equipment, with capacity limits and approval gates
 */

export interface CalendarResource {
	$id: string;
	name: string;
	type: "room" | "equipment";
	description?: string;
	location?: string;
	capacity?: number; // Maximum capacity (for rooms) or quantity (for equipment)
	features?: string[]; // e.g., ['projector', 'whiteboard', 'video-conference']
	requiresApproval: boolean;
	approvalWorkflowId?: string; // Optional workflow ID for approval process
	organizationId: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface ResourceBooking {
	$id: string;
	resourceId: string;
	eventId: string;
	startDate: string;
	endDate: string;
	startTime: string;
	endTime: string;
	requestedBy: string; // User ID
	requestedByAccountId: string;
	status: "pending" | "approved" | "rejected" | "cancelled";
	approvalRequestId?: string; // Link to approval request if requires approval
	approvedBy?: string; // User ID who approved
	approvedAt?: string;
	rejectionReason?: string;
	createdAt: string;
	updatedAt: string;
}

export interface CreateResourceData {
	name: string;
	type: "room" | "equipment";
	description?: string;
	location?: string;
	capacity?: number;
	features?: string[];
	requiresApproval?: boolean;
	approvalWorkflowId?: string;
	organizationId: string;
}

export interface CreateResourceBookingData {
	resourceId: string;
	eventId: string;
	startDate: string;
	endDate: string;
	startTime: string;
	endTime: string;
	requestedBy: string;
	requestedByAccountId: string;
}

const getResourcesCollectionId = (): string => {
	const collectionId =
		process.env.NEXT_PUBLIC_APPWRITE_CALENDAR_RESOURCES_COLLECTION ||
		"calendar_resources";
	if (!collectionId) {
		throw new Error("Calendar resources collection ID not configured");
	}
	return collectionId;
};

const getResourceBookingsCollectionId = (): string => {
	const collectionId =
		process.env.NEXT_PUBLIC_APPWRITE_RESOURCE_BOOKINGS_COLLECTION ||
		"resource_bookings";
	if (!collectionId) {
		throw new Error("Resource bookings collection ID not configured");
	}
	return collectionId;
};

/**
 * Create a calendar resource (room or equipment)
 */
export const createResource = async (
	data: CreateResourceData,
): Promise<CalendarResource> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getResourcesCollectionId();

	const resourceId = ID.unique();

	const response = await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		rowId: resourceId,
		data: {
			name: data.name,
			type: data.type,
			description: data.description || null,
			location: data.location || null,
			capacity: data.capacity || null,
			features: data.features ? JSON.stringify(data.features) : null,
			requiresApproval: data.requiresApproval || false,
			approvalWorkflowId: data.approvalWorkflowId || null,
			organizationId: data.organizationId,
			isActive: true,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	});

	// Parse features back from JSON
	const result = response as unknown as Record<string, unknown>;
	if (typeof result.features === "string") {
		try {
			result.features = JSON.parse(result.features);
		} catch (error) {
			console.error("[SERVER] createResource] Error parsing features:", error);
			result.features = [];
		}
	}

	return result as unknown as CalendarResource;
};

/**
 * Get all resources for an organization
 */
export const getResources = async (
	organizationId: string,
	type?: "room" | "equipment",
): Promise<CalendarResource[]> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getResourcesCollectionId();

	const queries = [
		Query.equal("organizationId", organizationId),
		Query.equal("isActive", true),
	];

	if (type) {
		queries.push(Query.equal("type", type));
	}

	const response = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		queries,
	});

	// Parse features from JSON
	const resources = response.rows.map((row) => {
		const resource = row as unknown as Record<string, unknown>;
		if (typeof resource.features === "string") {
			try {
				resource.features = JSON.parse(resource.features);
			} catch (error) {
				console.error("[SERVER] getResources] Error parsing features:", error);
				resource.features = [];
			}
		}
		return resource;
	});

	return resources as unknown as CalendarResource[];
};

/**
 * Get resource by ID
 */
export const getResourceById = async (
	resourceId: string,
): Promise<CalendarResource | null> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getResourcesCollectionId();

	try {
		const response = await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: collectionId,
			rowId: resourceId,
		});

		// Parse features from JSON
		const resource = response as unknown as Record<string, unknown>;
		if (typeof resource.features === "string") {
			try {
				resource.features = JSON.parse(resource.features);
			} catch (error) {
				console.error(
					"[SERVER] getResourceById] Error parsing features:",
					error,
				);
				resource.features = [];
			}
		}

		return resource as unknown as CalendarResource;
	} catch (error) {
		console.error("[SERVER] getResourceById] Error:", error);
		return null;
	}
};

/**
 * Create a resource booking
 */
export const createResourceBooking = async (
	data: CreateResourceBookingData,
): Promise<ResourceBooking> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getResourceBookingsCollectionId();

	// Check if resource requires approval
	const resource = await getResourceById(data.resourceId);
	if (!resource) {
		throw new Error("Resource not found");
	}

	const bookingId = ID.unique();
	const status = resource.requiresApproval ? "pending" : "approved";

	const response = await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		rowId: bookingId,
		data: {
			resourceId: data.resourceId,
			eventId: data.eventId,
			startDate: data.startDate,
			endDate: data.endDate,
			startTime: data.startTime,
			endTime: data.endTime,
			requestedBy: data.requestedBy,
			requestedByAccountId: data.requestedByAccountId,
			status,
			approvalRequestId: null,
			approvedBy: null,
			approvedAt: null,
			rejectionReason: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	});

	return response as unknown as ResourceBooking;
};

/**
 * Check resource availability and capacity
 */
export const checkResourceAvailability = async (
	resourceId: string,
	startDate: string,
	_endDate: string,
	startTime: string,
	endTime: string,
	excludeBookingId?: string,
): Promise<{
	available: boolean;
	reason?: string;
	conflictingBookings?: ResourceBooking[];
}> => {
	const resource = await getResourceById(resourceId);
	if (!resource) {
		return { available: false, reason: "Resource not found" };
	}

	if (!resource.isActive) {
		return { available: false, reason: "Resource is not active" };
	}

	// Get all active bookings for this resource in the time range
	const { tablesDB } = await createAdminClient();
	const bookingsCollectionId = getResourceBookingsCollectionId();

	const queries = [
		Query.equal("resourceId", resourceId),
		Query.equal("status", "approved"), // Only check approved bookings
		Query.equal("startDate", startDate), // Same day
	];

	const bookingsResponse = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: bookingsCollectionId,
		queries,
	});

	const conflictingBookings: ResourceBooking[] = [];

	// Check for time overlaps
	for (const booking of bookingsResponse.rows) {
		if (excludeBookingId && booking.$id === excludeBookingId) {
			continue;
		}

		const bookingRow = booking as unknown as ResourceBooking;

		// Simple time overlap check (can be enhanced)
		if (
			(startTime >= bookingRow.startTime && startTime < bookingRow.endTime) ||
			(endTime > bookingRow.startTime && endTime <= bookingRow.endTime) ||
			(startTime <= bookingRow.startTime && endTime >= bookingRow.endTime)
		) {
			conflictingBookings.push(bookingRow);
		}
	}

	if (conflictingBookings.length > 0) {
		return {
			available: false,
			reason: `Resource is already booked at this time`,
			conflictingBookings,
		};
	}

	// Check capacity if applicable (for future enhancement)
	// This would check if the resource has enough capacity for the requested usage

	return { available: true };
};
