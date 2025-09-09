'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import AdvancedSearch from '@/components/AdvancedSearch';

const SearchPage: React.FC = () => {
  const router = useRouter();

  const handleResultClick = (result: any) => {
    // Navigate to the appropriate page based on result type
    if (result.type === 'contract') {
      router.push(`/contracts/${result.id}`);
    } else {
      router.push(`/files/${result.id}`);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Advanced Search</h1>
        <p className="text-gray-600">
          Search across contracts, files, vendors, and departments with advanced filtering options.
        </p>
      </div>

      <AdvancedSearch onResultClick={handleResultClick} />
    </div>
  );
};

export default SearchPage;
