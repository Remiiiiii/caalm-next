'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import LicensesView from './LicensesView';
import type { License } from '@/types/licenses';
import { useLicensesFilter } from './LicensesView';
import { applyLicenseFilters } from '@/lib/licenses/applyLicenseFilters';

interface LicensesViewClientProps {
  licenses: License[];
  user: {
    role?: string;
  } | null;
}

export default function LicensesViewClient({
  licenses,
  user,
}: LicensesViewClientProps) {
  const router = useRouter();
  const { filters } = useLicensesFilter();

  const handleRefresh = () => {
    router.refresh();
  };

  const filteredLicenses = useMemo(
    () => applyLicenseFilters(licenses, filters),
    [licenses, filters]
  );

  return (
    <LicensesView
      licenses={filteredLicenses}
      user={user}
      onRefresh={handleRefresh}
    />
  );
}
