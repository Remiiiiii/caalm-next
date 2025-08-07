import useSWR from 'swr';
import type { AppUser } from '@/lib/actions/user.actions';
import { swrConfig, swrKeys } from '@/lib/swr-config';

interface UseUsersOptions {
  enableRealTime?: boolean;
  pollingInterval?: number;
}

// Type guard for user document
function isAppUserDoc(
  u: unknown
): u is AppUser & { $id: string; department?: string } {
  return (
    typeof u === 'object' &&
    u !== null &&
    'fullName' in u &&
    'email' in u &&
    'avatar' in u &&
    'accountId' in u &&
    'role' in u &&
    '$id' in u
  );
}

export const useUsers = ({
  enableRealTime = true,
  pollingInterval = 15000, // 15 seconds for users (less frequent than calendar)
}: UseUsersOptions = {}) => {
  // Use the global SWR key
  const key = swrKeys.users();

  const {
    data: rawUsers = [],
    error,
    isLoading,
    mutate,
  } = useSWR(key, swrConfig.fetcher || null, {
    ...swrConfig,
    refreshInterval: enableRealTime ? pollingInterval : 0,
  });

  // Process and validate users
  const users = Array.isArray(rawUsers)
    ? rawUsers.filter(isAppUserDoc).map((u) => ({
        $id: u.$id,
        fullName: u.fullName,
        email: u.email,
        avatar: u.avatar,
        accountId: u.accountId,
        role: u.role,
        department: u.department,
        status: u.status || 'active', // fallback to 'active'
      }))
    : [];

  const refresh = () => mutate();

  return {
    users,
    isLoading,
    error: error ? 'Failed to load users' : null,
    lastUpdate: new Date(),
    refresh,
  };
};
