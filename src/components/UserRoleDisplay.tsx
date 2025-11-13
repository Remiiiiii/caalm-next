'use client';

import { useRoleName } from '@/hooks/useRoleName';

interface UserRoleDisplayProps {
  userId: string;
  legacyRole?: string | null;
}

/**
 * Component to display user role name dynamically
 * Fetches role name from database, falls back to legacy role mapping
 */
export function UserRoleDisplay({ userId, legacyRole }: UserRoleDisplayProps) {
  const { roleName, loading } = useRoleName({ userId, legacyRole });

  if (loading) {
    return <span className="text-muted-foreground">Loading...</span>;
  }

  return <span>{roleName || 'N/A'}</span>;
}

