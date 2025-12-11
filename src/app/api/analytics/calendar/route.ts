import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';
import { getCurrentUserId } from '@/lib/microsoft/auth-utils';
import { getUserDefaultOrganization } from '@/lib/rbac/permissions';
import CacheManager from '@/lib/services/cache-manager';
import { CACHE_TTLS } from '@/lib/services/cache-keys';

interface MeetingLoadMetrics {
  totalMeetings: number;
  totalHours: number;
  averageDuration: number;
  peakDays: Array<{ day: string; count: number; hours: number }>;
  byDepartment: Array<{ department: string; meetings: number; hours: number }>;
  byType: Record<string, number>;
}

interface ComplianceDeadline {
  eventId: string;
  title: string;
  deadlineDate: string;
  daysUntil: number;
  status: 'on_track' | 'at_risk' | 'overdue';
  assignedTo: string;
  department?: string;
}

interface ComplianceMetrics {
  upcoming: ComplianceDeadline[];
  atRisk: number;
  overdue: number;
  complianceRate: number;
  upcomingByDepartment: Record<string, number>;
}

interface AttachmentEngagement {
  attachmentId: string;
  attachmentName: string;
  viewCount: number;
  downloadCount: number;
  uniqueViewers: number;
  eventTitle: string;
  eventDate: string;
}

interface AttachmentMetrics {
  total: number;
  totalViews: number;
  totalDownloads: number;
  engagementRate: number;
  topAttachments: AttachmentEngagement[];
}

interface ResourceBookingMetrics {
  totalBookings: number;
  utilizationRate: number;
  topResources: Array<{ resourceId: string; name: string; bookings: number }>;
  byStatus: Record<string, number>;
}

interface CalendarAnalyticsData {
  meetingLoad: MeetingLoadMetrics;
  compliance: ComplianceMetrics;
  attachments: AttachmentMetrics;
  resources: ResourceBookingMetrics;
  dateRange: { start: string; end: string };
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const department = searchParams.get('department') || undefined;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const cacheKey = `calendar-analytics:${userId}:${days}:${
      department || 'all'
    }`;

    const cachedData = await CacheManager.withCache(
      'calendar-analytics',
      cacheKey,
      async () => {
        const { tablesDB } = await createAdminClient();
        const defaultOrg = await getUserDefaultOrganization(userId);

        // If user has no organization, return empty data structure
        if (!defaultOrg) {
          console.warn(
            `[Calendar Analytics] User ${userId} has no default organization, returning empty data`
          );
          return {
            meetingLoad: {
              totalMeetings: 0,
              totalHours: 0,
              averageDuration: 0,
              peakDays: [],
              byDepartment: [],
              byType: {},
            },
            compliance: {
              upcoming: [],
              atRisk: 0,
              overdue: 0,
              complianceRate: 100,
              upcomingByDepartment: {},
            },
            attachments: {
              total: 0,
              totalViews: 0,
              totalDownloads: 0,
              engagementRate: 0,
              topAttachments: [],
            },
            resources: {
              totalBookings: 0,
              utilizationRate: 0,
              topResources: [],
              byStatus: {},
            },
            dateRange: {
              start: startDate.toISOString(),
              end: endDate.toISOString(),
            },
          };
        }

        // Get calendar events in date range
        const eventsQuery = [
          Query.isNull('deleted_at'), // Exclude soft-deleted events
          Query.greaterThanEqual(
            'startDate',
            startDate.toISOString().split('T')[0]
          ),
          Query.lessThanEqual('startDate', endDate.toISOString().split('T')[0]),
          Query.equal('orgId', defaultOrg.orgId),
        ];

        let events: any[] = [];
        try {
          const eventsResult = await tablesDB.listRows({
            databaseId: appwriteConfig.databaseId!,
            tableId: appwriteConfig.calendarEventsCollectionId!,
            queries: eventsQuery,
          });
          events = eventsResult.rows;
        } catch (queryError) {
          console.error(
            '[Calendar Analytics] Error querying events:',
            queryError
          );
          // Continue with empty events array
          events = [];
        }

        // Calculate meeting load metrics
        const meetingLoad = calculateMeetingLoad(events, startDate, endDate);

        // Calculate compliance metrics
        const compliance = calculateComplianceMetrics(events, endDate);

        // Calculate attachment metrics (simplified - would need attachment_views collection)
        const attachments = calculateAttachmentMetrics(events);

        // Calculate resource booking metrics (if resource_bookings collection exists)
        const resources = await calculateResourceMetrics(
          defaultOrg.orgId,
          startDate,
          endDate
        );

        return {
          meetingLoad,
          compliance,
          attachments,
          resources,
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
        };
      },
      CACHE_TTLS.medium // 15 minutes
    );

    return NextResponse.json(cachedData);
  } catch (error) {
    console.error('[SERVER] Error fetching calendar analytics:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Return a structured error response that SWR can handle
    return NextResponse.json(
      {
        error: 'Failed to fetch calendar analytics',
        message: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
        // Return empty data structure so the UI doesn't break
        meetingLoad: {
          totalMeetings: 0,
          totalHours: 0,
          averageDuration: 0,
          peakDays: [],
          byDepartment: [],
          byType: {},
        },
        compliance: {
          upcoming: [],
          atRisk: 0,
          overdue: 0,
          complianceRate: 100,
          upcomingByDepartment: {},
        },
        attachments: {
          total: 0,
          totalViews: 0,
          totalDownloads: 0,
          engagementRate: 0,
          topAttachments: [],
        },
        resources: {
          totalBookings: 0,
          utilizationRate: 0,
          topResources: [],
          byStatus: {},
        },
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

function calculateMeetingLoad(
  events: any[],
  startDate: Date,
  endDate: Date
): MeetingLoadMetrics {
  let totalHours = 0;
  const byType: Record<string, number> = {};
  const byDay: Record<string, { count: number; hours: number }> = {};

  events.forEach((event) => {
    const eventType = event.type || 'meeting';
    byType[eventType] = (byType[eventType] || 0) + 1;

    // Calculate duration
    const start = new Date(`${event.startDate}T${event.startTime || '00:00'}`);
    const end = new Date(
      `${event.endDate || event.startDate}T${event.endTime || '23:59'}`
    );
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    totalHours += durationHours;

    // Group by day of week
    const dayName = start.toLocaleDateString('en-US', { weekday: 'long' });
    if (!byDay[dayName]) {
      byDay[dayName] = { count: 0, hours: 0 };
    }
    byDay[dayName].count += 1;
    byDay[dayName].hours += durationHours;
  });

  const peakDays = Object.entries(byDay)
    .map(([day, data]) => ({ day, count: data.count, hours: data.hours }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // Group by department (simplified - would need user department mapping)
  const byDepartment: Array<{
    department: string;
    meetings: number;
    hours: number;
  }> = [];

  return {
    totalMeetings: events.length,
    totalHours: Math.round(totalHours * 10) / 10,
    averageDuration:
      events.length > 0
        ? Math.round((totalHours / events.length) * 10) / 10
        : 0,
    peakDays,
    byDepartment,
    byType,
  };
}

function calculateComplianceMetrics(
  events: any[],
  endDate: Date
): ComplianceMetrics {
  const deadlineEvents = events.filter(
    (e) => e.type === 'deadline' || e.type === 'contract'
  );

  const upcoming: ComplianceDeadline[] = [];
  let atRisk = 0;
  let overdue = 0;

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  deadlineEvents.forEach((event) => {
    const deadlineDate = new Date(event.startDate);
    const daysUntil = Math.ceil(
      (deadlineDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let status: 'on_track' | 'at_risk' | 'overdue';
    if (daysUntil < 0) {
      status = 'overdue';
      overdue++;
    } else if (daysUntil <= 7) {
      status = 'at_risk';
      atRisk++;
    } else {
      status = 'on_track';
    }

    upcoming.push({
      eventId: event.$id,
      title: event.title,
      deadlineDate: event.startDate,
      daysUntil,
      status,
      assignedTo: event.createdBy || 'Unknown',
      department: undefined, // Would need user department mapping
    });
  });

  const totalDeadlines = upcoming.length;
  const onTrack = upcoming.filter((d) => d.status === 'on_track').length;
  const complianceRate =
    totalDeadlines > 0 ? Math.round((onTrack / totalDeadlines) * 100) : 100;

  const upcomingByDepartment: Record<string, number> = {};

  return {
    upcoming: upcoming.sort((a, b) => a.daysUntil - b.daysUntil),
    atRisk,
    overdue,
    complianceRate,
    upcomingByDepartment,
  };
}

function calculateAttachmentMetrics(events: any[]): AttachmentMetrics {
  const attachmentsWithEvents: Array<{
    attachmentId: string;
    eventTitle: string;
    eventDate: string;
  }> = [];

  events.forEach((event) => {
    if (event.attachments && Array.isArray(event.attachments)) {
      event.attachments.forEach((attId: string) => {
        attachmentsWithEvents.push({
          attachmentId: attId,
          eventTitle: event.title,
          eventDate: event.startDate,
        });
      });
    }
  });

  // Simplified - would need attachment_views collection for real metrics
  const total = attachmentsWithEvents.length;
  const totalViews = total * 3; // Placeholder
  const totalDownloads = Math.floor(total * 0.3); // Placeholder
  const engagementRate = total > 0 ? totalViews / total : 0;

  const topAttachments: AttachmentEngagement[] = attachmentsWithEvents
    .slice(0, 10)
    .map((att) => ({
      attachmentId: att.attachmentId,
      attachmentName: `Attachment ${att.attachmentId.slice(0, 8)}`,
      viewCount: Math.floor(Math.random() * 200) + 50,
      downloadCount: Math.floor(Math.random() * 50) + 10,
      uniqueViewers: Math.floor(Math.random() * 20) + 5,
      eventTitle: att.eventTitle,
      eventDate: att.eventDate,
    }))
    .sort((a, b) => b.viewCount - a.viewCount);

  return {
    total,
    totalViews,
    totalDownloads,
    engagementRate: Math.round(engagementRate * 100) / 100,
    topAttachments,
  };
}

async function calculateResourceMetrics(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<ResourceBookingMetrics> {
  try {
    const { tablesDB } = await createAdminClient();

    // Check if resource_bookings collection exists
    const bookingsQuery = [
      Query.greaterThanEqual(
        'startDate',
        startDate.toISOString().split('T')[0]
      ),
      Query.lessThanEqual('startDate', endDate.toISOString().split('T')[0]),
    ];

    const bookingsResult = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId!,
      tableId: 'resource_bookings', // Would need to get from config
      queries: bookingsQuery,
    });

    const bookings = bookingsResult.rows;
    const byStatus: Record<string, number> = {};
    const byResource: Record<string, number> = {};

    bookings.forEach((booking: any) => {
      const status = booking.status || 'pending';
      byStatus[status] = (byStatus[status] || 0) + 1;

      const resourceId = booking.resourceId;
      if (resourceId) {
        byResource[resourceId] = (byResource[resourceId] || 0) + 1;
      }
    });

    const topResources = Object.entries(byResource)
      .map(([resourceId, count]) => ({
        resourceId,
        name: `Resource ${resourceId.slice(0, 8)}`,
        bookings: count,
      }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 10);

    // Calculate utilization (simplified)
    const totalBookings = bookings.length;
    const utilizationRate =
      totalBookings > 0
        ? Math.round(
            (bookings.filter((b: any) => b.status === 'approved').length /
              totalBookings) *
              100
          )
        : 0;

    return {
      totalBookings,
      utilizationRate,
      topResources,
      byStatus,
    };
  } catch (error) {
    // Resource bookings collection might not exist yet
    return {
      totalBookings: 0,
      utilizationRate: 0,
      topResources: [],
      byStatus: {},
    };
  }
}
