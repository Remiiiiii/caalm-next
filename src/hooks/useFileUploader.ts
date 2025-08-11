import useSWR, { mutate } from 'swr';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface FileUpload {
  $id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  uploadedAt?: string;
  error?: string;
}

interface FileList {
  $id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  status: 'active' | 'archived' | 'deleted';
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch file data');
  }
  return response.json();
};

export const useFileUploader = (department?: string) => {
  const { user } = useAuth();
  const [uploads, setUploads] = useState<FileUpload[]>([]);

  // File list
  const { data: fileList, error: fileListError, isLoading: fileListLoading } = useSWR(
    `/api/files?department=${department || 'all'}`,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  );

  // Upload queue
  const { data: uploadQueue, error: queueError, isLoading: queueLoading } = useSWR(
    user?.$id ? `/api/files/upload-queue?userId=${user.$id}` : null,
    fetcher,
    {
      refreshInterval: 5000, // Refresh every 5 seconds for upload status
    }
  );

  // Storage usage
  const { data: storageUsage, error: storageError, isLoading: storageLoading } = useSWR(
    user?.$id ? `/api/files/storage-usage?userId=${user.$id}` : null,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
    }
  );

  // Add file to upload queue
  const addToUploadQueue = async (file: File) => {
    const uploadId = `upload_${Date.now()}_${Math.random()}`;
    const newUpload: FileUpload = {
      $id: uploadId,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      progress: 0,
    };

    setUploads(prev => [...prev, newUpload]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user?.$id || '');
      formData.append('department', department || '');
      formData.append('uploadId', uploadId);

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      // Update upload status
      setUploads(prev =>
        prev.map(upload =>
          upload.$id === uploadId
            ? { ...upload, status: 'completed', progress: 100, uploadedAt: new Date().toISOString() }
            : upload
        )
      );

      // Refresh file list
      mutate(`/api/files?department=${department || 'all'}`);
      mutate(`/api/files/storage-usage?userId=${user?.$id}`);

      return response.data;
    } catch (error) {
      // Update upload status to failed
      setUploads(prev =>
        prev.map(upload =>
          upload.$id === uploadId
            ? { ...upload, status: 'failed', error: error.message }
            : upload
        )
      );

      console.error('Upload failed:', error);
      throw error;
    }
  };

  // Update upload progress
  const updateUploadProgress = (uploadId: string, progress: number) => {
    setUploads(prev =>
      prev.map(upload =>
        upload.$id === uploadId
          ? { ...upload, progress, status: progress === 100 ? 'completed' : 'uploading' }
          : upload
      )
    );
  };

  // Remove upload from queue
  const removeUpload = (uploadId: string) => {
    setUploads(prev => prev.filter(upload => upload.$id !== uploadId));
  };

  // Delete file
  const deleteFile = async (fileId: string) => {
    try {
      await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });

      // Optimistic update
      mutate(
        `/api/files?department=${department || 'all'}`,
        (current: FileList[]) => current?.filter(file => file.$id !== fileId),
        false
      );

      // Refresh storage usage
      mutate(`/api/files/storage-usage?userId=${user?.$id}`);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  };

  // Archive file
  const archiveFile = async (fileId: string) => {
    try {
      await fetch(`/api/files/${fileId}/archive`, {
        method: 'PUT',
      });

      // Optimistic update
      mutate(
        `/api/files?department=${department || 'all'}`,
        (current: FileList[]) =>
          current?.map(file =>
            file.$id === fileId ? { ...file, status: 'archived' } : file
          ),
        false
      );
    } catch (error) {
      console.error('Failed to archive file:', error);
      throw error;
    }
  };

  // Refresh all data
  const refreshAll = () => {
    mutate(`/api/files?department=${department || 'all'}`);
    mutate(`/api/files/upload-queue?userId=${user?.$id}`);
    mutate(`/api/files/storage-usage?userId=${user?.$id}`);
  };

  return {
    // Data
    files: fileList?.data || [],
    uploadQueue: uploadQueue?.data || [],
    storageUsage: storageUsage?.data || {
      used: 0,
      total: 0,
      percentage: 0,
    },
    currentUploads: uploads,

    // Loading states
    isLoading: fileListLoading || queueLoading || storageLoading,
    fileListLoading,
    queueLoading,
    storageLoading,

    // Errors
    error: fileListError || queueError || storageError,
    fileListError,
    queueError,
    storageError,

    // Actions
    addToUploadQueue,
    updateUploadProgress,
    removeUpload,
    deleteFile,
    archiveFile,
    refreshAll,
  };
}; 