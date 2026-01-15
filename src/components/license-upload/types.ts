/**
 * Type definitions for License Upload Form
 */

export interface LicenseUploadFormProps {
  ownerId: string;
  accountId: string;
  className?: string;
  onSuccess?: () => void;
}

export interface ProcessedFileData {
  name: string;
  type: string;
  size: number;
  base64Content: string;
  arrayBuffer: ArrayBuffer;
  lastModified: number;
}

export interface Draft {
  $id: string;
  formData: string;
  currentStep: number;
  processedFileData: string | null;
  extractedData: string | null;
  progressPercentage: number;
  lastSavedAt: string;
  isCompleted: boolean;
  ownerId: string;
  accountId: string;
}

export interface Manager {
  $id: string;
  fullName: string;
  email: string;
  division?: string;
}
