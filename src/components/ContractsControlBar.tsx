'use client';

import React from 'react';
import { ContractsViewToggle } from './ContractsViewToggle';
import Sort from './Sort';

export default function ContractsControlBar() {
  return (
    <div className="w-full">
      {/* Main Control Bar */}
      <div className="glass-card">
        {/* Professional Cap */}
        <div className="glass-card-cap" />

        {/* Control Bar Content */}
        <div className="pt-6 pb-4 px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end w-full">
            {/* Right side: View, Sort */}
            <div className="flex items-center gap-4 flex-wrap">
              <ContractsViewToggle />
              <div className="flex items-center gap-2">
                <p className="body-1 hidden text-slate-700 sm:block font-medium">
                  Sort by:
                </p>
                <Sort />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
