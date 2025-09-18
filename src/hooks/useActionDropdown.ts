import useSWR, { mutate } from 'swr';
import { useAuth } from '@/contexts/AuthContext';

// interface UserEmail {
//   $id: string;
//   email: string;
//   fullName: string;
//   department: string;
//   role: string;
//   avatar?: string;
// }

interface FileAction {
  $id: string;
  action: 'assign' | 'share' | 'archive' | 'delete' | 'download';
  fileId: string;
  userId: string;
  targetUserId?: string;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch action dropdown data');
  }
  return response.json();
};

export const useActionDropdown = (fileId?: string) => {
  const { user } = useAuth();

  // User emails for assignment/sharing
  const {
    data: userEmails,
    error: emailsError,
    isLoading: emailsLoading,
  } = useSWR(`/api/users/emails`, fetcher, {
    refreshInterval: 120000, // Refresh every 2 minutes
    revalidateOnFocus: true,
  });

  // File actions history
  const {
    data: fileActions,
    error: actionsError,
    isLoading: actionsLoading,
  } = useSWR(fileId ? `/api/files/${fileId}/actions` : null, fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
  });

  // User permissions for file
  const {
    data: userPermissions,
    error: permissionsError,
    isLoading: permissionsLoading,
  } = useSWR(
    fileId && user?.$id
      ? `/api/files/${fileId}/permissions?userId=${user.$id}`
      : null,
    fetcher,
    {
      revalidateOnFocus: true,
    }
  );

  // Assign file to user
  const assignFile = async (targetUserId: string) => {
    if (!fileId) throw new Error('File ID is required');

    try {
      const response = await fetch(`/api/files/${fileId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId,
          assignedBy: user?.$id,
        }),
      });

      if (!response.ok) throw new Error('Failed to assign file');

      // Optimistic update
      mutate(
        `/api/files/${fileId}/actions`,
        (current: FileAction[] | undefined) => [
          ...(current || []),
          {
            $id: `action_${Date.now()}`,
            action: 'assign' as const,
            fileId,
            userId: user?.$id || '',
            targetUserId,
            timestamp: new Date().toISOString(),
            status: 'completed' as const,
          },
        ],
        false
      );

      return response.json();
    } catch (error) {
      console.error('Failed to assign file:', error);
      throw error;
    }
  };

  // Share file with user
  const shareFile = async (targetUserId: string, permissions: string[]) => {
    if (!fileId) throw new Error('File ID is required');

    try {
      const response = await fetch(`/api/files/${fileId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId,
          permissions,
          sharedBy: user?.$id,
        }),
      });

      if (!response.ok) throw new Error('Failed to share file');

      // Optimistic update
      mutate(
        `/api/files/${fileId}/actions`,
        (current: FileAction[] | undefined) => [
          ...(current || []),
          {
            $id: `action_${Date.now()}`,
            action: 'share' as const,
            fileId,
            userId: user?.$id || '',
            targetUserId,
            timestamp: new Date().toISOString(),
            status: 'completed' as const,
          },
        ],
        false
      );

      return response.json();
    } catch (error) {
      console.error('Failed to share file:', error);
      throw error;
    }
  };

  // Archive file
  const archiveFile = async () => {
    if (!fileId) throw new Error('File ID is required');

    try {
      const response = await fetch(`/api/files/${fileId}/archive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archivedBy: user?.$id,
        }),
      });

      if (!response.ok) throw new Error('Failed to archive file');

      // Optimistic update
      mutate(
        `/api/files/${fileId}/actions`,
        (current: FileAction[] | undefined) => [
          ...(current || []),
          {
            $id: `action_${Date.now()}`,
            action: 'archive' as const,
            fileId,
            userId: user?.$id || '',
            timestamp: new Date().toISOString(),
            status: 'completed' as const,
          },
        ],
        false
      );

      return response.json();
    } catch (error) {
      console.error('Failed to archive file:', error);
      throw error;
    }
  };

  // Delete file
  const deleteFile = async () => {
    if (!fileId) throw new Error('File ID is required');

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deletedBy: user?.$id,
        }),
      });

      if (!response.ok) throw new Error('Failed to delete file');

      // Optimistic update
      mutate(
        `/api/files/${fileId}/actions`,
        (current: FileAction[] | undefined) => [
          ...(current || []),
          {
            $id: `action_${Date.now()}`,
            action: 'delete' as const,
            fileId,
            userId: user?.$id || '',
            timestamp: new Date().toISOString(),
            status: 'completed' as const,
          },
        ],
        false
      );

      return response.json();
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  };

  // Download file
  const downloadFile = async () => {
    if (!fileId) throw new Error('File ID is required');

    try {
      const response = await fetch(`/api/files/${fileId}/download`, {
        method: 'GET',
      });

      if (!response.ok) throw new Error('Failed to download file');

      // Track download action
      mutate(
        `/api/files/${fileId}/actions`,
        (current: FileAction[] | undefined) => [
          ...(current || []),
          {
            $id: `action_${Date.now()}`,
            action: 'download' as const,
            fileId,
            userId: user?.$id || '',
            timestamp: new Date().toISOString(),
            status: 'completed' as const,
          },
        ],
        false
      );

      return response;
    } catch (error) {
      console.error('Failed to download file:', error);
      throw error;
    }
  };

  return {
    // Data
    userEmails: userEmails?.data || [],
    fileActions: fileActions?.data || [],
    userPermissions: userPermissions?.data || {
      canView: false,
      canEdit: false,
      canDelete: false,
      canShare: false,
    },

    // Loading states
    isLoading: emailsLoading || actionsLoading || permissionsLoading,
    emailsLoading,
    actionsLoading,
    permissionsLoading,

    // Errors
    error: emailsError || actionsError || permissionsError,
    emailsError,
    actionsError,
    permissionsError,

    // Actions
    assignFile,
    shareFile,
    archiveFile,
    deleteFile,
    downloadFile,
  };
};
