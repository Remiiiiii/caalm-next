'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Newspaper,
  Calendar,
  User,
  ChevronRight,
  AlertCircle,
  Info,
  Megaphone,
  Search,
  Filter,
  ChevronLeft,
  FileText,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  type: 'announcement' | 'update' | 'alert' | 'info';
  priority: 'high' | 'medium' | 'low';
  department?: string;
  image?: string;
}

interface NewsResponse {
  items: NewsItem[];
  total: number;
  limit: number;
  offset: number;
}

interface CompanyNewsFeedProps {
  limit?: number;
  fullPage?: boolean;
}

const CompanyNewsFeed: React.FC<CompanyNewsFeedProps> = ({
  limit = 5,
  fullPage = false,
}) => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = fullPage ? 9 : limit;

  // Filters (only for full page)
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  useEffect(() => {
    fetchNewsItems();
  }, [fullPage, currentPage, searchQuery, typeFilter, departmentFilter, limit]);

  const fetchNewsItems = async () => {
    try {
      setLoading(true);

      if (fullPage) {
        // Full page mode with pagination and filters
        const offset = (currentPage - 1) * itemsPerPage;
        const params = new URLSearchParams({
          limit: itemsPerPage.toString(),
          offset: offset.toString(),
        });

        if (searchQuery) params.append('search', searchQuery);
        if (typeFilter && typeFilter !== 'all')
          params.append('type', typeFilter);
        if (departmentFilter && departmentFilter !== 'all')
          params.append('department', departmentFilter);

        const response = await fetch(`/api/internal-news?${params}`);

        if (!response.ok) {
          throw new Error('Failed to fetch news items');
        }

        const data: NewsResponse = await response.json();
        setNewsItems(data.items);
        setTotalItems(data.total);
      } else {
        // Widget mode - simple fetch
        const response = await fetch('/api/internal-news');

        if (!response.ok) {
          throw new Error('Failed to fetch news items');
        }

        const data = await response.json();
        const items = data.items || data;
        setNewsItems(Array.isArray(items) ? items.slice(0, limit) : []);
        setTotalItems(Array.isArray(items) ? items.length : 0);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load news');
      console.error('Error fetching news:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setDepartmentFilter('all');
    setCurrentPage(1);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="h-4 w-4 text-blue" />;
      case 'alert':
        return <AlertCircle className="h-4 w-4 text-red" />;
      case 'info':
        return <Info className="h-4 w-4 text-green" />;
      case 'update':
        return <Newspaper className="h-4 w-4 text-pink" />;
      default:
        return <Newspaper className="h-4 w-4 text-light-200" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'announcement':
        return 'bg-blue/10 text-blue border-blue/20';
      case 'alert':
        return 'bg-red/10 text-red border-red/20';
      case 'info':
        return 'bg-green/10 text-green border-green/20';
      case 'update':
        return 'bg-pink/10 text-pink border-pink/20';
      default:
        return 'bg-light-300 text-light-100 border-light-200';
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
      return fullPage
        ? format(date, 'MMM dd, yyyy')
        : date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
    }
  };

  // Full Page View
  if (fullPage) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Professional Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue to-blue shadow-lg">
              <Newspaper className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="h1 sidebar-gradient-text">Company News</h1>
              <p className="text-light-100">
                Stay informed with the latest company announcements and updates
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="glass-card hover:shadow-drop-3 transition-all duration-300">
            <div className="glass-card-cap" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="body-2 text-light-100 mb-1">Total Articles</p>
                  <p className="h2 text-navy">{totalItems}</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue to-blue">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-drop-3 transition-all duration-300">
            <div className="glass-card-cap" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="body-2 text-light-100 mb-1">This Month</p>
                  <p className="h2 text-navy">
                    {
                      newsItems.filter((item) => {
                        const itemDate = new Date(item.date);
                        const now = new Date();
                        return (
                          itemDate.getMonth() === now.getMonth() &&
                          itemDate.getFullYear() === now.getFullYear()
                        );
                      }).length
                    }
                  </p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-green to-green">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-drop-3 transition-all duration-300">
            <div className="glass-card-cap" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="body-2 text-light-100 mb-1">Categories</p>
                  <p className="h2 text-navy">4</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-pink to-pink">
                  <Newspaper className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-card mb-8">
          <div className="glass-card-cap" />
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 h3 text-navy">
              <Filter className="w-5 h-5 text-[#0f5384]" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label
                  htmlFor="search"
                  className="body-2 text-light-100 mb-2 block"
                >
                  Search
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-light-200" />
                  <Input
                    id="search"
                    placeholder="Search news..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="shad-input pl-10"
                  />
                </div>
              </div>

              <div>
                <Label
                  htmlFor="type"
                  className="body-2 text-slate-600 mb-2 block"
                >
                  Type
                </Label>
                <Select
                  value={typeFilter}
                  onValueChange={(value) => {
                    setTypeFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="shad-input">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="announcement">Announcements</SelectItem>
                    <SelectItem value="update">Updates</SelectItem>
                    <SelectItem value="alert">Alerts</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label
                  htmlFor="department"
                  className="body-2 text-light-100 mb-2 block"
                >
                  Department
                </Label>
                <Select
                  value={departmentFilter}
                  onValueChange={(value) => {
                    setDepartmentFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="shad-input">
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="IT">IT</SelectItem>
                    <SelectItem value="Administration">
                      Administration
                    </SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Facilities">Facilities</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="primary-btn px-3 sm:px-4 mx-auto"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-light-300 border-t-navy"></div>
              <p className="text-sm text-light-200 font-medium">
                Loading news...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="glass-card">
            <div className="glass-card-cap" />
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red mx-auto mb-4" />
              <h3 className="h3 text-red mb-2">Error Loading News</h3>
              <p className="body-1 text-light-100">{error}</p>
              <Button onClick={fetchNewsItems} className="mt-4 primary-btn">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* News Grid */}
        {!loading && !error && newsItems.length === 0 && (
          <Card className="glass-card">
            <div className="glass-card-cap" />
            <CardContent className="p-12 text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-light-300 mx-auto mb-4">
                <Newspaper className="w-8 h-8 text-light-200" />
              </div>
              <h3 className="h3 text-light-100 mb-2">No News Found</h3>
              <p className="body-1 text-light-200">
                No news articles match your current filters
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && newsItems.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {newsItems.map((item) => (
                <div key={item.id} className="group cursor-pointer">
                  <Card className="glass-card hover:shadow-drop-3 transition-all duration-300 overflow-hidden mb-4">
                    <div className="glass-card-cap z-10" />

                    {/* Featured Image */}
                    <div className="relative w-full h-full mt-4 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Newspaper className="w-16 h-16 text-light-300" />
                        </div>
                      )}

                      {/* Type Badge Overlay */}
                      <div className="absolute top-6 left-3">
                        <Badge
                          variant="outline"
                          className={`text-xs px-3 py-1 backdrop-blur-xl bg-white/90 border-white/40 shadow-lg ${getTypeColor(
                            item.type
                          )}`}
                        >
                          <span className="flex items-center gap-1">
                            {getTypeIcon(item.type)}
                            {item.type}
                          </span>
                        </Badge>
                      </div>

                      {/* Department Badge */}
                      {item.department && (
                        <div className="absolute top-6 right-3">
                          <Badge className="text-xs px-3 py-1 backdrop-blur-md bg-dark-200/80 text-white border-dark-100/40 shadow-lg">
                            {item.department}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Content Below Card */}
                  <div className="space-y-3">
                    {/* Title */}
                    <h3 className="text-lg font-semibold sidebar-gradient-text line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h3>

                    {/* Content Preview */}
                    <p className="text-sm text-light-100 line-clamp-3">
                      {item.content}
                    </p>

                    {/* Metadata Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <User className="h-3.5 w-3.5" />
                        <span className="font-medium">{item.author}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-light-200">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDate(item.date)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Card className="glass-card">
                <div className="glass-card-cap" />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-light-100">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                      {Math.min(currentPage * itemsPerPage, totalItems)} of{' '}
                      {totalItems} articles
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="primary-btn px-3 sm:px-4"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1
                        ).map((page) => {
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            const isCurrentPage = page === currentPage;
                            return isCurrentPage ? (
                              <Button
                                key={page}
                                size="sm"
                                onClick={() => handlePageChange(page)}
                                className="bg-transparent text-navy hover:bg-transparent"
                              >
                                {page}
                              </Button>
                            ) : (
                              <Button
                                key={page}
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePageChange(page)}
                                className="px-3 py-1 text-navy"
                              >
                                {page}
                              </Button>
                            );
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <span key={page} className="px-2 text-light-200">
                                ...
                              </span>
                            );
                          }
                          return null;
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="primary-btn px-3 sm:px-4"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    );
  }

  // Widget View
  if (loading) {
    return (
      <Card className="w-full h-[200px] sm:h-[250px] lg:h-[290px] glass-card overflow-hidden">
        <div className="glass-card-cap" />
        <CardHeader className="pb-3 pt-6 px-4">
          <CardTitle className="text-sm font-semibold sidebar-gradient-text">
            Company News
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center justify-center h-32">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-light-300 border-t-navy"></div>
              <p className="text-xs text-light-200 font-medium">
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
      <Card className="w-full h-[200px] sm:h-[250px] lg:h-[290px] glass-card overflow-hidden">
        <div className="glass-card-cap" />
        <CardHeader className="pb-3 pt-6 px-4">
          <CardTitle className="text-sm font-semibold sidebar-gradient-text">
            Company News
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-col items-center justify-center h-32 gap-3">
            <div className="w-10 h-10 bg-red/10 rounded-full flex items-center justify-center">
              <Newspaper className="h-5 w-5 text-red" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-navy">News Unavailable</p>
              <p className="text-xs text-light-200">Check your connection</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card w-full h-auto min-h-[200px] sm:min-h-[250px] lg:min-h-[300px]">
      <div className="glass-card-cap" />
      {/* Header */}
      <CardHeader className="pb-3 pt-6 px-4">
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

                <h4 className="text-sm font-semibold text-navy mb-1 line-clamp-1">
                  {item.title}
                </h4>

                <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                  {item.content}
                </p>

                <div className="flex items-center gap-1 text-xs text-light-200">
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
        <div className="mt-3 border-t border-white/20 pt-3">
          <div className="flex items-center justify-center">
            <Link
              href="/company-news"
              className="flex items-center gap-1 text-xs text-light-100 hover:text-navy transition-colors duration-200"
            >
              <span>View All News</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanyNewsFeed;
