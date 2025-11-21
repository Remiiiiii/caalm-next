import { CalendarEvent } from '@/lib/actions/calendar.actions';
import { getCalendarEvents } from '@/lib/actions/calendar.actions';
import { addMinutes, addHours, isWithinInterval, parse } from 'date-fns';

export interface ConflictInfo {
  type: 'participant' | 'resource';
  conflictingEvent: CalendarEvent;
  conflictReason: string;
}

export interface AlternateSlot {
  startDate: string;
  startTime: string;
  endTime: string;
  available: boolean;
  conflicts?: ConflictInfo[];
}

/**
 * Parse time string (HH:mm) to hours and minutes
 */
function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours: hours || 0, minutes: minutes || 0 };
}

/**
 * Create a Date object from date string and time string
 */
function createDateTime(dateStr: string, timeStr: string): Date {
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const [year, month, day] = datePart.split('-').map(Number);
  const { hours, minutes } = parseTimeString(timeStr);
  return new Date(year, month - 1, day, hours, minutes, 0);
}

/**
 * Check if two time ranges overlap
 */
function timeRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Extract participant emails from participants string
 * Format: "Name <email>, Name2 <email2>" or just emails
 */
function extractParticipantEmails(participants?: string): string[] {
  if (!participants) return [];
  
  return participants
    .split(',')
    .map((p) => {
      const match = p.trim().match(/<(.+?)>/);
      return match ? match[1] : p.trim();
    })
    .filter(Boolean);
}

/**
 * Check for participant conflicts (double-booking)
 * @param event The event to check for conflicts
 * @param excludeEventId Optional event ID to exclude from conflict checks
 * @param createdBy Optional user ID who is creating the event (to allow same user multiple meetings)
 */
export async function detectParticipantConflicts(
  event: Partial<CalendarEvent>,
  excludeEventId?: string,
  createdBy?: string
): Promise<ConflictInfo[]> {
  const conflicts: ConflictInfo[] = [];

  if (!event.startDate || !event.startTime || !event.participants) {
    return conflicts;
  }

  const eventParticipants = extractParticipantEmails(event.participants);
  if (eventParticipants.length === 0) {
    return conflicts;
  }

  const eventStart = createDateTime(event.startDate, event.startTime);
  const eventEnd = event.endTime
    ? createDateTime(event.endDate || event.startDate, event.endTime)
    : addHours(eventStart, 1); // Default 1 hour if no end time

  // Get all events in the same date range
  const allEvents = await getCalendarEvents();
  const dateStr = event.startDate.includes('T')
    ? event.startDate.split('T')[0]
    : event.startDate;

  const sameDayEvents = allEvents.filter((e) => {
    if (e.$id === excludeEventId) return false;
    if (e.deleted_at) return false;
    const eDateStr = e.startDate.includes('T')
      ? e.startDate.split('T')[0]
      : e.startDate;
    return eDateStr === dateStr;
  });

  for (const existingEvent of sameDayEvents) {
    if (!existingEvent.startTime || !existingEvent.participants) continue;

    const existingStart = createDateTime(
      existingEvent.startDate,
      existingEvent.startTime
    );
    const existingEnd = existingEvent.endTime
      ? createDateTime(
          existingEvent.endDate || existingEvent.startDate,
          existingEvent.endTime
        )
      : addHours(existingStart, 1);

    // Check if times overlap
    if (!timeRangesOverlap(eventStart, eventEnd, existingStart, existingEnd)) {
      continue;
    }

    // Skip conflict if the same user is creating both events (they can have multiple meetings)
    if (createdBy && existingEvent.createdBy === createdBy) {
      continue;
    }

    // Check if any participants overlap
    const existingParticipants = extractParticipantEmails(
      existingEvent.participants
    );
    const overlappingParticipants = eventParticipants.filter((p) =>
      existingParticipants.includes(p)
    );

    if (overlappingParticipants.length > 0) {
      conflicts.push({
        type: 'participant',
        conflictingEvent: existingEvent,
        conflictReason: `Participant(s) ${overlappingParticipants.join(', ')} already have an event at this time: ${existingEvent.title}`,
      });
    }
  }

  return conflicts;
}

/**
 * Check for resource conflicts (rooms/equipment)
 * @param event The event to check for conflicts
 * @param excludeEventId Optional event ID to exclude from conflict checks
 * @param createdBy Optional user ID who is creating the event (to allow same user multiple meetings in different locations)
 */
export async function detectResourceConflicts(
  event: Partial<CalendarEvent>,
  excludeEventId?: string,
  createdBy?: string
): Promise<ConflictInfo[]> {
  const conflicts: ConflictInfo[] = [];

  if (!event.startDate || !event.startTime || !event.location) {
    return conflicts;
  }

  const eventStart = createDateTime(event.startDate, event.startTime);
  const eventEnd = event.endTime
    ? createDateTime(event.endDate || event.startDate, event.endTime)
    : addHours(eventStart, 1);

  // Get all events in the same date range
  const allEvents = await getCalendarEvents();
  const dateStr = event.startDate.includes('T')
    ? event.startDate.split('T')[0]
    : event.startDate;

  const sameDayEvents = allEvents.filter((e) => {
    if (e.$id === excludeEventId) return false;
    if (e.deleted_at) return false;
    if (!e.location) return false;
    const eDateStr = e.startDate.includes('T')
      ? e.startDate.split('T')[0]
      : e.startDate;
    return eDateStr === dateStr;
  });

  for (const existingEvent of sameDayEvents) {
    if (!existingEvent.startTime || !existingEvent.location) continue;

    // Check if location matches (case-insensitive)
    if (
      existingEvent.location.toLowerCase().trim() !==
      event.location.toLowerCase().trim()
    ) {
      continue;
    }

    const existingStart = createDateTime(
      existingEvent.startDate,
      existingEvent.startTime
    );
    const existingEnd = existingEvent.endTime
      ? createDateTime(
          existingEvent.endDate || existingEvent.startDate,
          existingEvent.endTime
        )
      : addHours(existingStart, 1);

    // Skip conflict if the same user is creating both events in different locations
    // (they can have multiple meetings at the same time in different locations)
    if (createdBy && existingEvent.createdBy === createdBy && existingEvent.location?.toLowerCase().trim() !== event.location.toLowerCase().trim()) {
      continue;
    }

    // Check if times overlap
    if (timeRangesOverlap(eventStart, eventEnd, existingStart, existingEnd)) {
      conflicts.push({
        type: 'resource',
        conflictingEvent: existingEvent,
        conflictReason: `Resource "${event.location}" is already booked at this time: ${existingEvent.title}`,
      });
    }
  }

  return conflicts;
}

/**
 * Suggest alternate time slots when conflicts are detected
 */
export async function suggestAlternateSlots(
  event: Partial<CalendarEvent>,
  excludeEventId?: string,
  maxSuggestions: number = 5
): Promise<AlternateSlot[]> {
  const suggestions: AlternateSlot[] = [];

  if (!event.startDate || !event.startTime) {
    return suggestions;
  }

  const originalStart = createDateTime(event.startDate, event.startTime);
  const duration = event.endTime
    ? createDateTime(event.endDate || event.startDate, event.endTime).getTime() -
      originalStart.getTime()
    : 60 * 60 * 1000; // Default 1 hour in milliseconds

  // Try slots: +30min, +1hr, +2hr, -30min, -1hr from original time
  const timeOffsets = [
    30, // +30 minutes
    60, // +1 hour
    120, // +2 hours
    -30, // -30 minutes
    -60, // -1 hour
  ];

  for (const offsetMinutes of timeOffsets) {
    if (suggestions.length >= maxSuggestions) break;

    const suggestedStart = addMinutes(originalStart, offsetMinutes);
    const suggestedEnd = new Date(suggestedStart.getTime() + duration);

    // Format dates and times
    const dateStr = `${suggestedStart.getFullYear()}-${String(
      suggestedStart.getMonth() + 1
    ).padStart(2, '0')}-${String(suggestedStart.getDate()).padStart(2, '0')}`;
    const startTimeStr = `${String(suggestedStart.getHours()).padStart(
      2,
      '0'
    )}:${String(suggestedStart.getMinutes()).padStart(2, '0')}`;
    const endTimeStr = `${String(suggestedEnd.getHours()).padStart(
      2,
      '0'
    )}:${String(suggestedEnd.getMinutes()).padStart(2, '0')}`;

    // Check for conflicts at this time
    const suggestedEvent: Partial<CalendarEvent> = {
      ...event,
      startDate: dateStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
    };

    const participantConflicts = await detectParticipantConflicts(
      suggestedEvent,
      excludeEventId
    );
    const resourceConflicts = await detectResourceConflicts(
      suggestedEvent,
      excludeEventId
    );
    const allConflicts = [...participantConflicts, ...resourceConflicts];

    suggestions.push({
      startDate: dateStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
      available: allConflicts.length === 0,
      conflicts: allConflicts.length > 0 ? allConflicts : undefined,
    });
  }

  // Sort by availability (available first) then by time proximity
  return suggestions.sort((a, b) => {
    if (a.available !== b.available) {
      return a.available ? -1 : 1;
    }
    const aTime = createDateTime(a.startDate, a.startTime).getTime();
    const bTime = createDateTime(b.startDate, b.startTime).getTime();
    const aDiff = Math.abs(aTime - originalStart.getTime());
    const bDiff = Math.abs(bTime - originalStart.getTime());
    return aDiff - bDiff;
  });
}

