'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SearchDashboard from '@/components/SearchDashboard';
import EnhancedSearch from '@/components/EnhancedSearch';
import SearchDebug from '@/components/SearchDebug';
import SimpleSearchTest from '@/components/SimpleSearchTest';

interface SearchResult {
  id: string;
  type: 'contract' | 'file';
  name: string;
  contractName?: string;
  vendor?: string;
  department?: string;
  status?: string;
  amount?: number;
  searchScore?: number;
  $createdAt: string;
}

export default function TestSearchPage() {
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);

  const handleSearchResults = (results: SearchResult[]) => {
    setSearchResults(results);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Advanced Search & Filtering Test
        </h1>
        <p className="text-gray-600">
          Test the new enhanced search functionality with autocomplete,
          analytics, and advanced filtering
        </p>
      </div>

      {/* Debug Information */}
      <SearchDebug />

      {/* Simple Search Test */}
      <SimpleSearchTest />

      {/* Option 1: Full Search Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>Full Search Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <SearchDashboard onSearchResults={handleSearchResults} />
        </CardContent>
      </Card>

      {/* Option 2: Standalone Enhanced Search */}
      <Card>
        <CardHeader>
          <CardTitle>Standalone Enhanced Search</CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedSearch
            onResults={handleSearchResults}
            showAnalytics={true}
          />
        </CardContent>
      </Card>

      {/* Search Results Display */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results ({searchResults.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {searchResults.map((result, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <h3 className="font-semibold text-lg">
                    {result.contractName || result.name || 'Untitled'}
                  </h3>
                  <div className="mt-2 text-sm text-gray-600">
                    <p>
                      <strong>Type:</strong> {result.type}
                    </p>
                    {result.vendor && (
                      <p>
                        <strong>Vendor:</strong> {result.vendor}
                      </p>
                    )}
                    {result.department && (
                      <p>
                        <strong>Department:</strong> {result.department}
                      </p>
                    )}
                    {result.status && (
                      <p>
                        <strong>Status:</strong> {result.status}
                      </p>
                    )}
                    {result.amount && (
                      <p>
                        <strong>Amount:</strong> $
                        {result.amount.toLocaleString()}
                      </p>
                    )}
                    <p>
                      <strong>Search Score:</strong>{' '}
                      {result.searchScore?.toFixed(2)}
                    </p>
                    <p>
                      <strong>Created:</strong>{' '}
                      {new Date(result.$createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Testing Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Test the Search Feature</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">1. Basic Search Testing:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Type in the search box to see autocomplete suggestions</li>
                <li>
                  Try searching for contract names, vendors, or departments
                </li>
                <li>Press Enter or click Search to execute the search</li>
                <li>Notice the search time displayed after each search</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">2. Autocomplete Features:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Start typing to see real-time suggestions</li>
                <li>Recent searches appear with a clock icon</li>
                <li>Trending searches appear with a trending icon</li>
                <li>Click on any suggestion to use it</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">3. Analytics Dashboard:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>View search statistics in the analytics section</li>
                <li>Check popular searches and filter usage</li>
                <li>Monitor search performance metrics</li>
                <li>Review recent search activity</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">4. Search Results:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Results are ranked by relevance score</li>
                <li>Search terms are highlighted in results</li>
                <li>Each result shows search score and metadata</li>
                <li>Results include both contracts and files</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
