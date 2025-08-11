import { Models } from 'node-appwrite';

// Centralized UI-facing file document type used across components
export interface UIFileDoc extends Models.Document {
  // Core file properties used in UI
  type: string;
  extension: string;
  url: string;
  name: string;
  size: number;
  owner: { fullName: string } | string;
  users: string[];

  // Contract linkage and metadata
  contractId?: string;
  contractName?: string;
  contractExpiryDate?: string;
  status?: string;

  // Storage/other optional attributes referenced by UI
  bucketFileId?: string;
  description?: string;
}

