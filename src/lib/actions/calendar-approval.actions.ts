import { ID, Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import {
  CalendarApprovalStatus,
  CalendarSensitivity,
  UserRole,
} from '@/constants/rbac';
import {
  CalendarEvent,
  deleteCalendarEvent,
  getCalendarEventById,
  updateCalendarEvent,
} from './calendar.actions';
import { logAuditEvent } from '@/lib/services/audit-logger';
import { notificationService } from '@/lib/services/notificationService';
import { getUserByAccountId } from './user.actions';

export type CalendarApprovalChangeType = 'create' | 'update' | 'cancel';

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
      'Calendar approval requests collection ID is not configured'
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
      status: 'pending',
      submittedAt: new Date().toISOString(),
      changeSummary: changeSummaryJson,
      sensitivityLevel,
    },
  });

  // Parse changeSummary back to object for return value
  const result = response as unknown as Record<string, unknown>;
  if (typeof result.changeSummary === 'string') {
    try {
      result.changeSummary = JSON.parse(result.changeSummary);
    } catch (error) {
      console.error('Error parsing changeSummary:', error);
    }
  }

  return result as unknown as CalendarApprovalRequest;
};

/**
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
    status: 'pending', // Ensure status remains pending for resubmission
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
  if (typeof result.changeSummary === 'string') {
    try {
      result.changeSummary = JSON.parse(result.changeSummary);
    } catch (error) {
      console.error('Error parsing changeSummary:', error);
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
    queries.push(Query.equal('status', status));
  }

  const response = await tablesDB.listRows({
    databaseId: appwriteConfig.databaseId!,
    tableId: collectionId,
    queries,
  });

  // Parse changeSummary from JSON string to object for each row
  return response.rows.map((row: unknown) => {
    const record = row as Record<string, unknown>;
    if (typeof record.changeSummary === 'string') {
      try {
        record.changeSummary = JSON.parse(record.changeSummary);
      } catch (error) {
        console.error('Error parsing changeSummary:', error);
        record.changeSummary = { before: null, after: null };
      }
    }
    return record as unknown as CalendarApprovalRequest;
  });
};

export const getCalendarApprovalById = async (
  approvalId: string
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
    
    // Parse changeSummary from JSON string to object
    let changeSummary: CalendarApprovalChangeSummary = { before: null, after: null };
    if (typeof raw.changeSummary === 'string') {
      try {
        changeSummary = JSON.parse(raw.changeSummary);
      } catch (error) {
        console.error('Error parsing changeSummary:', error);
        changeSummary = { before: null, after: null };
      }
    } else if (raw.changeSummary && typeof raw.changeSummary === 'object') {
      changeSummary = raw.changeSummary as CalendarApprovalChangeSummary;
    }

    // Return plain object with only serializable fields
    return {
      $id: String(raw.$id || ''),
      eventId: String(raw.eventId || ''),
      changeType: raw.changeType as CalendarApprovalChangeType,
      requestedByAccountId: String(raw.requestedByAccountId || ''),
      requestedByUserId: raw.requestedByUserId ? String(raw.requestedByUserId) : undefined,
      status: raw.status as CalendarApprovalStatus,
      submittedAt: String(raw.submittedAt || ''),
      decidedAt: raw.decidedAt ? String(raw.decidedAt) : undefined,
      approverAccountId: raw.approverAccountId ? String(raw.approverAccountId) : undefined,
      approverUserId: raw.approverUserId ? String(raw.approverUserId) : undefined,
      reviewerNotes: raw.reviewerNotes ? String(raw.reviewerNotes) : undefined,
      changeSummary,
      sensitivityLevel: raw.sensitivityLevel as CalendarSensitivity,
    };
  } catch (error) {
    console.error('Failed to get calendar approval by ID:', error);
    return null;
  }
};

const finalizeCreateApproval = async (
  approval: CalendarApprovalRequest,
  approverAccountId: string,
  approverUserId?: string,
  reviewerNotes?: string
) => {
  await updateCalendarEvent(approval.eventId, {
    approvalStatus: 'approved',
    requiresApproval: false,
    pendingApprovalId: null,
  });

  // Fetch event to get title for audit log
  const event = await getCalendarEventById(approval.eventId);
  const eventTitle = event?.title || 'Unknown Event';

  await logAuditEvent({
    event_id: approval.eventId,
    event_title: eventTitle,
    action: 'approval_decided',
    source: 'caalm',
    user_id: approverAccountId,
    user_name: 'Approver',
    user_email: '',
    status: 'success',
    metadata: {
      approvalId: approval.$id,
      changeType: approval.changeType,
      decision: 'approved',
      reviewerNotes,
      approverUserId,
    },
  });
};

const finalizeCancelApproval = async (
  approval: CalendarApprovalRequest,
  approverAccountId: string,
  approverUserId?: string,
  reviewerNotes?: string
) => {
  // Fetch event to get title for audit log before deletion
  const event = await getCalendarEventById(approval.eventId);
  const eventTitle = event?.title || 'Unknown Event';

  await deleteCalendarEvent(approval.eventId, approverAccountId);

  await logAuditEvent({
    event_id: approval.eventId,
    event_title: eventTitle,
    action: 'approval_decided',
    source: 'caalm',
    user_id: approverAccountId,
    user_name: 'Approver',
    user_email: '',
    status: 'success',
    metadata: {
      approvalId: approval.$id,
      changeType: approval.changeType,
      decision: 'approved',
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
  decision: 'changes_requested' | 'rejected',
  eventTitle: string,
  reviewerNotes?: string,
  approverName?: string
): Promise<void> => {
  try {
    const decisionLabels = {
      changes_requested: 'Changes Requested',
      rejected: 'Denied',
    };

    const priority = decision === 'rejected' ? 'high' : 'medium';

    // Build notification message
    let message = `Your event "${eventTitle}" has been ${decisionLabels[decision].toLowerCase()}.`;

    if (approverName) {
      message += `\n\nReviewed by: ${approverName}`;
    }

    if (reviewerNotes && reviewerNotes.trim()) {
      message += `\n\n${decision === 'changes_requested' ? 'Requested Changes' : 'Reason for Denial'}:`;
      message += `\n${reviewerNotes.trim()}`;
    }

    // Try to create notification with "calendar-approval" type
    // If it doesn't exist, fall back to a generic type
    let notificationType = 'calendar-approval';
    try {
      await notificationService.getNotificationType(notificationType);
    } catch (error) {
      // If calendar-approval type doesn't exist, try generic types
      try {
        await notificationService.getNotificationType('calendar');
        notificationType = 'calendar';
      } catch {
        // If neither exists, use a generic type that should exist
        notificationType = 'system';
      }
    }

    await notificationService.createNotification({
      userId: approval.requestedByAccountId,
      title: `Event Approval ${decisionLabels[decision]}`,
      message,
      type: notificationType,
      priority,
      actionUrl: '/calendar',
      actionText: 'View Calendar',
      metadata: {
        approvalId: approval.$id,
        eventId: approval.eventId,
        decision,
        reviewerNotes: reviewerNotes || undefined,
        changeType: approval.changeType,
      },
    });

    console.log(
      `Notification sent to event creator (${approval.requestedByAccountId}) for ${decision} decision`
    );
  } catch (error) {
    // Log error but don't throw - notification failure shouldn't break approval process
    console.error('Failed to send approval decision notification:', error);
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
    'approved' | 'rejected' | 'changes_requested'
  >;
  approverAccountId: string;
  approverUserId?: string;
  reviewerNotes?: string;
}): Promise<CalendarApprovalRequest | null> => {
  const { tablesDB } = await createAdminClient();
  const collectionId = getApprovalsCollectionId();

  const approval = await getCalendarApprovalById(approvalId);

  if (!approval) {
    throw new Error('Approval request not found');
  }

  // For 'changes_requested', keep status as 'pending' so it remains in the queue
  // The event's approvalStatus will be set to 'changes_requested' separately
  const approvalStatusToSet = decision === 'changes_requested' ? 'pending' : decision;

  // Build update data - only include fields that should be updated
  const updateData: Record<string, unknown> = {
    status: approvalStatusToSet,
    reviewerNotes,
  };

  // Only set decision-related fields if it's a final decision (approved/rejected)
  if (decision !== 'changes_requested') {
    updateData.decidedAt = new Date().toISOString();
    updateData.approverAccountId = approverAccountId;
    if (approverUserId) {
      updateData.approverUserId = approverUserId;
    }
  }

  const updated = await tablesDB.updateRow({
    databaseId: appwriteConfig.databaseId!,
    tableId: collectionId,
    rowId: approvalId,
    data: updateData,
  });

  if (decision === 'approved') {
    if (approval.changeType === 'create') {
      await finalizeCreateApproval(
        approval,
        approverAccountId,
        approverUserId,
        reviewerNotes
      );
    } else if (approval.changeType === 'cancel') {
      await finalizeCancelApproval(
        approval,
        approverAccountId,
        approverUserId,
        reviewerNotes
      );
    }
  } else if (decision === 'rejected') {
    await updateCalendarEvent(approval.eventId, {
      approvalStatus: 'rejected',
      requiresApproval: false,
      pendingApprovalId: null,
    });

    // Send notification to event creator
    const event = await getCalendarEventById(approval.eventId);
    const eventTitle = event?.title || 'Unknown Event';
    let approverName: string | undefined;
    try {
      const approver = await getUserByAccountId(approverAccountId);
      approverName = approver?.fullName || approver?.name;
    } catch (error) {
      // Ignore error - approver name is optional
    }
    await sendApprovalDecisionNotification(
      approval,
      'rejected',
      eventTitle,
      reviewerNotes,
      approverName
    );
  } else if (decision === 'changes_requested') {
    // Keep approval request status as 'pending' so it remains in the queue
    // Only update the event's approvalStatus to indicate changes are needed
    await updateCalendarEvent(approval.eventId, {
      approvalStatus: 'changes_requested',
    });

    // Note: We don't update the approval request status here - it stays 'pending'
    // so it remains visible in the pending approvals queue until approved or denied

    // Send notification to event creator
    const event = await getCalendarEventById(approval.eventId);
    const eventTitle = event?.title || 'Unknown Event';
    let approverName: string | undefined;
    try {
      const approver = await getUserByAccountId(approverAccountId);
      approverName = approver?.fullName || approver?.name;
    } catch (error) {
      // Ignore error - approver name is optional
    }
    await sendApprovalDecisionNotification(
      approval,
      'changes_requested',
      eventTitle,
      reviewerNotes,
      approverName
    );
  }

  return updated as unknown as CalendarApprovalRequest;
};
