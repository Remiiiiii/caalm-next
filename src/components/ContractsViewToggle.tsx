'use client';

import { Table, LayoutGrid } from 'lucide-react';
import { useContractsView, ViewType } from './ContractsView';
import { cn } from '@/lib/utils';

export function ContractsViewToggle() {
  const { view, handleViewChange } = useContractsView();

  return (
    <div className="flex items-center">
      <p className="body-1 hidden text-light-200 sm:block mr-2">View:</p>
      <div className="inline-flex items-center rounded-lg border border-input bg-background p-1">
        <button
          onClick={() => handleViewChange('card')}
          className={cn(
            'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
            view === 'card'
              ? 'bg-[#03afbf] text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
          aria-label="Card view"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleViewChange('table')}
          className={cn(
            'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
            view === 'table'
              ? 'bg-[#03afbf] text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
          aria-label="Table view"
        >
          <Table className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
