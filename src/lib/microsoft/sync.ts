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
  operation: 'create' | 'update' | 'delete';
}

/**
 * Convert Microsoft Graph event to CAALM calendar event format
 */
export function graphEventToCaalm(
  graphEvent: GraphEvent
): CreateCalendarEventData {
  const startDate = parseISO(graphEvent.start.dateTime);
  const endDate = parseISO(graphEvent.end.dateTime);

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

  return {
    title: graphEvent.subject,
    date: startDate.toISOString(),
    type: eventType,
    description: graphEvent.body?.content || '',
    startTime: format(startDate, 'HH:mm'),
    endTime: format(endDate, 'HH:mm'),
    contractName: contractMatch ? contractMatch[1].trim() : undefined,
    amount: amountMatch ? amountMatch[0] : undefined,
    participants: graphEvent.attendees
      ?.map((a) => a.emailAddress.address)
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
  const startDate = new Date(caalmEvent.date);
  const endDate = caalmEvent.endTime
    ? new Date(`${caalmEvent.date.split('T')[0]}T${caalmEvent.endTime}:00`)
    : new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour duration

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

  return {
    subject,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    body: {
      content: bodyContent,
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
  const caalmStart = new Date(caalmEvent.date);
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
        conflict.caalmEvent.$createdAt || conflict.caalmEvent.date
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
    if (!event.date) {
      errors.push('Event date is required');
    }
    if (!isValid(new Date(event.date))) {
      errors.push('Invalid event date');
    }
  } else {
    // Graph event validation
    if (!event.subject?.trim()) {
      errors.push('Event subject is required');
    }
    if (!event.start?.dateTime) {
      errors.push('Event start time is required');
    }
    if (!isValid(parseISO(event.start.dateTime))) {
      errors.push('Invalid event start time');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
