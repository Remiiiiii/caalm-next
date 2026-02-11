'use client';

import React from 'react';
import Sort from './Sort';
import ContractsTopControls from './ContractsTopControls';
import type { UIFileDoc } from '@/types/files';
import { ContractsViewToggle } from './ContractsViewToggle';

interface ContractsControlBarProps {
  files: UIFileDoc[];
}

export default function ContractsControlBar({
  files,
}: ContractsControlBarProps) {
  return (
    <div className="w-full">
      {/* Main Control Bar */}
      <div className="glass-card">
        {/* Professional Cap */}
        <div className="glass-card-cap" />
        {/* Control Bar Content */}
        <div className="flex pt-6 pb-4 px-6 gap-4 justify-between h-22">
          <ContractsTopControls files={files} />
          <div className="flex items-center gap-2 justify-end">
            {/* Right side: View, Sort */}
            <Sort />
            <ContractsViewToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
