import { NextRequest, NextResponse } from 'next/server';
import {
  generateReport,
  getUserAccessibleDepartments,
} from '@/lib/actions/report.actions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const userRole = searchParams.get('userRole');
    const userDepartment = searchParams.get('userDepartment');

    if (!userRole) {
      return NextResponse.json(
        { error: 'User role is required' },
        { status: 400 }
      );
    }

    // Get accessible departments for the user
    const accessibleDepartments = await getUserAccessibleDepartments(
      userRole,
      userDepartment || undefined
    );

    // Filter by department if specified
    const filteredDepartments = department
      ? accessibleDepartments.filter((dept) => dept === department)
      : accessibleDepartments;

    // Mock reports data - replace with actual database query
    const mockReports = [
      {
        id: '1',
        title: 'Administration Department Report',
        department: 'Administration',
        generatedAt: '2024-01-15T10:30:00Z',
        generatedBy: 'John Admin',
        status: 'completed',
        type: 'department',
      },
      {
        id: '2',
        title: 'CFS Department Report',
        department: 'CFS',
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

    return NextResponse.json({ reports: filteredReports });
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
