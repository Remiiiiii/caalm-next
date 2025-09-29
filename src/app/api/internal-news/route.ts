import { NextRequest, NextResponse } from 'next/server';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  type: 'announcement' | 'update' | 'alert' | 'info';
  priority: 'high' | 'medium' | 'low';
  department?: string;
}

// Mock data - in production, this would come from your database
const mockNewsItems: NewsItem[] = [
  {
    id: '1',
    title: 'Q4 Company All-Hands Meeting',
    content:
      "Join us for our quarterly all-hands meeting on Friday at 2 PM in the main conference room. We'll be discussing Q4 results, upcoming initiatives, and celebrating our achievements.",
    author: 'HR Department',
    date: new Date().toISOString(),
    type: 'announcement',
    priority: 'high',
    department: 'HR',
  },
  {
    id: '2',
    title: 'New Security Protocol Update',
    content:
      'Effective immediately, all employees must use two-factor authentication for system access. This includes email, VPN, and all internal applications.',
    author: 'IT Security',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'alert',
    priority: 'high',
    department: 'IT',
  },
  {
    id: '3',
    title: 'Office Holiday Schedule',
    content:
      'The office will be closed December 24-26 for the holiday break. Please plan your work accordingly and ensure all critical tasks are completed before the break.',
    author: 'Administration',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'info',
    priority: 'medium',
    department: 'Administration',
  },
  {
    id: '4',
    title: 'New Employee Onboarding',
    content:
      'Welcome to our new team members: Sarah Johnson (Marketing) and Michael Chen (Engineering). Please help them feel welcome and reach out if you have any questions.',
    author: 'HR Department',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'update',
    priority: 'low',
    department: 'HR',
  },
  {
    id: '5',
    title: 'System Maintenance Window',
    content:
      'Scheduled maintenance for our internal systems will occur this Sunday from 2-4 AM. Some services may be temporarily unavailable during this time.',
    author: 'IT Operations',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'info',
    priority: 'medium',
    department: 'IT',
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');
    const department = searchParams.get('department');

    let filteredNews = [...mockNewsItems];

    // Filter by type
    if (type && ['announcement', 'update', 'alert', 'info'].includes(type)) {
      filteredNews = filteredNews.filter((item) => item.type === type);
    }

    // Filter by priority
    if (priority && ['high', 'medium', 'low'].includes(priority)) {
      filteredNews = filteredNews.filter((item) => item.priority === priority);
    }

    // Filter by department
    if (department) {
      filteredNews = filteredNews.filter((item) =>
        item.department?.toLowerCase().includes(department.toLowerCase())
      );
    }

    // Sort by date (newest first)
    filteredNews.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Apply limit
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        filteredNews = filteredNews.slice(0, limitNum);
      }
    }

    return NextResponse.json(filteredNews);
  } catch (error) {
    console.error('Failed to fetch internal news:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch internal news',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
