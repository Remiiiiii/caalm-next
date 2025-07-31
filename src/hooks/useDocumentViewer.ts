import useSWR, { mutate } from 'swr';
import { useAuth } from '@/contexts/AuthContext';

interface FileContent {
  $id: string;
  content: string;
  extractedAt: string;
  fileId: string;
}

interface AIAnalysis {
  $id: string;
  fileId: string;
  analysis: string;
  summary: string;
  keyPoints: string[];
  riskLevel: 'low' | 'medium' | 'high';
  createdAt: string;
}

interface PDFMetadata {
  pages: number;
  size: number;
  title?: string;
  author?: string;
  subject?: string;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch document data');
  }
  return response.json();
};

export const useDocumentViewer = (fileId: string) => {
  const { user } = useAuth();

  // File Content (PDF text extraction)
  const {
    data: fileContent,
    error: contentError,
    isLoading: contentLoading,
  } = useSWR(fileId ? `/api/documents/${fileId}/content` : null, fetcher, {
    revalidateOnFocus: false, // Don't revalidate on focus for large content
    revalidateOnReconnect: true,
    dedupingInterval: 300000, // 5 minutes deduping
  });

  // AI Analysis
  const {
    data: aiAnalysis,
    error: analysisError,
    isLoading: analysisLoading,
  } = useSWR(fileId ? `/api/documents/${fileId}/analysis` : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 600000, // 10 minutes deduping for AI analysis
  });

  // PDF Metadata
  const {
    data: pdfMetadata,
    error: metadataError,
    isLoading: metadataLoading,
  } = useSWR(fileId ? `/api/documents/${fileId}/metadata` : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  // Extract PDF text
  const extractText = async () => {
    try {
      const response = await fetch(`/api/documents/${fileId}/extract`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to extract text');

      // Optimistic update
      mutate(`/api/documents/${fileId}/content`, response.data, false);

      return response.data;
    } catch (error) {
      console.error('Failed to extract text:', error);
      throw error;
    }
  };

  // Analyze with AI
  const analyzeWithAI = async () => {
    try {
      const response = await fetch(`/api/documents/${fileId}/analyze`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to analyze document');

      // Optimistic update
      mutate(`/api/documents/${fileId}/analysis`, response.data, false);

      return response.data;
    } catch (error) {
      console.error('Failed to analyze document:', error);
      throw error;
    }
  };

  // Refresh all data
  const refreshAll = () => {
    mutate(`/api/documents/${fileId}/content`);
    mutate(`/api/documents/${fileId}/analysis`);
    mutate(`/api/documents/${fileId}/metadata`);
  };

  return {
    // Data
    fileContent: fileContent?.data as FileContent | null,
    aiAnalysis: aiAnalysis?.data as AIAnalysis | null,
    pdfMetadata: pdfMetadata?.data as PDFMetadata | null,

    // Loading states
    isLoading: contentLoading || analysisLoading || metadataLoading,
    contentLoading,
    analysisLoading,
    metadataLoading,

    // Errors
    error: contentError || analysisError || metadataError,
    contentError,
    analysisError,
    metadataError,

    // Actions
    extractText,
    analyzeWithAI,
    refreshAll,
  };
};
