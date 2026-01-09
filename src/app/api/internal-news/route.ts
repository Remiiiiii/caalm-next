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
      "Join us for our quarterly all-hands meeting on Friday at 2 PM in the main conference room. We'll be discussing Q4 results, upcoming initiatives, and celebrating our achievements. This is a mandatory meeting for all employees and will include presentations from each department head, followed by a Q&A session.",
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
      'Effective immediately, all employees must use two-factor authentication for system access. This includes email, VPN, and all internal applications. Please visit the IT portal to set up your 2FA within the next 48 hours. Contact IT support if you need assistance with the setup process.',
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
      'The office will be closed December 24-26 for the holiday break. Please plan your work accordingly and ensure all critical tasks are completed before the break. Emergency contact information will be provided to department heads. Regular operations resume on December 27th.',
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
      'Welcome to our new team members: Sarah Johnson (Marketing) and Michael Chen (Engineering). Please help them feel welcome and reach out if you have any questions. A welcome lunch will be held next Tuesday at noon in the cafeteria.',
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
      'Scheduled maintenance for our internal systems will occur this Sunday from 2-4 AM. Some services may be temporarily unavailable during this time. Please save your work before the maintenance window. All systems are expected to be fully operational by 6 AM.',
    author: 'IT Operations',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'info',
    priority: 'medium',
    department: 'IT',
  },
  {
    id: '6',
    title: 'Annual Performance Review Cycle Begins',
    content:
      'The annual performance review cycle has officially begun. All managers should schedule one-on-one meetings with their direct reports by the end of this month. HR will be hosting training sessions on effective performance conversations next week.',
    author: 'HR Department',
    date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'announcement',
    priority: 'high',
    department: 'HR',
  },
  {
    id: '7',
    title: 'New Project Management Tool Rollout',
    content:
      "We're excited to announce the rollout of our new project management platform. Training sessions will be held throughout the week. The new system offers enhanced collaboration features, better reporting, and mobile access. Please attend at least one training session.",
    author: 'IT Operations',
    date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'update',
    priority: 'medium',
    department: 'IT',
  },
  {
    id: '8',
    title: 'Updated Travel Policy',
    content:
      'Please review the updated travel policy effective next month. Key changes include new booking procedures, updated per diem rates, and enhanced sustainability guidelines. All employees planning business travel should familiarize themselves with these changes.',
    author: 'Administration',
    date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'info',
    priority: 'medium',
    department: 'Administration',
  },
  {
    id: '9',
    title: 'Cybersecurity Awareness Training Required',
    content:
      'All employees must complete the mandatory cybersecurity awareness training by the end of the month. This training covers phishing detection, password security, and data protection best practices. Completion is tracked and required for compliance.',
    author: 'IT Security',
    date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'alert',
    priority: 'high',
    department: 'IT',
  },
  {
    id: '10',
    title: 'Company Picnic Save the Date',
    content:
      'Mark your calendars for our annual company picnic on July 15th at Riverside Park. This family-friendly event will feature food, games, and team-building activities. More details and RSVP information coming soon.',
    author: 'HR Department',
    date: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'announcement',
    priority: 'low',
    department: 'HR',
  },
  {
    id: '11',
    title: 'Quarterly Financial Results Released',
    content:
      'Our Q3 financial results show strong performance across all divisions. Revenue increased by 15% year-over-year, and we exceeded our profitability targets. Thank you to everyone for your hard work and dedication.',
    author: 'Finance Department',
    date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'update',
    priority: 'medium',
    department: 'Finance',
  },
  {
    id: '12',
    title: 'Building Elevator Maintenance',
    content:
      'The north elevator will be out of service next Wednesday for routine maintenance. Please plan accordingly and use the south elevator or stairs. Maintenance is expected to be completed by 5 PM.',
    author: 'Facilities',
    date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'info',
    priority: 'low',
    department: 'Facilities',
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');
    const department = searchParams.get('department');
    const search = searchParams.get('search');

    let filteredNews = [...mockNewsItems];

    // Filter by search query
    if (search) {
      const searchLower = search.toLowerCase();
      filteredNews = filteredNews.filter(
        (item) =>
          item.title.toLowerCase().includes(searchLower) ||
          item.content.toLowerCase().includes(searchLower) ||
          item.author.toLowerCase().includes(searchLower)
      );
    }

    // Filter by type
    if (
      type &&
      type !== 'all' &&
      ['announcement', 'update', 'alert', 'info'].includes(type)
    ) {
      filteredNews = filteredNews.filter((item) => item.type === type);
    }

    // Filter by priority
    if (
      priority &&
      priority !== 'all' &&
      ['high', 'medium', 'low'].includes(priority)
    ) {
      filteredNews = filteredNews.filter((item) => item.priority === priority);
    }

    // Filter by department
    if (department && department !== 'all') {
      filteredNews = filteredNews.filter((item) =>
        item.department?.toLowerCase().includes(department.toLowerCase())
      );
    }

    // Sort by date (newest first)
    filteredNews.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Store total count before pagination
    const totalCount = filteredNews.length;

    // Apply pagination
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    const limitNum = limit ? parseInt(limit, 10) : 9; // Default to 9 items per page

    if (!isNaN(offsetNum) && offsetNum >= 0) {
      filteredNews = filteredNews.slice(offsetNum);
    }

    if (!isNaN(limitNum) && limitNum > 0) {
      filteredNews = filteredNews.slice(0, limitNum);
    }

    return NextResponse.json({
      items: filteredNews,
      total: totalCount,
      limit: limitNum,
      offset: offsetNum,
    });
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
