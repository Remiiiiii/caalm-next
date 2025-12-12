'use client';

import { Table, LayoutGrid } from 'lucide-react';
import { useContractsView, ViewType } from './ContractsView';
import { cn } from '@/lib/utils';

export function ContractsViewToggle() {
  const { view, handleViewChange } = useContractsView();

  return (
    <div className="flex items-center">
      <p className="body-1 hidden text-slate-700 sm:block mr-2 font-medium">View:</p>
      <div className="inline-flex items-center rounded-lg border-2 border-slate-200 bg-white p-1 shadow-sm">
        <button
          onClick={() => handleViewChange('card')}
          className={cn(
            'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
            view === 'card'
              ? 'bg-[#03afbf] text-white shadow-md hover:bg-[#02a0af]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          )}
          aria-label="Card view"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleViewChange('table')}
          className={cn(
            'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
            view === 'table'
              ? 'bg-[#03afbf] text-white shadow-md hover:bg-[#02a0af]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          )}
          aria-label="Table view"
        >
          <Table className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
