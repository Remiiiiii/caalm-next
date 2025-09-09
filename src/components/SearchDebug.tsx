'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SearchDebug: React.FC = () => {
  const { user, loading, isSessionValid } = useAuth();

  const testSearch = async () => {
    console.log('=== SEARCH DEBUG TEST ===');
    console.log('User:', user);
    console.log('User ID:', user?.$id);
    console.log('Loading:', loading);
    console.log('Session Valid:', isSessionValid);

    if (!user?.$id) {
      console.log('❌ No user ID - search will not work');
      return;
    }

    console.log('✅ User ID found, search should work');
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Search Debug Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p>
            <strong>User ID:</strong> {user?.$id || 'Not logged in'}
          </p>
          <p>
            <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
          </p>
          <p>
            <strong>Session Valid:</strong> {isSessionValid ? 'Yes' : 'No'}
          </p>
          <p>
            <strong>User Name:</strong> {user?.name || 'N/A'}
          </p>
          <p>
            <strong>User Email:</strong> {user?.email || 'N/A'}
          </p>

          <Button onClick={testSearch} className="mt-4">
            Test Search Debug
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchDebug;
