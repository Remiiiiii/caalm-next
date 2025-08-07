// import useSWR, { mutate } from 'swr';
// import { useAuth } from '@/contexts/AuthContext';

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

// const fetcher = async (url: string) => {
//   const response = await fetch(url);
//   if (!response.ok) {
//     throw new Error('Failed to fetch document data');
//   }
//   return response.json();
// };

export const useDocumentViewer = (fileId: string) => {
  // const { user } = useAuth();

  // File Content (PDF text extraction) - Disabled as API doesn't exist
  const fileContent = null;
  const contentError = null;
  const contentLoading = false;

  // AI Analysis - Disabled as API doesn't exist
  const aiAnalysis = null;
  const analysisError = null;
  const analysisLoading = false;

  // PDF Metadata - Disabled as API doesn't exist
  const pdfMetadata = null;
  const metadataError = null;
  const metadataLoading = false;

  // Extract PDF text - Disabled as API doesn't exist
  const extractText = async () => {
    if (!fileId || fileId.trim() === '') {
      console.warn('extractText called with empty fileId');
      return null;
    }

    console.warn('extractText: API endpoints do not exist in this application');
    return null;
  };

  // Analyze with AI - Disabled as API doesn't exist
  const analyzeWithAI = async () => {
    if (!fileId || fileId.trim() === '') {
      console.warn('analyzeWithAI called with empty fileId');
      return null;
    }

    console.warn(
      'analyzeWithAI: API endpoints do not exist in this application'
    );
    return null;
  };

  // Refresh all data - Disabled as API doesn't exist
  const refreshAll = () => {
    if (!fileId || fileId.trim() === '') {
      console.warn('refreshAll called with empty fileId');
      return;
    }

    console.warn('refreshAll: API endpoints do not exist in this application');
  };

  return {
    // Data
    fileContent: fileContent as FileContent | null,
    aiAnalysis: aiAnalysis as AIAnalysis | null,
    pdfMetadata: pdfMetadata as PDFMetadata | null,

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
