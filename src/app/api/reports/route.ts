import { NextRequest, NextResponse } from 'next/server';
import {
  generateReport,
  getUserAccessibleDepartments,
} from '@/lib/actions/report.actions';
import CacheManager from '@/lib/services/cache-manager';
import { CACHE_KEYS, CACHE_TTLS } from '@/lib/services/cache-keys';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const userRole = searchParams.get('userRole');
    const userDivision = searchParams.get('userDivision');

    if (!userRole) {
      return NextResponse.json(
        { error: 'User role is required' },
        { status: 400 }
      );
    }

    // Build cache key
    const cacheKey = `${CACHE_KEYS.reports.templates()}:${userRole}:${userDivision}:${department}`;

    // Cache reports with long TTL (reports don't change frequently)
    const { reports } = await CacheManager.withCache(
      'reports',
      cacheKey,
      async () => {
        // Get accessible departments for the user
        const accessibleDepartments = await getUserAccessibleDepartments(
          userRole,
          userDivision || undefined
        );

        // Filter by department if specified
        const filteredDepartments = department
          ? accessibleDepartments.filter((dept) => dept === department)
          : accessibleDepartments;

        // Mock reports data - replace with actual database query
        const mockReports = [
          {
            id: '1',
            title: 'IT Department Report',
            department: 'IT',
            generatedAt: '2024-01-15T10:30:00Z',
            generatedBy: 'John Admin',
            status: 'completed',
            type: 'department',
          },
          {
            id: '2',
            title: 'Finance Department Report',
            department: 'Finance',
            generatedAt: '2024-01-14T14:20:00Z',
            generatedBy: 'Sarah Manager',
            status: 'completed',
            type: 'department',
          },
          {
            id: '3',
            title: 'Executive Summary Report',
            department: 'All Departments',
            generatedAt: '2024-01-13T09:15:00Z',
            generatedBy: 'CEO Executive',
            status: 'completed',
            type: 'executive',
          },
        ];

        // Filter reports based on accessible departments
        const filteredReports = mockReports.filter(
          (report) =>
            filteredDepartments.includes(report.department) ||
            report.department === 'All Departments'
        );

        return { reports: filteredReports };
      },
      CACHE_TTLS.static // 1 hour - reports don't change frequently
    );

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userRole, department, userName } = body;

    if (!userId || !userRole || !department || !userName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate the report
    const report = await generateReport({
      userId,
      userRole,
      department,
      userName,
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
