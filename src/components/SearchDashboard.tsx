'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  TrendingUp,
  Clock,
  Filter,
  BarChart3,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Building,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getSearchAnalytics } from '@/lib/actions/search.actions';
import EnhancedSearch from './EnhancedSearch';
import SearchResultHighlight from './SearchResultHighlight';

interface SearchDashboardProps {
  onSearchResults?: (results: any[]) => void;
}

const SearchDashboard: React.FC<SearchDashboardProps> = ({
  onSearchResults,
}) => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');

  useEffect(() => {
    if (user?.$id) {
      loadAnalytics();
    }
  }, [user?.$id]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await getSearchAnalytics(user?.$id || '', 30);
      setAnalytics(data?.analytics);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchResults = (results: any[]) => {
    setSearchResults(results);
    setCurrentQuery('');
    onSearchResults?.(results);
  };

  const handleSearchQuery = (query: string) => {
    setCurrentQuery(query);
  };

  const getFilterIcon = (filter: string) => {
    switch (filter) {
      case 'department':
        return <Building className="h-4 w-4" />;
      case 'status':
        return <FileText className="h-4 w-4" />;
      case 'amountMin':
      case 'amountMax':
        return <DollarSign className="h-4 w-4" />;
      case 'startDate':
      case 'endDate':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Filter className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading search analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Search Component */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Contract Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedSearch
            onResults={handleSearchResults}
            showAnalytics={true}
          />
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Search Results ({searchResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {searchResults.slice(0, 5).map((result, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">
                        <SearchResultHighlight
                          text={
                            result.contractName || result.name || 'Untitled'
                          }
                          query={currentQuery}
                        />
                      </h4>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        {result.vendor && (
                          <span>
                            <Building className="h-4 w-4 inline mr-1" />
                            <SearchResultHighlight
                              text={result.vendor}
                              query={currentQuery}
                            />
                          </span>
                        )}
                        {result.department && (
                          <span>Department: {result.department}</span>
                        )}
                        {result.status && (
                          <Badge variant="outline">{result.status}</Badge>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Score: {result.searchScore?.toFixed(2)} | Created:{' '}
                        {new Date(result.$createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {searchResults.length > 5 && (
                <div className="text-center pt-4">
                  <Button variant="outline">
                    View All {searchResults.length} Results
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Dashboard */}
      {analytics && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="searches">Popular Searches</TabsTrigger>
            <TabsTrigger value="filters">Filter Usage</TabsTrigger>
            <TabsTrigger value="recent">Recent Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Search className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Total Searches
                      </p>
                      <p className="text-2xl font-bold">
                        {analytics.totalSearches}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Avg Search Time
                      </p>
                      <p className="text-2xl font-bold">
                        {Math.round(analytics.averageSearchTime)}ms
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Unique Queries
                      </p>
                      <p className="text-2xl font-bold">
                        {analytics.topSearches?.length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Filter className="h-8 w-8 text-orange-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Filter Types
                      </p>
                      <p className="text-2xl font-bold">
                        {analytics.topFilters?.length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="searches">
            <Card>
              <CardHeader>
                <CardTitle>Most Popular Searches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topSearches
                    ?.slice(0, 10)
                    .map((search: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{index + 1}</Badge>
                          <span className="font-medium">{search.query}</span>
                        </div>
                        <Badge variant="secondary">
                          {search.count} searches
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="filters">
            <Card>
              <CardHeader>
                <CardTitle>Filter Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topFilters
                    ?.slice(0, 10)
                    .map((filter: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {getFilterIcon(filter.filter)}
                          <span className="font-medium capitalize">
                            {filter.filter}
                          </span>
                        </div>
                        <Badge variant="secondary">{filter.count} uses</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent">
            <Card>
              <CardHeader>
                <CardTitle>Recent Search Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.recentSearches
                    ?.slice(0, 10)
                    .map((search: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{search.query}</p>
                            <p className="text-sm text-gray-600">
                              {search.resultCount} results • {search.searchTime}
                              ms
                            </p>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            {new Date(search.timestamp).toLocaleString()}
                          </div>
                        </div>
                        {Object.keys(search.filters || {}).length > 0 && (
                          <div className="mt-2 flex gap-2">
                            {Object.entries(search.filters).map(
                              ([key, value]) => (
                                <Badge
                                  key={key}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {key}: {String(value)}
                                </Badge>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default SearchDashboard;
