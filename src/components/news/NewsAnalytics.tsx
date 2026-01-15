'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, Eye, FileText, Calendar } from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface NewsAnalyticsProps {
  className?: string;
}

interface AnalyticsData {
  overview: {
    total: number;
    published: number;
    drafts: number;
    archived: number;
    thisMonth: number;
    thisWeek: number;
  };
  byType: {
    announcement: number;
    update: number;
    alert: number;
    info: number;
  };
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
  byDepartment: Record<string, number>;
  engagement: {
    totalViews: number;
    averageViews: number;
    mostViewed: Array<{
      id: string;
      title: string;
      views: number;
      type: string;
      publishedAt: string;
    }>;
  };
  trends: Array<{
    date: string;
    count: number;
  }>;
}

const COLORS = {
  type: {
    announcement: '#3B82F6', // blue
    update: '#EC4899', // pink
    alert: '#EF4444', // red
    info: '#10B981', // green
  },
  priority: {
    high: '#EF4444',
    medium: '#F59E0B',
    low: '#10B981',
  },
};

const NewsAnalytics: React.FC<NewsAnalyticsProps> = ({ className }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/internal-news/analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');

      const data = await response.json();
      setAnalytics(data.analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <p className="text-slate-600">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for charts
  const typeData = Object.entries(analytics.byType).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  const priorityData = Object.entries(analytics.byPriority).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  const departmentData = Object.entries(analytics.byDepartment)
    .map(([name, value]) => ({ name, count: value }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.engagement.totalViews}</div>
            <p className="text-xs text-slate-600 mt-1">
              Avg: {analytics.engagement.averageViews} per article
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.thisWeek}</div>
            <p className="text-xs text-slate-600 mt-1">Articles published</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.thisMonth}</div>
            <p className="text-xs text-slate-600 mt-1">Articles published</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <FileText className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.published}</div>
            <p className="text-xs text-slate-600 mt-1">
              {analytics.overview.drafts} drafts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Articles by Type - Pie Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Articles by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        COLORS.type[entry.name.toLowerCase() as keyof typeof COLORS.type] ||
                        '#8884d8'
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Articles by Priority - Pie Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Articles by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        COLORS.priority[entry.name.toLowerCase() as keyof typeof COLORS.priority] ||
                        '#8884d8'
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Publishing Trends - Line Chart */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Publishing Trends (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString();
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Articles Published"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Articles by Department - Bar Chart */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Articles by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3B82F6" name="Article Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Most Viewed Articles */}
      {analytics.engagement.mostViewed.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Most Viewed Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.engagement.mostViewed.map((article, index) => (
                <div
                  key={article.id}
                  className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue/10 text-blue font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{article.title}</p>
                      <p className="text-xs text-slate-500 capitalize">{article.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{article.views}</p>
                      <p className="text-xs text-slate-500">views</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NewsAnalytics;
