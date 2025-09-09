'use client';

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import SearchModal from './SearchModal';

const SearchInput: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle keyboard shortcut (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsModalOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Search contracts..."
          onClick={() => setIsModalOpen(true)}
          readOnly
          className="pl-10 pr-4 py-2 w-64 text-sm border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
            Ctrl+K
          </span>
        </div>
      </div>

      <SearchModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default SearchInput;
