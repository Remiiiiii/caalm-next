'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SimpleSearchTest: React.FC = () => {
  const [query, setQuery] = useState('test-contract (1).pdf');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testSearch = async () => {
    console.log('=== SIMPLE SEARCH TEST ===');
    console.log('Query:', query);

    setLoading(true);
    setResults([]);

    try {
      // Test the API endpoint directly
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&limit=10`
      );
      console.log('API Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        setResults([{ error: `API Error: ${response.status} - ${errorText}` }]);
        return;
      }

      const data = await response.json();
      console.log('API Response Data:', data);

      setResults(data.results || []);
    } catch (error) {
      console.error('Search Error:', error);
      setResults([{ error: `Network Error: ${error}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Simple Search Test (No Auth Required)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter search query"
              className="flex-1"
            />
            <Button onClick={testSearch} disabled={loading}>
              {loading ? 'Testing...' : 'Test API'}
            </Button>
          </div>

          {results.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">
                Results ({results.length}):
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {results.map((result, index) => (
                  <div key={index} className="p-2 border rounded text-sm">
                    {result.error ? (
                      <div className="text-red-600">{result.error}</div>
                    ) : (
                      <div>
                        <div>
                          <strong>ID:</strong> {result.id}
                        </div>
                        <div>
                          <strong>Type:</strong> {result.type}
                        </div>
                        <div>
                          <strong>Name:</strong>{' '}
                          {result.name || result.contractName}
                        </div>
                        <div>
                          <strong>Score:</strong> {result.searchScore}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleSearchTest;
