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

  // CRITICAL: Extract date/time directly from ISO string without Date object conversion
  // Microsoft Graph returns: "2025-11-01T17:00:00" or "2025-11-01T17:00:00.0000000"
  // We need: startDate="2025-11-01", startTime="5:00 PM"
  let startDateOnly: string;
  let startTimeOnly: string;
  let endDateOnly: string | undefined;
  let endTimeOnly: string;

  try {
    const startDateTimeStr = graphEvent.start.dateTime;
    console.log('🔍 Parsing Outlook event:', {
      subject: graphEvent.subject,
      startDateTime: startDateTimeStr,
      endDateTime: graphEvent.end.dateTime,
      timezone: graphEvent.start.timeZone,
    });

    // Extract date and time directly from ISO string using regex
    // Format: "2025-11-01T17:00:00" or "2025-11-01T17:00:00.0000000"
    const startMatch = startDateTimeStr.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/
    );

    if (!startMatch) {
      throw new Error(`Invalid start datetime format: ${startDateTimeStr}`);
    }

    // Extract components directly from regex match - NO Date object conversion
    const [_, year, month, day, hourStr, minuteStr] = startMatch;
    startDateOnly = `${year}-${month}-${day}`; // e.g., "2025-11-01"

    // Microsoft Graph now returns times in LOCAL timezone (thanks to Prefer header)
    // So we can extract the time directly without timezone conversion
    const hour = parseInt(hourStr);
    const minute = parseInt(minuteStr);

    // Convert to 12-hour format for display
    const hour12 = hour % 12 || 12;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    startTimeOnly = `${hour12}:${String(minute).padStart(2, '0')} ${ampm}`; // e.g., "8:00 AM"

    console.log('✅ Extracted start date/time:', {
      original: startDateTimeStr,
      extracted: { date: startDateOnly, time: startTimeOnly },
      components: { year, month, day, hour, minute },
    });
  } catch (error) {
    console.error('❌ Error parsing start date:', error);
    throw new Error(`Invalid start date format: ${graphEvent.start.dateTime}`);
  }

  // Parse end date/time the same way
  try {
    const endDateTimeStr = graphEvent.end.dateTime;

    const endMatch = endDateTimeStr.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/
    );

    if (!endMatch) {
      throw new Error(`Invalid end datetime format: ${endDateTimeStr}`);
    }

    const [_, endYear, endMonth, endDay, endHourStr, endMinuteStr] = endMatch;

    // Microsoft Graph now returns times in LOCAL timezone
    // Extract directly without timezone conversion
    const endHour = parseInt(endHourStr);
    const endMinute = parseInt(endMinuteStr);

    endDateOnly = `${endYear}-${endMonth}-${endDay}`;

    const endHour12 = endHour % 12 || 12;
    const endAmpm = endHour >= 12 ? 'PM' : 'AM';
    endTimeOnly = `${endHour12}:${String(endMinute).padStart(
      2,
      '0'
    )} ${endAmpm}`;

    console.log('✅ Extracted end date/time:', {
      original: endDateTimeStr,
      extracted: { date: endDateOnly, time: endTimeOnly },
    });
  } catch (error) {
    console.error('❌ Error parsing end date:', error);
    throw new Error(`Invalid end date format: ${graphEvent.end.dateTime}`);
  }

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

  console.log('📊 Final converted event data:', {
    title: graphEvent.subject,
    startDate: startDateOnly,
    startTime: startTimeOnly,
    endDate: endDateOnly,
    endTime: endTimeOnly,
    type: eventType,
  });

  // Build participants string from attendees
  let participantsString = '';
  if (graphEvent.attendees && graphEvent.attendees.length > 0) {
    participantsString = graphEvent.attendees
      .map((a) => {
        if (a.emailAddress?.name && a.emailAddress?.address) {
          return `${a.emailAddress.name} (${a.emailAddress.address})`;
        } else if (a.emailAddress?.address) {
          return a.emailAddress.address;
        }
        return '';
      })
      .filter(Boolean)
      .join(', ');
  }

  // Clean and validate description - ensure it's a string and within length limits
  let description = '';
  if (graphEvent.body?.content) {
    // Remove HTML tags if content is HTML
    description =
      graphEvent.body.contentType === 'html'
        ? graphEvent.body.content.replace(/<[^>]*>/g, '')
        : graphEvent.body.content;

    // Truncate to 1000 characters if necessary
    if (description.length > 1000) {
      description = description.substring(0, 1000);
    }
  }

  return {
    title: graphEvent.subject,
    startDate: startDateOnly, // YYYY-MM-DD format
    endDate: endDateOnly, // YYYY-MM-DD format
    startTime: startTimeOnly, // 12-hour format with AM/PM
    endTime: endTimeOnly, // 12-hour format with AM/PM
    type: eventType,
    description: description || undefined,
    contractName: contractMatch ? contractMatch[1].trim() : undefined,
    amount: amountMatch ? amountMatch[0] : undefined,
    participants: participantsString || undefined,
    location: graphEvent.location?.displayName || undefined,
    createdBy: 'outlook-sync', // Special identifier for synced events
    outlook_id: graphEvent.id, // Store Outlook ID immediately to prevent duplicates
  };
}

/**
 * Helper function to parse time in multiple formats (HH:MM or h:mm AM/PM)
 */
function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  if (!timeStr) return { hours: 0, minutes: 0 };

  // Check if it's 12-hour format (e.g., "1:00 PM" or "12:00 AM")
  const twelveHourMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (twelveHourMatch) {
    let hours = parseInt(twelveHourMatch[1]);
    const minutes = parseInt(twelveHourMatch[2]);
    const period = twelveHourMatch[3].toUpperCase();

    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    return { hours, minutes };
  }

  // Assume 24-hour format (e.g., "13:00" or "HH:MM")
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
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
    // Always use startTime from CAALM, regardless of startDate format
    const dateStr = caalmEvent.startDate.includes('T')
      ? caalmEvent.startDate.split('T')[0] // Extract just YYYY-MM-DD from ISO
      : caalmEvent.startDate;

    const timeStr = caalmEvent.startTime || '00:00';

    // Create date by parsing components directly to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const { hours, minutes } = parseTimeString(timeStr);
    startDate = new Date(year, month - 1, day, hours, minutes, 0);

    console.log('Created startDate from components:', {
      dateStr,
      timeStr,
      parsed: startDate.toISOString(),
      local: startDate.toLocaleString(),
    });

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

      // Create date by parsing components directly to avoid timezone issues
      const [year, month, day] = dateStr.split('-').map(Number);
      const { hours, minutes } = parseTimeString(caalmEvent.endTime);
      endDate = new Date(year, month - 1, day, hours, minutes, 0);

      console.log('Created endDate from components:', {
        dateStr,
        timeStr: caalmEvent.endTime,
        parsed: endDate.toISOString(),
        local: endDate.toLocaleString(),
      });

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

  // Use just the event title as subject (no contract info in title)
  const subject = caalmEvent.title;

  // Build body content with proper formatting
  let bodyContent = caalmEvent.description || '';

  // Add contract information if available
  if (caalmEvent.contractName) {
    bodyContent += `\n\nContract: ${caalmEvent.contractName}`;
  }

  // Add amount if available
  if (caalmEvent.amount) {
    bodyContent += `\nAmount: ${caalmEvent.amount}`;
  }

  // Add participants on a new line if available
  if (caalmEvent.participants) {
    bodyContent += `\n\nParticipants:\n${caalmEvent.participants}`;
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
  // Prefer server's IANA timezone; fallback to UTC
  const timeZone =
    (Intl && Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';

  // Format dates properly for Microsoft Graph API
  const formatDateTime = (date: Date): string => {
    // Microsoft Graph expects ISO 8601 format with timezone info
    // Since we're using a specific timezone, we need to format it correctly
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    // Return in local time format that Graph API will interpret correctly
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  const graphEvent = {
    subject: subject.trim(),
    start: {
      dateTime: formatDateTime(startDate),
      timeZone: timeZone,
    },
    end: {
      dateTime: formatDateTime(endDate),
      timeZone: timeZone,
    },
    location: caalmEvent.location
      ? {
          displayName: caalmEvent.location,
        }
      : undefined,
    body: {
      content: bodyContent || 'No description',
      contentType: 'text' as const,
    },
    categories,
    showAs: 'busy' as const,
    importance:
      caalmEvent.type === 'deadline' ? ('high' as const) : ('normal' as const),
  };

  console.log('Created Graph event for Outlook:', {
    subject: graphEvent.subject,
    start: graphEvent.start,
    end: graphEvent.end,
    caalmData: {
      startDate: caalmEvent.startDate,
      startTime: caalmEvent.startTime,
      endTime: caalmEvent.endTime,
    },
  });

  return graphEvent;
}

/**
 * Compare two events to detect conflicts
 */
export function detectConflict(
  caalmEvent: CalendarEvent,
  outlookEvent: GraphEvent
): SyncConflict | null {
  // CRITICAL: Properly combine date + time for accurate comparison
  // CAALM stores date and time separately, Outlook stores them together

  // Parse CAALM date + time
  const caalmDateStr = caalmEvent.startDate.includes('T')
    ? caalmEvent.startDate.split('T')[0]
    : caalmEvent.startDate;
  const [year, month, day] = caalmDateStr.split('-').map(Number);
  const { hours: caalmHours, minutes: caalmMinutes } = parseTimeString(
    caalmEvent.startTime || '00:00'
  );
  const caalmStart = new Date(
    year,
    month - 1,
    day,
    caalmHours,
    caalmMinutes,
    0
  );

  // Parse Outlook date + time (already in UTC, needs local conversion)
  const outlookMatch = outlookEvent.start.dateTime.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/
  );

  if (!outlookMatch) {
    console.warn(
      'Invalid Outlook datetime format:',
      outlookEvent.start.dateTime
    );
    return null;
  }

  const [_, oYear, oMonth, oDay, oHour, oMinute] = outlookMatch;
  const isUTC =
    outlookEvent.start.timeZone === 'UTC' ||
    outlookEvent.start.timeZone === 'utc';

  let outlookStart: Date;
  if (isUTC) {
    // Convert UTC to local time
    outlookStart = new Date(
      Date.UTC(
        parseInt(oYear),
        parseInt(oMonth) - 1,
        parseInt(oDay),
        parseInt(oHour),
        parseInt(oMinute),
        0
      )
    );
  } else {
    // Already in local time
    outlookStart = new Date(
      parseInt(oYear),
      parseInt(oMonth) - 1,
      parseInt(oDay),
      parseInt(oHour),
      parseInt(oMinute),
      0
    );
  }

  // Time conflict: if times differ by more than 5 minutes, it's a real conflict
  const timeDiff = Math.abs(caalmStart.getTime() - outlookStart.getTime());
  const timeConflict = timeDiff > 5 * 60 * 1000; // More than 5 minutes difference

  // Title conflict: titles must match exactly (case-insensitive)
  const titleMatch =
    caalmEvent.title.toLowerCase().trim() ===
    outlookEvent.subject.toLowerCase().trim();

  // Content conflict: only if titles match but descriptions differ significantly
  let contentConflict = false;
  if (titleMatch && caalmEvent.description && outlookEvent.body?.content) {
    // Strip HTML and normalize whitespace for comparison
    const caalmDesc = caalmEvent.description
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    const outlookDesc = outlookEvent.body.content
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    // Only consider it a conflict if descriptions are very different
    const descSimilarity = calculateSimilarity(caalmDesc, outlookDesc);
    contentConflict = descSimilarity < 0.5; // Less than 50% similar
  }

  // Only report conflicts that actually need resolution
  if (timeConflict || contentConflict || !titleMatch) {
    console.log('🔍 Conflict details:', {
      title: {
        caalm: caalmEvent.title,
        outlook: outlookEvent.subject,
        match: titleMatch,
      },
      time: {
        caalm: caalmStart.toLocaleString(),
        outlook: outlookStart.toLocaleString(),
        diffMinutes: Math.round(timeDiff / 60000),
        conflict: timeConflict,
      },
      content: { conflict: contentConflict },
    });

    return {
      caalmEvent,
      outlookEvent,
      conflictType: timeConflict ? 'time' : !titleMatch ? 'content' : 'content',
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
      // Use $updatedAt if available, otherwise fall back to $createdAt
      const caalmTime = new Date(
        (conflict.caalmEvent as any).$updatedAt ||
          conflict.caalmEvent.$createdAt ||
          conflict.caalmEvent.startDate
      );
      const outlookTime = new Date(
        conflict.outlookEvent.lastModifiedDateTime ||
          conflict.outlookEvent.createdDateTime ||
          ''
      );
      
      // Choose the event with the most recent modification time
      const isOutlookNewer = outlookTime > caalmTime;
      console.log('📅 Comparing modification times:', {
        caalmTime: caalmTime.toISOString(),
        outlookTime: outlookTime.toISOString(),
        isOutlookNewer,
        willUse: isOutlookNewer ? 'Outlook' : 'CAALM',
      });
      
      return {
        resolved: true,
        event: isOutlookNewer ? conflict.outlookEvent : conflict.caalmEvent,
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
