import useSWR, { mutate } from 'swr';
// import { useAuth } from '@/contexts/AuthContext';

// interface DashboardStats {
//   totalContracts: number;
//   expiringContracts: number;
//   activeUsers: number;
//   complianceRate: string;
// }

interface Invitation {
  $id: string;
  name: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  status: string;
  revoked: boolean;
  $createdAt: string;
}

// interface UninvitedUser {
//   $id: string;
//   email: string;
//   fullName: string;
//   $createdAt: string;
// }

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }
  return response.json();
};

export const useDashboardData = (orgId: string) => {
  // const { user } = useAuth();

  // Dashboard Stats
  const {
    data: stats,
    error: statsError,
    isLoading: statsLoading,
  } = useSWR(`/api/dashboard/stats?orgId=${orgId}`, fetcher, {
    refreshInterval: 60000, // Refresh every minute
    revalidateOnFocus: true,
  });

  // Recent Files
  const {
    data: files,
    error: filesError,
    isLoading: filesLoading,
  } = useSWR(`/api/dashboard/files?limit=10`, fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
  });

  // Pending Invitations
  const {
    data: invitations,
    error: invitationsError,
    isLoading: invitationsLoading,
  } = useSWR(`/api/dashboard/invitations?orgId=${orgId}`, fetcher, {
    refreshInterval: 45000, // Refresh every 45 seconds
  });

  // Auth Users (for invitation form)
  const {
    data: authUsers,
    error: authUsersError,
    isLoading: authUsersLoading,
  } = useSWR(`/api/dashboard/auth-users`, fetcher, {
    refreshInterval: 120000, // Refresh every 2 minutes (less frequent)
  });

  // Mutations for optimistic updates
  const createInvitation = async (invitationData: Record<string, unknown>) => {
    try {
      // Optimistic update - add the invitation immediately to the UI
      const optimisticInvitation: Invitation = {
        $id: `temp_${Date.now()}`, // Temporary ID for optimistic update
        name: invitationData.name,
        email: invitationData.email,
        role: invitationData.role,
        token: `temp_token_${Date.now()}`, // Temporary token
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        status: 'pending',
        revoked: false,
        $createdAt: new Date().toISOString(),
      };

      // Apply optimistic update immediately
      mutate(
        `/api/dashboard/invitations?orgId=${orgId}`,
        (current: Invitation[] | undefined) => {
          if (!current || !Array.isArray(current))
            return [optimisticInvitation];
          return [...current, optimisticInvitation];
        },
        false
      );

      // Make the API call
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invitationData),
      });

      if (!response.ok) {
        // If the API call fails, revert the optimistic update
        mutate(`/api/dashboard/invitations?orgId=${orgId}`);
        throw new Error('Failed to create invitation');
      }

      const responseData = await response.json();

      // Update the optimistic invitation with real data
      const realInvitation: Invitation = {
        ...optimisticInvitation,
        token: responseData.data.token,
        expiresAt: responseData.data.expiresAt,
      };

      // Replace the optimistic update with real data
      mutate(
        `/api/dashboard/invitations?orgId=${orgId}`,
        (current: Invitation[] | undefined) => {
          if (!current || !Array.isArray(current)) return [realInvitation];
          return current.map((inv: Invitation) =>
            inv.$id === optimisticInvitation.$id ? realInvitation : inv
          );
        },
        false
      );

      // Trigger background revalidation to ensure data consistency
      mutate(`/api/dashboard/invitations?orgId=${orgId}`);

      return responseData.data;
    } catch (error) {
      console.error('Failed to create invitation:', error);
      // Revert optimistic update on error
      mutate(`/api/dashboard/invitations?orgId=${orgId}`);
      throw error;
    }
  };

  const revokeInvitation = async (token: string) => {
    try {
      // Store the current state for potential rollback
      const currentData = await mutate(
        `/api/dashboard/invitations?orgId=${orgId}`,
        (current: Invitation[] | undefined) => {
          if (!current || !Array.isArray(current)) return current;
          return current.filter((inv: Invitation) => inv.token !== token);
        },
        false
      );

      // Make the API call
      const response = await fetch(`/api/invitations/${token}/revoke`, {
        method: 'PUT',
      });

      if (!response.ok) {
        // If the API call fails, revert the optimistic update
        mutate(`/api/dashboard/invitations?orgId=${orgId}`, currentData, false);
        throw new Error('Failed to revoke invitation');
      }

      // Success - trigger a background revalidation to ensure data consistency
      mutate(`/api/dashboard/invitations?orgId=${orgId}`);
    } catch (error) {
      console.error('Failed to revoke invitation:', error);
      // Revert optimistic update on error
      mutate(`/api/dashboard/invitations?orgId=${orgId}`);
      throw error;
    }
  };

  const refreshAll = () => {
    mutate(`/api/dashboard/stats?orgId=${orgId}`);
    mutate(`/api/dashboard/files?limit=10`);
    mutate(`/api/dashboard/invitations?orgId=${orgId}`);
    mutate(`/api/dashboard/auth-users`);
  };

  return {
    // Data
    stats: stats?.data || {
      totalContracts: 0,
      expiringContracts: 0,
      activeUsers: 0,
      complianceRate: '94%',
    },
    files: files?.data || [],
    invitations: invitations?.data || [],
    authUsers: authUsers?.data || [],

    // Loading states
    isLoading:
      statsLoading || filesLoading || invitationsLoading || authUsersLoading,
    statsLoading,
    filesLoading,
    invitationsLoading,
    authUsersLoading,

    // Errors
    error: statsError || filesError || invitationsError || authUsersError,
    statsError,
    filesError,
    invitationsError,
    authUsersError,

    // Mutations
    createInvitation,
    revokeInvitation,
    refreshAll,
  };
};
