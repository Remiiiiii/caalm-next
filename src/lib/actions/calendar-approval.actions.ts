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
    throw new Error('Calendar approval requests collection ID is not configured');
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

  const response = await tablesDB.createRow(
    appwriteConfig.databaseId!,
    collectionId,
    approvalId,
    {
      eventId,
      changeType,
      requestedByAccountId,
      requestedByUserId,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      changeSummary,
      sensitivityLevel,
    }
  );

  return response as unknown as CalendarApprovalRequest;
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

  return response.rows as unknown as CalendarApprovalRequest[];
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

    return response as unknown as CalendarApprovalRequest;
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

  await logAuditEvent({
    event_id: approval.eventId,
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
  await deleteCalendarEvent(approval.eventId, approverAccountId);

  await logAuditEvent({
    event_id: approval.eventId,
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

  const updated = await tablesDB.updateRow({
    databaseId: appwriteConfig.databaseId!,
    tableId: collectionId,
    rowId: approvalId,
    data: {
      status: decision,
      decidedAt: new Date().toISOString(),
      approverAccountId,
      approverUserId,
      reviewerNotes,
    },
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
  } else if (decision === 'changes_requested') {
    await updateCalendarEvent(approval.eventId, {
      approvalStatus: 'changes_requested',
    });
  }

  return updated as unknown as CalendarApprovalRequest;
};


