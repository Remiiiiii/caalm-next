'use client';
import React, { useEffect, useMemo, useState } from 'react';

interface Contract {
  id: string;
  name: string;
  expiryDate: string; // ISO
}

interface ContractExpiryNotifierProps {
  contracts: Contract[];
}

const TRIGGER_DAYS = new Set([30, 15, 10, 5, 1]);

function daysUntil(dateISO: string): number | null {
  if (!dateISO) return null;
  const today = new Date();
  const expiry = new Date(dateISO);
  // Compare at UTC midnight to avoid timezone off-by-one
  const startOfDayUTC = (d: Date) =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const diffMs = startOfDayUTC(expiry) - startOfDayUTC(today);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// NOTE: Using an iframe embed for Spline to avoid package export issues on Vercel

export default function ContractExpiryNotifier({
  contracts,
}: ContractExpiryNotifierProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(
    () => new Set()
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem('contract-expiry-dismissed');
      if (raw) setDismissedIds(new Set(JSON.parse(raw)));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        'contract-expiry-dismissed',
        JSON.stringify(Array.from(dismissedIds))
      );
    } catch {}
  }, [dismissedIds]);

  // Filter contracts that match trigger day and are not dismissed
  const dueContracts = useMemo(() => {
    return contracts
      .map((c) => ({ c, days: daysUntil(c.expiryDate) }))
      .filter(
        (x): x is { c: Contract; days: number } => typeof x.days === 'number'
      )
      .filter((x) => TRIGGER_DAYS.has(x.days))
      .filter((x) => !dismissedIds.has(x.c.id));
  }, [contracts, dismissedIds]);

  if (dueContracts.length === 0) return null;

  // Show one at a time; if multiple, stack by cycling or show the first
  const top = dueContracts[0];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        background: 'transparent',
      }}
      aria-live="polite"
    >
      <div
        style={{
          position: 'absolute',
          right: 24,
          bottom: 24,
          width: 400,
          height: 300,
          background: 'transparent',
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 16,
            overflow: 'hidden',
            background: 'transparent',
          }}
        >
          {/* Spline iframe embed for compatibility */}
          <iframe
            src="https://prod.spline.design/JSDRNnN1k9dO-WXj/scene.splinecode"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            title="Contract Expiry Spline"
          />
          <div
            style={{
              position: 'absolute',
              left: 16,
              bottom: 16,
              right: 56,
              color: '#111827',
              fontSize: 14,
              fontWeight: 600,
              textShadow: '0 1px 2px rgba(255,255,255,0.6)',
            }}
          >
            Contract &quot;{top.c.name}&quot; expires in {top.days} day(s)
          </div>
          <button
            onClick={() => setDismissedIds((s) => new Set(s).add(top.c.id))}
            style={{
              position: 'absolute',
              right: 12,
              top: 12,
              width: 32,
              height: 32,
              borderRadius: 16,
              border: '1px solid rgba(0,0,0,0.1)',
              background: 'rgba(255,255,255,0.8)',
              cursor: 'pointer',
            }}
            aria-label="Dismiss contract expiry notification"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
