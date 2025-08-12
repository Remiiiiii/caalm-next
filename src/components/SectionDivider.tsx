'use client';

import React from 'react';

export default function SectionDivider() {
  return (
    <div className="w-full z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-6">
          <div
            className="h-px flex-1 border-t border-dashed border-slate-300/70"
            style={{ borderTopWidth: 1 }}
          />
          <p className="text-slate-700 text-sm md:text-base text-center whitespace-nowrap">
            Adopted by renowned, trusted, and leading enterprises
          </p>
          <div
            className="h-px flex-1 border-t border-dashed border-slate-300/70"
            style={{ borderTopWidth: 1 }}
          />
        </div>
      </div>
    </div>
  );
}
