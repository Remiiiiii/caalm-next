'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Newspaper,
  Calendar,
  User,
  ChevronRight,
  AlertCircle,
  Info,
  Megaphone,
} from 'lucide-react';

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

interface CompanyNewsFeedProps {
  limit?: number;
}

const CompanyNewsFeed: React.FC<CompanyNewsFeedProps> = ({ limit = 5 }) => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNewsItems = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/internal-news');

        if (!response.ok) {
          throw new Error('Failed to fetch news items');
        }

        const data = await response.json();
        setNewsItems(data.slice(0, limit));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load news');
        // Fallback to mock data for development
        setNewsItems(getMockNewsItems().slice(0, limit));
      } finally {
        setLoading(false);
      }
    };

    fetchNewsItems();
  }, [limit]);

  const getMockNewsItems = (): NewsItem[] => [
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
      department: 'Admin',
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="h-4 w-4 text-blue-500" />;
      case 'alert':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-green-500" />;
      case 'update':
        return <Newspaper className="h-4 w-4 text-purple-500" />;
      default:
        return <Newspaper className="h-4 w-4 text-slate-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'announcement':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'alert':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'info':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'update':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-slate-500';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  if (loading) {
    return (
      <Card className="w-[320px] h-[290px] bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-md border border-white/30 shadow-xl overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold sidebar-gradient-text">
            Company News
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center justify-center h-32">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600"></div>
              <p className="text-xs text-slate-500 font-medium">
                Loading news...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && newsItems.length === 0) {
    return (
      <Card className="w-[320px] h-[290px] bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-md border border-white/30 shadow-xl overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold sidebar-gradient-text">
            Company News
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-col items-center justify-center h-32 gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
              <Newspaper className="h-5 w-5 text-red-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">
                News Unavailable
              </p>
              <p className="text-xs text-slate-500">Check your connection</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-[320px] h-[290px] bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-md border border-white/30 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-slate-600" />
          <CardTitle className="text-sm font-semibold sidebar-gradient-text">
            Company News
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-2">
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
          {newsItems.map((item, index) => (
            <div key={item.id}>
              <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm border border-white/20 hover:bg-white/30 transition-colors duration-200">
                <div className="flex items-start gap-2">
                  {/* Type icon and badge */}
                  <div className="flex items-center gap-1 mb-1">
                    {getTypeIcon(item.type)}
                    <Badge
                      variant="outline"
                      className={`text-xs px-1.5 py-0.5 ${getTypeColor(
                        item.type
                      )}`}
                    >
                      {item.type}
                    </Badge>
                  </div>
                </div>

                <h4 className="text-sm font-semibold text-slate-800 mb-1 line-clamp-1">
                  {item.title}
                </h4>

                <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                  {item.content}
                </p>

                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <User className="h-3 w-3" />
                  <span>{item.author}</span>
                </div>
              </div>

              {/* Dividing line between news items */}
              {index < 1 && <div className="h-px bg-slate-300/50 my-2"></div>}
            </div>
          ))}
        </div>

        {/* Footer with view all link */}
        <div className="mt-3 border-t border-white/20">
          <div className="flex items-center justify-center">
            <button className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 transition-colors duration-200">
              <span>View All News</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanyNewsFeed;
