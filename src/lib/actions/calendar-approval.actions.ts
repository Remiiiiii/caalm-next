"use server";

import { ID, Query } from "node-appwrite";
import type {
	CalendarApprovalStatus,
	CalendarSensitivity,
} from "@/constants/rbac";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { logAuditEvent } from "@/lib/services/audit-logger";
import { notificationService } from "@/lib/services/notificationService";
import {
	deleteCalendarEvent,
	getCalendarEventById,
	updateCalendarEvent,
} from "./calendar.actions";
import { getUserByAccountId } from "./user.actions";

export type CalendarApprovalChangeType = "create" | "update" | "cancel";

export interface CalendarApprovalChangeSummary {
	before?: Record<string, unknown> | null;
	after?: Record<string, unknown> | null;
}

export interface CalendarApprovalRequest {
	$id: string;
	eventId: string;
	changeType: CalendarApprovalChangeType;
	requestedByAccountId: string;
	requestedByUserId?: string;
	status: CalendarApprovalStatus;
	submittedAt: string;
	decidedAt?: string;
	approverAccountId?: string;
	approverUserId?: string;
	reviewerNotes?: string;
	changeSummary: CalendarApprovalChangeSummary;
	sensitivityLevel: CalendarSensitivity;
}

const getApprovalsCollectionId = () => {
	const collectionId = appwriteConfig.calendarApprovalRequestsCollectionId;
	if (!collectionId) {
		throw new Error(
			"Calendar approval requests collection ID is not configured",
		);
	}
	return collectionId;
};

export const createCalendarApprovalRequest = async ({
	eventId,
	changeType,
	requestedByAccountId,
	requestedByUserId,
	changeSummary,
	sensitivityLevel,
}: {
	eventId: string;
	changeType: CalendarApprovalChangeType;
	requestedByAccountId: string;
	requestedByUserId?: string;
	changeSummary: CalendarApprovalChangeSummary;
	sensitivityLevel: CalendarSensitivity;
}): Promise<CalendarApprovalRequest> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getApprovalsCollectionId();

	const approvalId = ID.unique();

	// Serialize changeSummary to JSON string for storage
	const changeSummaryJson = JSON.stringify(changeSummary);

	const response = await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		rowId: approvalId,
		data: {
			eventId,
			changeType,
			requestedByAccountId,
			requestedByUserId,
			status: "pending",
			submittedAt: new Date().toISOString(),
			changeSummary: changeSummaryJson,
			sensitivityLevel,
		},
	});

	// Parse changeSummary back to object for return value
	const result = response as unknown as Record<string, unknown>;
	if (typeof result.changeSummary === "string") {
		try {
			result.changeSummary = JSON.parse(result.changeSummary);
		} catch (error) {
			console.error("Error parsing changeSummary:", error);
		}
	}

	return result as unknown as CalendarApprovalRequest;
};

/**
 * @deprecated This function is deprecated. Use createCalendarApprovalRequest instead.
 * The simplified flow always creates new approval requests for resubmissions.
 *
 * Update an existing calendar approval request
 * Used when an event creator resubmits an event after changes were requested
 */
export const updateCalendarApprovalRequest = async ({
	approvalId,
	changeSummary,
	clearReviewerNotes = false,
}: {
	approvalId: string;
	changeSummary: CalendarApprovalChangeSummary;
	clearReviewerNotes?: boolean;
}): Promise<CalendarApprovalRequest> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getApprovalsCollectionId();

	// Serialize changeSummary to JSON string for storage
	const changeSummaryJson = JSON.stringify(changeSummary);

	// Build update data
	const updateData: Record<string, unknown> = {
		changeSummary: changeSummaryJson,
		submittedAt: new Date().toISOString(), // Update submission time to track resubmission
		status: "pending", // Ensure status remains pending for resubmission
	};

	// Clear decision-related fields since approval is back in pending queue
	updateData.decidedAt = null;
	updateData.approverAccountId = null;
	updateData.approverUserId = null;

	// Optionally clear reviewer notes when resubmitting
	if (clearReviewerNotes) {
		updateData.reviewerNotes = null;
	}

	const response = await tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		rowId: approvalId,
		data: updateData,
	});

	// Parse changeSummary back to object for return value
	const result = response as unknown as Record<string, unknown>;
	if (typeof result.changeSummary === "string") {
		try {
			result.changeSummary = JSON.parse(result.changeSummary);
		} catch (error) {
			console.error("Error parsing changeSummary:", error);
			result.changeSummary = { before: null, after: null };
		}
	}

	return result as unknown as CalendarApprovalRequest;
};

export const listCalendarApprovalRequests = async ({
	status,
}: {
	status?: CalendarApprovalStatus;
} = {}): Promise<CalendarApprovalRequest[]> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getApprovalsCollectionId();

	const queries = [];
	if (status) {
		queries.push(Query.equal("status", status));
	}

	const response = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		queries,
	});

	// Parse changeSummary from JSON string to object for each row
	return response.rows.map((row: unknown) => {
		const record = row as Record<string, unknown>;
		if (typeof record.changeSummary === "string") {
			try {
				record.changeSummary = JSON.parse(record.changeSummary);
			} catch (error) {
				console.error("Error parsing changeSummary:", error);
				record.changeSummary = { before: null, after: null };
			}
		}
		return record as unknown as CalendarApprovalRequest;
	});
};

export const getCalendarApprovalById = async (
	approvalId: string,
): Promise<CalendarApprovalRequest | null> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getApprovalsCollectionId();

	try {
		const response = await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: collectionId,
			rowId: approvalId,
		});

		// Convert to plain object to ensure serialization
		const raw = response as unknown as Record<string, unknown>;

		// Parse changeSummary from JSON string to object and deeply serialize to remove any client instances
		let changeSummary: CalendarApprovalChangeSummary = {
			before: null,
			after: null,
		};
		if (typeof raw.changeSummary === "string") {
			try {
				const parsed = JSON.parse(raw.changeSummary);
				// Deep serialize to ensure no client instances remain
				changeSummary = JSON.parse(JSON.stringify(parsed));
			} catch (error) {
				console.error("Error parsing changeSummary:", error);
				changeSummary = { before: null, after: null };
			}
		} else if (raw.changeSummary && typeof raw.changeSummary === "object") {
			// Deep serialize to ensure no client instances remain
			try {
				changeSummary = JSON.parse(JSON.stringify(raw.changeSummary));
			} catch (error) {
				console.error("Error serializing changeSummary:", error);
				changeSummary = { before: null, after: null };
			}
		}

		// Return plain object with only serializable fields
		// Deep serialize the entire object to ensure no nested client instances
		const result = {
			$id: String(raw.$id || ""),
			eventId: String(raw.eventId || ""),
			changeType: raw.changeType as CalendarApprovalChangeType,
			requestedByAccountId: String(raw.requestedByAccountId || ""),
			requestedByUserId: raw.requestedByUserId
				? String(raw.requestedByUserId)
				: undefined,
			status: raw.status as CalendarApprovalStatus,
			submittedAt: String(raw.submittedAt || ""),
			decidedAt: raw.decidedAt ? String(raw.decidedAt) : undefined,
			approverAccountId: raw.approverAccountId
				? String(raw.approverAccountId)
				: undefined,
			approverUserId: raw.approverUserId
				? String(raw.approverUserId)
				: undefined,
			reviewerNotes: (() => {
				// Handle reviewerNotes: check for null, undefined, or empty string
				if (raw.reviewerNotes === null || raw.reviewerNotes === undefined) {
					return undefined;
				}
				const notesStr = String(raw.reviewerNotes).trim();
				return notesStr || undefined;
			})(),
			changeSummary,
			sensitivityLevel: raw.sensitivityLevel as CalendarSensitivity,
		};

		// Final deep serialization to ensure no client instances
		return JSON.parse(JSON.stringify(result)) as CalendarApprovalRequest;
	} catch (error) {
		console.error("Failed to get calendar approval by ID:", error);
		return null;
	}
};

/**
 * Get the most recent approval request for an event by eventId and status
 * Useful for finding reviewer notes when pendingApprovalId is null
 */
export const getLatestApprovalRequestByEventId = async (
	eventId: string,
	status?: CalendarApprovalStatus,
): Promise<CalendarApprovalRequest | null> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getApprovalsCollectionId();

	try {
		const queries = [
			Query.equal("eventId", eventId),
			...(status ? [Query.equal("status", status)] : []),
			// Order by decidedAt (when decision was made) to get the most recent decision
			// For approval requests with changes_requested status, decidedAt should always be set
			Query.orderDesc("decidedAt"),
			Query.limit(1),
		];

		const response = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: collectionId,
			queries,
		});

		// CRITICAL: Extract only primitive values immediately to break ALL client references
		// We must NOT access response.rows directly - instead extract values one by one
		const total = Number(response.total) || 0;
		const rows: Array<Record<string, unknown>> = [];

		// Extract each row individually, converting all values to primitives
		for (let i = 0; i < response.rows.length; i++) {
			const row = response.rows[i] as any;
			// Create a completely new plain object with only primitive values
			const plainRow: Record<string, unknown> = {
				$id: String(row?.$id || ""),
				eventId: String(row?.eventId || ""),
				changeType: String(row?.changeType || "create"),
				requestedByAccountId: String(row?.requestedByAccountId || ""),
				requestedByUserId: row?.requestedByUserId
					? String(row.requestedByUserId)
					: undefined,
				status: String(row?.status || "pending"),
				submittedAt: String(row?.submittedAt || ""),
				decidedAt: row?.decidedAt ? String(row.decidedAt) : undefined,
				approverAccountId: row?.approverAccountId
					? String(row.approverAccountId)
					: undefined,
				approverUserId: row?.approverUserId
					? String(row.approverUserId)
					: undefined,
				reviewerNotes:
					row?.reviewerNotes !== null && row?.reviewerNotes !== undefined
						? String(row.reviewerNotes)
						: undefined,
				changeSummary: (() => {
					// Aggressively serialize changeSummary to remove any client references
					if (row?.changeSummary === null || row?.changeSummary === undefined) {
						return undefined;
					}
					try {
						// If it's a string, parse and re-serialize
						if (typeof row.changeSummary === "string") {
							const parsed = JSON.parse(row.changeSummary);
							return JSON.parse(JSON.stringify(parsed));
						}
						// If it's an object, serialize it
						if (typeof row.changeSummary === "object") {
							return JSON.parse(JSON.stringify(row.changeSummary));
						}
						return undefined;
					} catch (error) {
						console.error(
							"[getLatestApprovalRequestByEventId] Error serializing changeSummary:",
							error,
						);
						return undefined;
					}
				})(),
				sensitivityLevel: String(row?.sensitivityLevel || "normal"),
			};
			rows.push(plainRow);
		}

		const plainResponse = { total, rows };

		if (plainResponse.rows.length === 0) {
			console.log(
				"[getLatestApprovalRequestByEventId] No approval requests found",
			);
			return null;
		}

		// Now we can safely access the row - it's already a plain object with no client references
		const raw = plainResponse.rows[0] as Record<string, unknown>;

		// Parse changeSummary from JSON string to object and deeply serialize to remove any client instances
		let changeSummary: CalendarApprovalChangeSummary = {
			before: null,
			after: null,
		};
		if (typeof raw.changeSummary === "string") {
			try {
				const parsed = JSON.parse(raw.changeSummary);
				// Deep serialize to ensure no client instances remain
				changeSummary = JSON.parse(JSON.stringify(parsed));
			} catch (error) {
				console.error("Error parsing changeSummary:", error);
				changeSummary = { before: null, after: null };
			}
		} else if (raw.changeSummary && typeof raw.changeSummary === "object") {
			// Deep serialize to ensure no client instances remain
			try {
				changeSummary = JSON.parse(JSON.stringify(raw.changeSummary));
			} catch (error) {
				console.error("Error serializing changeSummary:", error);
				changeSummary = { before: null, after: null };
			}
		}

		// Return plain object with only serializable fields
		// Deep serialize the entire object to ensure no nested client instances
		const result = {
			$id: String(raw.$id || ""),
			eventId: String(raw.eventId || ""),
			changeType: raw.changeType as CalendarApprovalChangeType,
			requestedByAccountId: String(raw.requestedByAccountId || ""),
			requestedByUserId: raw.requestedByUserId
				? String(raw.requestedByUserId)
				: undefined,
			status: raw.status as CalendarApprovalStatus,
			submittedAt: String(raw.submittedAt || ""),
			decidedAt: raw.decidedAt ? String(raw.decidedAt) : undefined,
			approverAccountId: raw.approverAccountId
				? String(raw.approverAccountId)
				: undefined,
			approverUserId: raw.approverUserId
				? String(raw.approverUserId)
				: undefined,
			reviewerNotes: (() => {
				// Handle reviewerNotes: check for null, undefined, or empty string
				if (raw.reviewerNotes === null || raw.reviewerNotes === undefined) {
					return undefined;
				}
				const notesStr = String(raw.reviewerNotes).trim();
				return notesStr || undefined;
			})(),
			changeSummary,
			sensitivityLevel: raw.sensitivityLevel as CalendarSensitivity,
		};

		// CRITICAL: Create a completely new object with only primitives - no object references
		// This ensures no client instances can leak through
		const plainResult: CalendarApprovalRequest = {
			$id: String(result.$id || ""),
			eventId: String(result.eventId || ""),
			changeType: result.changeType,
			requestedByAccountId: String(result.requestedByAccountId || ""),
			requestedByUserId: result.requestedByUserId
				? String(result.requestedByUserId)
				: undefined,
			status: result.status,
			submittedAt: String(result.submittedAt || ""),
			decidedAt: result.decidedAt ? String(result.decidedAt) : undefined,
			approverAccountId: result.approverAccountId
				? String(result.approverAccountId)
				: undefined,
			approverUserId: result.approverUserId
				? String(result.approverUserId)
				: undefined,
			reviewerNotes: result.reviewerNotes
				? String(result.reviewerNotes)
				: undefined,
			changeSummary: result.changeSummary
				? JSON.parse(JSON.stringify(result.changeSummary))
				: undefined,
			sensitivityLevel: result.sensitivityLevel,
		};

		// Final serialization pass to ensure complete isolation
		let serialized: CalendarApprovalRequest;
		try {
			serialized = JSON.parse(
				JSON.stringify(plainResult),
			) as CalendarApprovalRequest;
		} catch (error) {
			console.error(
				"[getLatestApprovalRequestByEventId] Final serialization error:",
				error,
			);
			// If serialization fails, return the plain result (shouldn't happen but safety net)
			serialized = plainResult;
		}

		console.log(
			"[getLatestApprovalRequestByEventId] Final serialized result:",
			{
				$id: serialized.$id,
				eventId: serialized.eventId,
				status: serialized.status,
				reviewerNotes: serialized.reviewerNotes,
				hasReviewerNotes: !!serialized.reviewerNotes,
			},
		);

		return serialized;
	} catch (error) {
		console.error("Failed to get latest approval request by event ID:", error);
		return null;
	}
};

const finalizeCreateApproval = async (
	approval: CalendarApprovalRequest,
	approverAccountId: string,
	approverUserId?: string,
	reviewerNotes?: string,
) => {
	await updateCalendarEvent(approval.eventId, {
		approvalStatus: "approved",
		requiresApproval: false,
		pendingApprovalId: null,
	});

	// Fetch event to get title for audit log
	const event = await getCalendarEventById(approval.eventId);
	const eventTitle = event?.title || "Unknown Event";

	await logAuditEvent({
		event_id: approval.eventId,
		event_title: eventTitle,
		action: "approval_decided",
		source: "caalm",
		user_id: approverAccountId,
		user_name: "Approver",
		user_email: "",
		status: "success",
		metadata: {
			approvalId: approval.$id,
			changeType: approval.changeType,
			decision: "approved",
			reviewerNotes,
			approverUserId,
		},
	});
};

const finalizeCancelApproval = async (
	approval: CalendarApprovalRequest,
	approverAccountId: string,
	approverUserId?: string,
	reviewerNotes?: string,
) => {
	// Fetch event to get title for audit log before deletion
	const event = await getCalendarEventById(approval.eventId);
	const eventTitle = event?.title || "Unknown Event";

	await deleteCalendarEvent(approval.eventId, approverAccountId);

	await logAuditEvent({
		event_id: approval.eventId,
		event_title: eventTitle,
		action: "approval_decided",
		source: "caalm",
		user_id: approverAccountId,
		user_name: "Approver",
		user_email: "",
		status: "success",
		metadata: {
			approvalId: approval.$id,
			changeType: approval.changeType,
			decision: "approved",
			reviewerNotes,
			approverUserId,
		},
	});
};

/**
 * Send notification to event creator about approval decision
 */
const sendApprovalDecisionNotification = async (
	approval: CalendarApprovalRequest,
	decision: "changes_requested" | "rejected",
	eventTitle: string,
	reviewerNotes?: string,
	approverName?: string,
): Promise<void> => {
	try {
		const decisionLabels = {
			changes_requested: "Changes Requested",
			rejected: "Denied",
		};

		const priority = decision === "rejected" ? "high" : "medium";

		// Build notification message
		let message = `Your event "${eventTitle}" has been ${decisionLabels[
			decision
		].toLowerCase()}.`;

		if (approverName) {
			message += `\n\nReviewed by: ${approverName}`;
		}

		if (reviewerNotes?.trim()) {
			message += `\n\n${
				decision === "changes_requested"
					? "Requested Changes"
					: "Reason for Denial"
			}:`;
			message += `\n${reviewerNotes.trim()}`;
		}

		// Try to create notification with "calendar-approval" type
		// If it doesn't exist, fall back to a generic type
		let notificationType = "calendar-approval";
		try {
			await notificationService.getNotificationType(notificationType);
		} catch (_error) {
			// If calendar-approval type doesn't exist, try generic types
			try {
				await notificationService.getNotificationType("calendar");
				notificationType = "calendar";
			} catch {
				// If neither exists, use a generic type that should exist
				notificationType = "system";
			}
		}

		await notificationService.createNotification({
			userId: approval.requestedByAccountId,
			title: `Event Approval ${decisionLabels[decision]}`,
			message,
			type: notificationType,
			priority,
			actionUrl: "/calendar",
			actionText: "View Calendar",
			metadata: {
				approvalId: approval.$id,
				eventId: approval.eventId,
				decision,
				reviewerNotes: reviewerNotes || undefined,
				changeType: approval.changeType,
			},
		});

		console.log(
			`Notification sent to event creator (${approval.requestedByAccountId}) for ${decision} decision`,
		);
	} catch (error) {
		// Log error but don't throw - notification failure shouldn't break approval process
		console.error("Failed to send approval decision notification:", error);
	}
};

export const decideCalendarApprovalRequest = async ({
	approvalId,
	decision,
	approverAccountId,
	approverUserId,
	reviewerNotes,
}: {
	approvalId: string;
	decision: Extract<
		CalendarApprovalStatus,
		"approved" | "rejected" | "changes_requested"
	>;
	approverAccountId: string;
	approverUserId?: string;
	reviewerNotes?: string;
}): Promise<CalendarApprovalRequest | null> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getApprovalsCollectionId();

	const approval = await getCalendarApprovalById(approvalId);

	if (!approval) {
		throw new Error("Approval request not found");
	}

	// Simplified flow: All decisions are final states
	// 'changes_requested' is now a final state (not pending)
	const updateData: Record<string, unknown> = {
		status: decision,
		decidedAt: new Date().toISOString(),
		approverAccountId,
	};

	// Handle reviewerNotes: save trimmed value if provided, otherwise set to null
	// Appwrite requires explicit null for clearing fields, undefined is ignored
	if (reviewerNotes?.trim()) {
		const trimmedNotes = reviewerNotes.trim();
		updateData.reviewerNotes = trimmedNotes;
	} else {
		// Explicitly set to null if not provided or empty
		updateData.reviewerNotes = null;
		console.log(
			"[decideCalendarApprovalRequest] Setting reviewerNotes to null:",
			{
				reviewerNotes,
				isUndefined: reviewerNotes === undefined,
				isNull: reviewerNotes === null,
				trimmed: reviewerNotes?.trim(),
			},
		);
	}

	if (approverUserId) {
		updateData.approverUserId = approverUserId;
	}

	const updated = await tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		rowId: approvalId,
		data: updateData,
	});

	// Convert to plain object to ensure serialization (remove Appwrite client instances)
	const raw = updated as unknown as Record<string, unknown>;

	// Parse changeSummary from JSON string to object and deeply serialize
	let changeSummary: CalendarApprovalChangeSummary = {
		before: null,
		after: null,
	};
	if (typeof raw.changeSummary === "string") {
		try {
			const parsed = JSON.parse(raw.changeSummary);
			changeSummary = JSON.parse(JSON.stringify(parsed));
		} catch (error) {
			console.error("Error parsing changeSummary:", error);
			changeSummary = { before: null, after: null };
		}
	} else if (raw.changeSummary && typeof raw.changeSummary === "object") {
		try {
			changeSummary = JSON.parse(JSON.stringify(raw.changeSummary));
		} catch (error) {
			console.error("Error serializing changeSummary:", error);
			changeSummary = { before: null, after: null };
		}
	}

	// Build serialized result object
	const serializedResult = {
		$id: String(raw.$id || ""),
		eventId: String(raw.eventId || ""),
		changeType: raw.changeType as CalendarApprovalChangeType,
		requestedByAccountId: String(raw.requestedByAccountId || ""),
		requestedByUserId: raw.requestedByUserId
			? String(raw.requestedByUserId)
			: undefined,
		status: raw.status as CalendarApprovalStatus,
		submittedAt: String(raw.submittedAt || ""),
		decidedAt: raw.decidedAt ? String(raw.decidedAt) : undefined,
		approverAccountId: raw.approverAccountId
			? String(raw.approverAccountId)
			: undefined,
		approverUserId: raw.approverUserId ? String(raw.approverUserId) : undefined,
		reviewerNotes: (() => {
			if (raw.reviewerNotes === null || raw.reviewerNotes === undefined) {
				console.log(
					"[getLatestApprovalRequestByEventId] reviewerNotes is null/undefined",
				);
				return undefined;
			}
			const notesStr = String(raw.reviewerNotes).trim();
			const result = notesStr || undefined;
			console.log(
				"[getLatestApprovalRequestByEventId] Processed reviewerNotes:",
				{
					original: raw.reviewerNotes,
					trimmed: notesStr,
					result,
					hasValue: !!result,
				},
			);
			return result;
		})(),
		changeSummary,
		sensitivityLevel: raw.sensitivityLevel as CalendarSensitivity,
	};

	// Final deep serialization to ensure no client instances
	const result = JSON.parse(
		JSON.stringify(serializedResult),
	) as CalendarApprovalRequest;

	if (decision === "approved") {
		if (approval.changeType === "create") {
			await finalizeCreateApproval(
				approval,
				approverAccountId,
				approverUserId,
				reviewerNotes,
			);
		} else if (approval.changeType === "cancel") {
			await finalizeCancelApproval(
				approval,
				approverAccountId,
				approverUserId,
				reviewerNotes,
			);
		}
	} else if (decision === "rejected") {
		await updateCalendarEvent(approval.eventId, {
			approvalStatus: "rejected",
			requiresApproval: false,
			pendingApprovalId: null,
		});

		// Send notification to event creator
		const event = await getCalendarEventById(approval.eventId);
		const eventTitle = event?.title || "Unknown Event";
		let approverName: string | undefined;
		try {
			const approver = await getUserByAccountId(approverAccountId);
			approverName = approver?.fullName;
		} catch (_error) {
			// Ignore error - approver name is optional
		}
		await sendApprovalDecisionNotification(
			approval,
			"rejected",
			eventTitle,
			reviewerNotes,
			approverName,
		);
	} else if (decision === "changes_requested") {
		// Set event status to 'changes_requested' and clear pendingApprovalId
		// When user resubmits, a new approval request will be created
		await updateCalendarEvent(approval.eventId, {
			approvalStatus: "changes_requested",
			pendingApprovalId: null, // Clear so new approval can be created on resubmission
		});

		// Send notification to event creator
		const event = await getCalendarEventById(approval.eventId);
		const eventTitle = event?.title || "Unknown Event";
		let approverName: string | undefined;
		try {
			const approver = await getUserByAccountId(approverAccountId);
			approverName = approver?.fullName;
		} catch (_error) {
			// Ignore error - approver name is optional
		}
		await sendApprovalDecisionNotification(
			approval,
			"changes_requested",
			eventTitle,
			reviewerNotes,
			approverName,
		);
	}

	return result;
};
