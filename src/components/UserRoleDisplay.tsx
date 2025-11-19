'use client';

import { useRoleName } from '@/hooks/useRoleName';

interface UserRoleDisplayProps {
  userId: string;
}

/**
 * Component to display user role name dynamically
 * Fetches role name from database
 */
export function UserRoleDisplay({ userId }: UserRoleDisplayProps) {
  const { roleName, loading } = useRoleName({ userId });

  if (loading) {
    return <span className="text-muted-foreground">Loading...</span>;
  }

  return <span>{roleName || 'N/A'}</span>;
}

