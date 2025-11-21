import { createAdminClient } from '@/lib/appwrite';
import { ID, Query } from 'node-appwrite';
import { appwriteConfig } from '../appwrite/config';

/**
 * Shared Calendar and Delegation Actions
 * Priority 2: Shared calendars and delegation so assistants and teams can manage events collaboratively
 */

export interface SharedCalendar {
  $id: string;
  name: string;
  description?: string;
  ownerId: string; // User ID of the calendar owner
  ownerAccountId: string; // Account ID of the calendar owner
  organizationId: string;
  isTeamCalendar: boolean;
  teamId?: string; // Optional team ID if this is a team calendar
  color?: string; // Calendar color for UI display
  isPublic: boolean; // Whether calendar is visible to all organization members
  sharedWith?: string[]; // Array of user IDs who have access to this calendar
  createdAt: string;
  updatedAt: string;
}

export interface CalendarDelegation {
  $id: string;
  calendarId: string;
  delegatorId: string; // User ID who is delegating
  delegateId: string; // User ID who receives delegation
  permissions: CalendarDelegationPermission[];
  canCreateEvents: boolean;
  canEditEvents: boolean;
  canDeleteEvents: boolean;
  canManageParticipants: boolean;
  canViewSensitiveDetails: boolean;
  startDate?: string; // Optional: delegation start date
  endDate?: string; // Optional: delegation end date
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CalendarDelegationPermission =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'manage_participants'
  | 'view_sensitive';

export interface CreateSharedCalendarData {
  name: string;
  description?: string;
  ownerId: string;
  ownerAccountId: string;
  organizationId: string;
  isTeamCalendar?: boolean;
  teamId?: string;
  color?: string;
  isPublic?: boolean;
  sharedWith?: string[]; // Array of user IDs to share with
}

export interface CreateDelegationData {
  calendarId: string;
  delegatorId: string;
  delegateId: string;
  permissions: CalendarDelegationPermission[];
  canCreateEvents?: boolean;
  canEditEvents?: boolean;
  canDeleteEvents?: boolean;
  canManageParticipants?: boolean;
  canViewSensitiveDetails?: boolean;
  startDate?: string;
  endDate?: string;
}

const getSharedCalendarsCollectionId = (): string => {
  const collectionId =
    process.env.NEXT_PUBLIC_APPWRITE_SHARED_CALENDARS_COLLECTION ||
    'shared_calendars';
  if (!collectionId) {
    throw new Error('Shared calendars collection ID not configured');
  }
  return collectionId;
};

const getCalendarDelegationsCollectionId = (): string => {
  const collectionId =
    process.env.NEXT_PUBLIC_APPWRITE_CALENDAR_DELEGATIONS_COLLECTION ||
    'calendar_delegations';
  if (!collectionId) {
    throw new Error('Calendar delegations collection ID not configured');
  }
  return collectionId;
};

/**
 * Create a shared calendar
 */
export const createSharedCalendar = async (
  data: CreateSharedCalendarData
): Promise<SharedCalendar> => {
  try {
    const { tablesDB } = await createAdminClient();
    const collectionId = getSharedCalendarsCollectionId();

    if (!appwriteConfig.databaseId) {
      throw new Error(
        'Database ID is not configured. Please set NEXT_PUBLIC_APPWRITE_DATABASE environment variable.'
      );
    }

    if (!collectionId) {
      throw new Error(
        'Shared calendars collection ID is not configured. Please set NEXT_PUBLIC_APPWRITE_SHARED_CALENDARS_COLLECTION environment variable.'
      );
    }

    const calendarId = ID.unique();

    const response = await tablesDB.createRow({
      databaseId: appwriteConfig.databaseId,
      tableId: collectionId,
      rowId: calendarId,
      data: {
        name: data.name,
        description: data.description || null,
        ownerId: data.ownerId,
        ownerAccountId: data.ownerAccountId,
        organizationId: data.organizationId,
        isTeamCalendar: data.isTeamCalendar || false,
        teamId: data.teamId || null,
        color: data.color || null,
        isPublic: data.isPublic || false,
        sharedWith: data.sharedWith || [], // Store as array directly
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    // Ensure sharedWith is an array (handle legacy JSON strings if any)
    const calendar = response as any;
    if (calendar.sharedWith) {
      if (typeof calendar.sharedWith === 'string') {
        try {
          calendar.sharedWith = JSON.parse(calendar.sharedWith);
        } catch {
          calendar.sharedWith = [];
        }
      } else if (!Array.isArray(calendar.sharedWith)) {
        calendar.sharedWith = [];
      }
    } else {
      calendar.sharedWith = [];
    }

    return calendar as unknown as SharedCalendar;
  } catch (error: any) {
    console.error('[SERVER] createSharedCalendar] Error:', error);

    // Provide more helpful error messages
    if (
      error?.message?.includes('Table with the requested ID could not be found')
    ) {
      throw new Error(
        `Shared calendars table "${getSharedCalendarsCollectionId()}" not found in Appwrite. ` +
          `Please create the table in your Appwrite database or set the correct collection ID in ` +
          `NEXT_PUBLIC_APPWRITE_SHARED_CALENDARS_COLLECTION environment variable.`
      );
    }

    if (
      error?.message?.includes(
        'Database with the requested ID could not be found'
      )
    ) {
      throw new Error(
        `Database "${appwriteConfig.databaseId}" not found. ` +
          `Please verify NEXT_PUBLIC_APPWRITE_DATABASE environment variable is set correctly.`
      );
    }

    throw error;
  }
};

/**
 * Get shared calendars for a user
 */
export const getSharedCalendarsForUser = async (
  userId: string,
  organizationId: string
): Promise<SharedCalendar[]> => {
  const { tablesDB } = await createAdminClient();
  const collectionId = getSharedCalendarsCollectionId();

  // Get calendars where user is owner, or calendars that are public/team calendars, or calendars shared with user
  const [ownedCalendars, publicCalendars, teamCalendars, allOrgCalendars] =
    await Promise.all([
      tablesDB.listRows({
        databaseId: appwriteConfig.databaseId!,
        tableId: collectionId,
        queries: [
          Query.equal('ownerId', userId),
          Query.equal('organizationId', organizationId),
        ],
      }),
      tablesDB.listRows({
        databaseId: appwriteConfig.databaseId!,
        tableId: collectionId,
        queries: [
          Query.equal('isPublic', true),
          Query.equal('organizationId', organizationId),
        ],
      }),
      tablesDB.listRows({
        databaseId: appwriteConfig.databaseId!,
        tableId: collectionId,
        queries: [
          Query.equal('isTeamCalendar', true),
          Query.equal('organizationId', organizationId),
        ],
      }),
      // Get all calendars in the organization to check sharedWith field
      tablesDB.listRows({
        databaseId: appwriteConfig.databaseId!,
        tableId: collectionId,
        queries: [Query.equal('organizationId', organizationId)],
      }),
    ]);

  // Filter calendars shared with this user
  const sharedCalendars = allOrgCalendars.rows.filter((cal: any) => {
    if (cal.ownerId === userId) return false; // Already in ownedCalendars

    // Handle both array format (new) and JSON string format (legacy)
    let sharedWith: string[] = [];
    if (cal.sharedWith) {
      if (Array.isArray(cal.sharedWith)) {
        sharedWith = cal.sharedWith;
      } else if (typeof cal.sharedWith === 'string') {
        try {
          sharedWith = JSON.parse(cal.sharedWith);
        } catch {
          sharedWith = [];
        }
      }
    }

    return Array.isArray(sharedWith) && sharedWith.includes(userId);
  });

  // Combine and deduplicate
  const allCalendars = [
    ...ownedCalendars.rows,
    ...publicCalendars.rows,
    ...teamCalendars.rows,
    ...sharedCalendars,
  ];
  const uniqueCalendars = Array.from(
    new Map(allCalendars.map((cal) => [cal.$id, cal])).values()
  );

  // Ensure sharedWith is an array for each calendar (handle both array and JSON string formats)
  return uniqueCalendars.map((cal: any) => {
    if (cal.sharedWith) {
      if (Array.isArray(cal.sharedWith)) {
        // Already an array, use it as is
        cal.sharedWith = cal.sharedWith;
      } else if (typeof cal.sharedWith === 'string') {
        // Legacy JSON string format, parse it
        try {
          cal.sharedWith = JSON.parse(cal.sharedWith);
        } catch {
          cal.sharedWith = [];
        }
      } else {
        cal.sharedWith = [];
      }
    } else {
      cal.sharedWith = [];
    }
    return cal;
  }) as unknown as SharedCalendar[];
};

/**
 * Get a shared calendar by ID
 */
export const getSharedCalendarById = async (
  calendarId: string
): Promise<SharedCalendar | null> => {
  try {
    const { tablesDB } = await createAdminClient();
    const collectionId = getSharedCalendarsCollectionId();

    const response = await tablesDB.getRow(
      appwriteConfig.databaseId!,
      collectionId,
      calendarId
    );

    // Ensure sharedWith is an array (handle both array and JSON string formats)
    const calendar = response as any;
    if (calendar.sharedWith) {
      if (Array.isArray(calendar.sharedWith)) {
        // Already an array, use it as is
        calendar.sharedWith = calendar.sharedWith;
      } else if (typeof calendar.sharedWith === 'string') {
        // Legacy JSON string format, parse it
        try {
          calendar.sharedWith = JSON.parse(calendar.sharedWith);
        } catch {
          calendar.sharedWith = [];
        }
      } else {
        calendar.sharedWith = [];
      }
    } else {
      calendar.sharedWith = [];
    }

    return calendar as unknown as SharedCalendar;
  } catch (error) {
    console.error('[SERVER] getSharedCalendarById] Error:', error);
    return null;
  }
};

/**
 * Update shared calendar (e.g., to add/remove shared users)
 */
export const updateSharedCalendar = async (
  calendarId: string,
  updates: {
    name?: string;
    description?: string;
    color?: string;
    isPublic?: boolean;
    isTeamCalendar?: boolean;
    teamId?: string;
    sharedWith?: string[];
  }
): Promise<SharedCalendar> => {
  const { tablesDB } = await createAdminClient();
  const collectionId = getSharedCalendarsCollectionId();

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined)
    updateData.description = updates.description || null;
  if (updates.color !== undefined) updateData.color = updates.color || null;
  if (updates.isPublic !== undefined) updateData.isPublic = updates.isPublic;
  if (updates.isTeamCalendar !== undefined)
    updateData.isTeamCalendar = updates.isTeamCalendar;
  if (updates.teamId !== undefined) updateData.teamId = updates.teamId || null;

  // Pass sharedWith array directly (Appwrite Tables supports arrays)
  if (updates.sharedWith !== undefined) {
    updateData.sharedWith = updates.sharedWith;
  }

  const response = await tablesDB.updateRow({
    databaseId: appwriteConfig.databaseId!,
    tableId: collectionId,
    rowId: calendarId,
    data: updateData,
  });

  // Ensure sharedWith is an array (handle legacy JSON strings if any)
  const calendar = response as any;
  if (calendar.sharedWith) {
    if (typeof calendar.sharedWith === 'string') {
      try {
        calendar.sharedWith = JSON.parse(calendar.sharedWith);
      } catch {
        calendar.sharedWith = [];
      }
    } else if (!Array.isArray(calendar.sharedWith)) {
      calendar.sharedWith = [];
    }
  } else {
    calendar.sharedWith = [];
  }

  return calendar as unknown as SharedCalendar;
};

/**
 * Add user to shared calendar
 */
export const addUserToSharedCalendar = async (
  calendarId: string,
  userId: string
): Promise<SharedCalendar> => {
  const calendar = await getSharedCalendarById(calendarId);
  if (!calendar) {
    throw new Error('Shared calendar not found');
  }

  const currentSharedWith = calendar.sharedWith || [];
  if (currentSharedWith.includes(userId)) {
    return calendar; // User already has access
  }

  return updateSharedCalendar(calendarId, {
    sharedWith: [...currentSharedWith, userId],
  });
};

/**
 * Remove user from shared calendar
 */
export const removeUserFromSharedCalendar = async (
  calendarId: string,
  userId: string
): Promise<SharedCalendar> => {
  const calendar = await getSharedCalendarById(calendarId);
  if (!calendar) {
    throw new Error('Shared calendar not found');
  }

  const currentSharedWith = calendar.sharedWith || [];
  return updateSharedCalendar(calendarId, {
    sharedWith: currentSharedWith.filter((id) => id !== userId),
  });
};

/**
 * Create a calendar delegation
 */
export const createCalendarDelegation = async (
  data: CreateDelegationData
): Promise<CalendarDelegation> => {
  const { tablesDB } = await createAdminClient();
  const collectionId = getCalendarDelegationsCollectionId();

  const delegationId = ID.unique();

  const response = await tablesDB.createRow({
    databaseId: appwriteConfig.databaseId!,
    tableId: collectionId,
    rowId: delegationId,
    data: {
      calendarId: data.calendarId,
      delegatorId: data.delegatorId,
      delegateId: data.delegateId,
      permissions: JSON.stringify(data.permissions),
      canCreateEvents: data.canCreateEvents || false,
      canEditEvents: data.canEditEvents || false,
      canDeleteEvents: data.canDeleteEvents || false,
      canManageParticipants: data.canManageParticipants || false,
      canViewSensitiveDetails: data.canViewSensitiveDetails || false,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });

  // Parse permissions back from JSON
  const result = response as unknown as Record<string, unknown>;
  if (typeof result.permissions === 'string') {
    try {
      result.permissions = JSON.parse(result.permissions);
    } catch (error) {
      console.error(
        '[SERVER] createCalendarDelegation] Error parsing permissions:',
        error
      );
    }
  }

  return result as unknown as CalendarDelegation;
};

/**
 * Get active delegations for a user
 */
export const getActiveDelegationsForUser = async (
  delegateId: string
): Promise<CalendarDelegation[]> => {
  const { tablesDB } = await createAdminClient();
  const collectionId = getCalendarDelegationsCollectionId();

  const now = new Date().toISOString();

  const response = await tablesDB.listRows({
    databaseId: appwriteConfig.databaseId!,
    tableId: collectionId,
    queries: [
      Query.equal('delegateId', delegateId),
      Query.equal('isActive', true),
      Query.or([
        Query.isNull('startDate'),
        Query.lessThanEqual('startDate', now),
      ]),
      Query.or([
        Query.isNull('endDate'),
        Query.greaterThanEqual('endDate', now),
      ]),
    ],
  });

  // Parse permissions from JSON
  const delegations = response.rows.map((row) => {
    const delegation = row as unknown as Record<string, unknown>;
    if (typeof delegation.permissions === 'string') {
      try {
        delegation.permissions = JSON.parse(delegation.permissions);
      } catch (error) {
        console.error(
          '[SERVER] getActiveDelegationsForUser] Error parsing permissions:',
          error
        );
        delegation.permissions = [];
      }
    }
    return delegation;
  });

  return delegations as unknown as CalendarDelegation[];
};

/**
 * Check if a user has delegation permissions for a calendar
 */
export const checkDelegationPermissions = async (
  userId: string,
  calendarId: string
): Promise<CalendarDelegation | null> => {
  const delegations = await getActiveDelegationsForUser(userId);
  return delegations.find((d) => d.calendarId === calendarId) || null;
};
