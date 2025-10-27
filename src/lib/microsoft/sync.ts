import { GraphEvent } from './graph-client';
import {
  CalendarEvent,
  CreateCalendarEventData,
} from '@/lib/actions/calendar.actions';
import { format, parseISO, isValid } from 'date-fns';

export interface SyncResult {
  success: boolean;
  syncedEvents: number;
  conflicts: SyncConflict[];
  errors: SyncError[];
}

export interface SyncConflict {
  caalmEvent: CalendarEvent;
  outlookEvent: GraphEvent;
  conflictType: 'time' | 'content' | 'deletion';
  resolution: 'caalm' | 'outlook' | 'manual';
}

export interface SyncError {
  eventId: string;
  error: string;
  operation: 'create' | 'update' | 'delete' | 'sync';
}

/**
 * Convert Microsoft Graph event to CAALM calendar event format
 */
export function graphEventToCaalm(
  graphEvent: GraphEvent
): CreateCalendarEventData {
  // Validate required fields
  if (!graphEvent.start?.dateTime) {
    throw new Error('Graph event missing start date');
  }
  if (!graphEvent.end?.dateTime) {
    throw new Error('Graph event missing end date');
  }
  if (!graphEvent.subject) {
    throw new Error('Graph event missing subject');
  }

  let startDate: Date;
  let endDate: Date;

  try {
    startDate = parseISO(graphEvent.start.dateTime);
    if (!isValid(startDate)) {
      throw new Error('Invalid start date format');
    }

    // parseISO handles timezone conversion, but we need to ensure
    // the date is displayed in the user's local timezone
    // The date-fns format function will automatically use local timezone
  } catch (error) {
    console.error('Invalid Graph event start date:', graphEvent.start.dateTime);
    throw new Error('Invalid start date format');
  }

  try {
    endDate = parseISO(graphEvent.end.dateTime);
    if (!isValid(endDate)) {
      throw new Error('Invalid end date format');
    }

    // parseISO handles timezone conversion, but we need to ensure
    // the date is displayed in the user's local timezone
    // The date-fns format function will automatically use local timezone
  } catch (error) {
    console.error('Invalid Graph event end date:', graphEvent.end.dateTime);
    throw new Error('Invalid end date format');
  }

  // Ensure end date is after start date
  if (endDate <= startDate) {
    throw new Error('End date must be after start date');
  }

  console.log('Converting Graph event to CAALM:', {
    subject: graphEvent.subject,
    startDateTime: graphEvent.start.dateTime,
    parsedStartDate: startDate.toISOString(),
    timezone: graphEvent.start.timeZone,
  });

  // Determine event type based on categories or subject
  let eventType: 'contract' | 'deadline' | 'meeting' | 'review' | 'audit' =
    'meeting';

  if (graphEvent.categories?.includes('contract')) {
    eventType = 'contract';
  } else if (graphEvent.categories?.includes('deadline')) {
    eventType = 'deadline';
  } else if (graphEvent.categories?.includes('review')) {
    eventType = 'review';
  } else if (graphEvent.categories?.includes('audit')) {
    eventType = 'audit';
  } else if (graphEvent.subject.toLowerCase().includes('meeting')) {
    eventType = 'meeting';
  }

  // Extract contract information from subject or body
  const contractMatch = graphEvent.subject.match(/contract[:\s]+([^-\n]+)/i);
  const amountMatch = graphEvent.body?.content?.match(/\$[\d,]+\.?\d*/);

  // Format start and end times for CAALM (preserve original timezone)
  // Extract time components from the original datetime strings to avoid timezone conversion
  const startTime =
    graphEvent.start.dateTime.split('T')[1]?.split(':').slice(0, 2).join(':') ||
    '00:00';
  const endTime =
    graphEvent.end.dateTime.split('T')[1]?.split(':').slice(0, 2).join(':') ||
    '00:00';

  // CRITICAL FIX: Use UTC date to prevent day shifts due to timezone conversion
  // Extract date components in UTC to ensure we get the correct day
  const startDateUTC = new Date(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate()
  );
  const dateOnly = format(startDateUTC, 'yyyy-MM-dd');

  console.log('Converted event details:', {
    title: graphEvent.subject,
    originalStart: graphEvent.start.dateTime,
    originalEnd: graphEvent.end.dateTime,
    parsedStartDate: startDate.toISOString(),
    parsedEndDate: endDate.toISOString(),
    convertedDate: dateOnly,
    startTime,
    endTime,
    timezone: graphEvent.start.timeZone,
    attendees: graphEvent.attendees?.length || 0,
    attendeeDetails: graphEvent.attendees?.map((a) => ({
      name: a.emailAddress.name,
      email: a.emailAddress.address,
    })),
  });

  return {
    title: graphEvent.subject,
    startDate: dateOnly, // Use date-only format (YYYY-MM-DD) for CAALM
    type: eventType,
    description: graphEvent.body?.content || '',
    startTime,
    endTime,
    contractName: contractMatch ? contractMatch[1].trim() : undefined,
    amount: amountMatch ? amountMatch[0] : undefined,
    participants: graphEvent.attendees
      ?.map((a) => `${a.emailAddress.name} (${a.emailAddress.address})`)
      .join(', '),
    createdBy: 'outlook-sync', // Special identifier for synced events
  };
}

/**
 * Convert CAALM calendar event to Microsoft Graph event format
 */
export function caalmEventToGraph(
  caalmEvent: CalendarEvent
): Omit<GraphEvent, 'id'> {
  // Ensure we have a valid date
  let startDate: Date;
  try {
    // Handle both ISO format and date-only format
    if (caalmEvent.startDate.includes('T')) {
      // ISO format
      startDate = new Date(caalmEvent.startDate);
    } else {
      // Date-only format (YYYY-MM-DD) - add time component
      const dateStr = caalmEvent.startDate;
      const timeStr = caalmEvent.startTime || '00:00';
      startDate = new Date(`${dateStr}T${timeStr}:00`);
    }

    if (isNaN(startDate.getTime())) {
      throw new Error('Invalid date');
    }
  } catch (error) {
    console.error('Invalid CAALM event date:', caalmEvent.startDate);
    startDate = new Date(); // Fallback to current date
  }

  // Calculate end date with better validation
  let endDate: Date;
  if (caalmEvent.endTime) {
    try {
      // Use endDate if available, otherwise use startDate
      const dateStr = caalmEvent.endDate
        ? caalmEvent.endDate.includes('T')
          ? caalmEvent.endDate.split('T')[0]
          : caalmEvent.endDate
        : caalmEvent.startDate.includes('T')
        ? caalmEvent.startDate.split('T')[0]
        : caalmEvent.startDate;

      if (!dateStr || dateStr.length !== 10) {
        throw new Error('Invalid date format');
      }

      // Validate end time format (HH:mm)
      const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timePattern.test(caalmEvent.endTime)) {
        throw new Error('Invalid time format');
      }

      endDate = new Date(`${dateStr}T${caalmEvent.endTime}:00`);
      if (isNaN(endDate.getTime())) {
        throw new Error('Invalid end time');
      }

      // Ensure end time is after start time
      if (endDate <= startDate) {
        throw new Error('End time must be after start time');
      }
    } catch (error) {
      console.error('Invalid CAALM event end time:', caalmEvent.endTime, error);
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour
    }
  } else {
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour duration
  }

  // Map CAALM event types to Graph categories
  const categoryMap: Record<string, string[]> = {
    contract: ['contract', 'business'],
    deadline: ['deadline', 'urgent'],
    meeting: ['meeting'],
    review: ['review', 'process'],
    audit: ['audit', 'compliance'],
  };

  const categories = categoryMap[caalmEvent.type] || ['meeting'];

  // Build subject with contract info if available
  let subject = caalmEvent.title;
  if (caalmEvent.contractName) {
    subject = `Contract: ${caalmEvent.contractName} - ${caalmEvent.title}`;
  }

  // Build body content
  let bodyContent = caalmEvent.description || '';
  if (caalmEvent.amount) {
    bodyContent += `\n\nAmount: ${caalmEvent.amount}`;
  }
  if (caalmEvent.participants) {
    bodyContent += `\n\nParticipants: ${caalmEvent.participants}`;
  }

  // Validate the event data before returning
  if (!subject || subject.trim().length === 0) {
    throw new Error('Event subject cannot be empty');
  }

  if (!startDate || isNaN(startDate.getTime())) {
    throw new Error('Invalid start date');
  }

  if (!endDate || isNaN(endDate.getTime())) {
    throw new Error('Invalid end date');
  }

  if (endDate <= startDate) {
    throw new Error('End date must be after start date');
  }

  // Additional validation for Microsoft Graph API compatibility
  if (subject.length > 255) {
    throw new Error('Event subject is too long (max 255 characters)');
  }

  if (bodyContent && bodyContent.length > 10000) {
    throw new Error('Event body is too long (max 10000 characters)');
  }

  // Ensure dates are not too far in the past or future
  const now = new Date();
  const oneYearAgo = new Date(
    now.getFullYear() - 1,
    now.getMonth(),
    now.getDate()
  );
  const oneYearFromNow = new Date(
    now.getFullYear() + 1,
    now.getMonth(),
    now.getDate()
  );

  if (startDate < oneYearAgo || startDate > oneYearFromNow) {
    throw new Error(
      'Event date is outside acceptable range (1 year ago to 1 year from now)'
    );
  }

  // Ensure proper timezone handling for Microsoft Graph
  const timeZone = 'America/New_York'; // Use a consistent timezone

  // Format dates properly for Microsoft Graph API
  const formatDateTime = (date: Date): string => {
    // Microsoft Graph expects ISO 8601 format
    return date.toISOString();
  };

  return {
    subject: subject.trim(),
    start: {
      dateTime: formatDateTime(startDate),
      timeZone: timeZone,
    },
    end: {
      dateTime: formatDateTime(endDate),
      timeZone: timeZone,
    },
    body: {
      content: bodyContent || 'No description',
      contentType: 'text',
    },
    categories,
    showAs: 'busy',
    importance: caalmEvent.type === 'deadline' ? 'high' : 'normal',
  };
}

/**
 * Compare two events to detect conflicts
 */
export function detectConflict(
  caalmEvent: CalendarEvent,
  outlookEvent: GraphEvent
): SyncConflict | null {
  const caalmStart = new Date(caalmEvent.startDate);
  const outlookStart = parseISO(outlookEvent.start.dateTime);

  // Time conflict: events overlap significantly
  const timeDiff = Math.abs(caalmStart.getTime() - outlookStart.getTime());
  const timeConflict = timeDiff < 30 * 60 * 1000; // Within 30 minutes

  // Content conflict: similar titles but different content
  const titleSimilarity = calculateSimilarity(
    caalmEvent.title,
    outlookEvent.subject
  );
  const contentConflict =
    titleSimilarity > 0.7 &&
    caalmEvent.description !== outlookEvent.body?.content;

  if (timeConflict || contentConflict) {
    return {
      caalmEvent,
      outlookEvent,
      conflictType: timeConflict ? 'time' : 'content',
      resolution: 'manual', // Default to manual resolution
    };
  }

  return null;
}

/**
 * Calculate string similarity (simple implementation)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Resolve sync conflicts based on strategy
 */
export function resolveConflict(
  conflict: SyncConflict,
  strategy: 'caalm' | 'outlook' | 'newest' | 'manual'
): { resolved: boolean; event: CalendarEvent | GraphEvent | null } {
  switch (strategy) {
    case 'caalm':
      return { resolved: true, event: conflict.caalmEvent };

    case 'outlook':
      return { resolved: true, event: conflict.outlookEvent };

    case 'newest':
      const caalmTime = new Date(
        conflict.caalmEvent.$createdAt || conflict.caalmEvent.startDate
      );
      const outlookTime = new Date(
        conflict.outlookEvent.lastModifiedDateTime ||
          conflict.outlookEvent.createdDateTime ||
          ''
      );
      return {
        resolved: true,
        event:
          caalmTime > outlookTime ? conflict.caalmEvent : conflict.outlookEvent,
      };

    case 'manual':
    default:
      return { resolved: false, event: null };
  }
}

/**
 * Generate unique identifier for events
 */
export function generateEventId(event: CalendarEvent | GraphEvent): string {
  if ('$id' in event) {
    return `caalm_${event.$id}`;
  } else if ('id' in event) {
    return `outlook_${event.id}`;
  }
  return `unknown_${Date.now()}`;
}

/**
 * Check if event is from Outlook (has outlook_id field)
 */
export function isOutlookEvent(event: CalendarEvent): boolean {
  return !!(event as any).outlook_id;
}

/**
 * Check if event is from CAALM (no outlook_id field)
 */
export function isCaalmEvent(event: CalendarEvent): boolean {
  return !isOutlookEvent(event);
}

/**
 * Create sync summary for user feedback
 */
export function createSyncSummary(result: SyncResult): string {
  const { syncedEvents, conflicts, errors } = result;

  let summary = `Sync completed: ${syncedEvents} events synchronized`;

  if (conflicts.length > 0) {
    summary += `, ${conflicts.length} conflicts detected`;
  }

  if (errors.length > 0) {
    summary += `, ${errors.length} errors occurred`;
  }

  return summary;
}

/**
 * Validate event data before sync
 */
export function validateEventForSync(event: CalendarEvent | GraphEvent): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if ('$id' in event) {
    // CAALM event validation
    if (!event.title?.trim()) {
      errors.push('Event title is required');
    }
    if (!event.startDate) {
      errors.push('Event start date is required');
    }
    if (!isValid(new Date(event.startDate))) {
      errors.push('Invalid event start date');
    }
  } else {
    // Graph event validation
    const graphEvent = event as GraphEvent;
    if (!graphEvent.subject?.trim()) {
      errors.push('Event subject is required');
    }
    if (!graphEvent.start?.dateTime) {
      errors.push('Event start time is required');
    }
    if (!isValid(parseISO(graphEvent.start.dateTime))) {
      errors.push('Invalid event start time');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
