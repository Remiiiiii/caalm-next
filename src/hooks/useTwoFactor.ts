import useSWR, { mutate } from 'swr';
import { useAuth } from '@/contexts/AuthContext';

interface TwoFactorStatus {
  has2FA: boolean;
  twoFactorEnabled: boolean | null;
  twoFactorSecret: string | null;
  twoFactorFactorId: string | null;
  twoFactorSetupAt: string | null;
}

interface TwoFactorSetup {
  qrCode: string;
  secret: string;
  factorId: string;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch 2FA data');
  }
  return response.json();
};

export const useTwoFactor = (userId?: string) => {
  const { user } = useAuth();
  const currentUserId = userId || user?.$id;

  // 2FA Status
  const { data: twoFactorStatus, error: statusError, isLoading: statusLoading } = useSWR(
    currentUserId ? `/api/2fa/status` : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  // 2FA Setup (QR code generation)
  const { data: twoFactorSetup, error: setupError, isLoading: setupLoading } = useSWR(
    currentUserId && !twoFactorStatus?.data?.has2FA ? `/api/2fa/setup` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  // Setup 2FA
  const setupTwoFactor = async (verificationCode: string) => {
    if (!currentUserId) throw new Error('User ID is required');

    try {
      const response = await fetch('/api/2fa/setup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          verificationCode,
        }),
      });

      if (!response.ok) throw new Error('Failed to setup 2FA');

      // Optimistic update
      mutate(
        `/api/2fa/status`,
        {
          data: {
            has2FA: true,
            twoFactorEnabled: true,
            twoFactorSecret: twoFactorSetup?.data?.secret,
            twoFactorFactorId: twoFactorSetup?.data?.factorId,
            twoFactorSetupAt: new Date().toISOString(),
          },
        },
        false
      );

      // Clear setup data
      mutate(`/api/2fa/setup`, null, false);

      return response.data;
    } catch (error) {
      console.error('Failed to setup 2FA:', error);
      throw error;
    }
  };

  // Verify 2FA
  const verifyTwoFactor = async (verificationCode: string) => {
    if (!currentUserId) throw new Error('User ID is required');

    try {
      const response = await fetch('/api/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          verificationCode,
        }),
      });

      if (!response.ok) throw new Error('Invalid verification code');

      return response.data;
    } catch (error) {
      console.error('Failed to verify 2FA:', error);
      throw error;
    }
  };

  // Disable 2FA
  const disableTwoFactor = async () => {
    if (!currentUserId) throw new Error('User ID is required');

    try {
      const response = await fetch('/api/2fa/disable', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
        }),
      });

      if (!response.ok) throw new Error('Failed to disable 2FA');

      // Optimistic update
      mutate(
        `/api/2fa/status`,
        {
          data: {
            has2FA: false,
            twoFactorEnabled: false,
            twoFactorSecret: null,
            twoFactorFactorId: null,
            twoFactorSetupAt: null,
          },
        },
        false
      );

      return response.data;
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      throw error;
    }
  };

  // Regenerate 2FA secret
  const regenerateSecret = async () => {
    if (!currentUserId) throw new Error('User ID is required');

    try {
      const response = await fetch('/api/2fa/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
        }),
      });

      if (!response.ok) throw new Error('Failed to regenerate 2FA secret');

      // Refresh setup data
      mutate(`/api/2fa/setup`);

      return response.data;
    } catch (error) {
      console.error('Failed to regenerate 2FA secret:', error);
      throw error;
    }
  };

  // Refresh all 2FA data
  const refreshTwoFactor = () => {
    mutate(`/api/2fa/status`);
    mutate(`/api/2fa/setup`);
  };

  return {
    // Data
    status: twoFactorStatus?.data as TwoFactorStatus | null,
    setup: twoFactorSetup?.data as TwoFactorSetup | null,

    // Loading states
    isLoading: statusLoading || setupLoading,
    statusLoading,
    setupLoading,

    // Errors
    error: statusError || setupError,
    statusError,
    setupError,

    // Actions
    setupTwoFactor,
    verifyTwoFactor,
    disableTwoFactor,
    regenerateSecret,
    refreshTwoFactor,
  };
}; 