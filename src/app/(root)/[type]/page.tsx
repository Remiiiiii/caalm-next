import React from 'react';
import Image from 'next/image';
import Sort from '@/components/Sort';
import { getFiles, getTotalSpaceUsed } from '@/lib/actions/file.actions';
import { getCurrentUser } from '@/lib/actions/user.actions';
import Card from '@/components/Card';
import { getFileTypesParams } from '@/lib/utils';
import FileUsageOverview from '@/components/FileUsageOverview';
import { UIFileDoc } from '@/types/files';
import ContractsViewClient from '@/components/ContractsViewClient';
import { ContractsViewToggle } from '@/components/ContractsViewToggle';
import { ContractsViewProvider } from '@/components/ContractsView';
import ContractsControlBar from '@/components/ContractsControlBar';
import ContractsMetricsBar from '@/components/ContractsMetricsBar';
import ContractsTopControls from '@/components/ContractsTopControls';
import StorageProgressBar from '@/components/StorageProgressBar';

type FileType = 'image' | 'video' | 'audio' | 'document' | 'other';
import { createAdminClient } from '@/lib/appwrite/admin';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'appwrite';

interface SearchParamProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  params: Promise<{ [key: string]: string | string[] | undefined }>;
}

const Page = async ({ searchParams, params }: SearchParamProps) => {
  const type = ((await params)?.type as string) || '';
  const searchText = ((await searchParams)?.query as string) || '';
  const sort = ((await searchParams)?.sort as string) || '';

  let files: { documents: UIFileDoc[] } = { documents: [] };
  let filteredDocuments: UIFileDoc[] = [];
  let uniqueDepartments: string[] = [];
  let uniqueAssignedManagers: string[] = [];
  let contractDocuments: UIFileDoc[] = [];

  // Special handling for contracts - get ALL contracts from contracts collection
  if (type.toLowerCase() === 'contracts') {
    const { databases } = await createAdminClient();

    // Build queries for all contracts from the contracts collection
    const queries = [];

    if (searchText) {
      queries.push(Query.contains('contractName', searchText));
    }

    if (sort) {
      const [sortBy, orderBy] = sort.split('-');
      // Map file collection sort fields to contract collection fields
      const contractSortField =
        sortBy === '$createdAt'
          ? '$createdAt'
          : sortBy === 'name'
          ? 'contractName'
          : sortBy === 'size'
          ? 'amount'
          : sortBy;

      if (orderBy === 'asc') {
        queries.push(Query.orderAsc(contractSortField));
      } else {
        queries.push(Query.orderDesc(contractSortField));
      }
    } else {
      // Default sort by creation date descending
      queries.push(Query.orderDesc('$createdAt'));
    }

    // Get admin client for database operations
    const { tablesDB } = await createAdminClient();

    // Get all contracts from the contracts collection (not filtered by owner)
    const contractsResult = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId!,
      tableId: appwriteConfig.contractsCollectionId!,
      queries: queries,
    });

    // Helper function to validate Appwrite document ID format
    const isValidDocumentId = (id: string | null | undefined): boolean => {
      if (!id || typeof id !== 'string') return false;
      // Appwrite document IDs must be at most 36 chars, contain only a-z, A-Z, 0-9, underscore
      // and cannot start with a leading underscore
      if (id.length > 36) return false;
      if (id.startsWith('_')) return false;
      return /^[a-zA-Z0-9_]+$/.test(id);
    };

    // Convert contract documents to UIFileDoc format for compatibility with existing components
    contractDocuments = await Promise.all(
      contractsResult.rows.map(async (contract: any) => {
        // Try to get the associated file document for file-specific data
        let fileData = null;
        if (contract.fileId && isValidDocumentId(contract.fileId)) {
          try {
            fileData = await databases.getDocument({
              databaseId: appwriteConfig.databaseId!,
              collectionId: appwriteConfig.filesCollectionId!,
              documentId: contract.fileId,
            });
          } catch (error: any) {
            // Handle missing file documents gracefully (404 errors)
            if (error?.code === 404 || error?.type === 'document_not_found') {
              // Only log if it's a valid ID format - invalid IDs are expected to fail
              console.warn(
                `File document not found for contract ${contract.$id} (fileId: ${contract.fileId}). Contract will be displayed without file metadata.`
              );
              // Set fileData to null to continue processing without file data
              fileData = null;
            } else {
              // Log other errors but don't break the page
              // Suppress "Invalid documentId param" errors as they're expected for invalid IDs
              const errorMessage = error?.message || String(error);
              if (!errorMessage.includes('Invalid `documentId` param')) {
                console.warn(
                  'Could not fetch file data for contract:',
                  contract.$id,
                  errorMessage
                );
              }
              fileData = null;
            }
          }
        } else if (contract.fileId) {
          // Log invalid fileId format (but don't break the page)
          console.warn(
            `Invalid fileId format for contract ${contract.$id} (fileId: ${contract.fileId}). Skipping file document fetch.`
          );
        }

        // Create a UIFileDoc-compatible object using contract data as primary source
        const contractAsFile: UIFileDoc = {
          $id: contract.$id,
          $createdAt: contract.$createdAt,
          $updatedAt: contract.$updatedAt,
          $permissions: contract.$permissions,
          $collectionId: contract.$collectionId,
          $databaseId: contract.$databaseId,
          $sequence: contract.$sequence || 0,

          // Use contract data as primary source
          name: contract.contractName || contract.name || 'Untitled Contract',
          type: 'document',
          extension: fileData?.extension || 'pdf', // Default to pdf if not available
          url: fileData?.url || '',
          size: fileData?.size || 0,
          owner:
            contract.contractOwnerId || contract.owner || fileData?.owner || '',
          users: contract.users || fileData?.users || [],

          // Contract-specific data from contracts collection
          contractId: contract.$id,
          contractName: contract.contractName,
          contractOwnerId: contract.contractOwnerId,
          contractExpiryDate: contract.contractExpiryDate,
          status: contract.status,
          contractType: contract.contractType,
          amount: contract.amount,
          vendor: contract.vendor,
          contractNumber: contract.contractNumber,
          priority: contract.priority,
          compliance: contract.compliance,
          department: contract.department,
          assignedManagers: contract.assignedManagers,
          description: contract.description,
          riskLevel: contract.riskLevel,

          // File-specific data (fallback to file collection if available)
          bucketFileId: fileData?.bucketFileId || contract.bucketFileId,
        };

        return contractAsFile;
      })
    );

    files = { documents: contractDocuments };
    filteredDocuments = contractDocuments;

    // Extract unique departments and assigned managers for filter options
    uniqueDepartments = Array.from(
      new Set(
        contractDocuments
          .map((doc: UIFileDoc) => doc.department)
          .filter(Boolean)
      )
    ) as string[];
    uniqueAssignedManagers = Array.from(
      new Set(
        contractDocuments
          .flatMap((doc: UIFileDoc) => doc.assignedManagers || [])
          .filter(Boolean)
      )
    ) as string[];
  } else {
    // Regular file handling for other types
    const types = getFileTypesParams(type) as FileType[];
    files = await getFiles({ types, searchText, sort });

    // If type is 'images', filter to only png, jpg, jpeg
    filteredDocuments = files.documents as UIFileDoc[];
    if (type.toLowerCase() === 'images') {
      filteredDocuments = files.documents.filter((file: UIFileDoc) => {
        const ext = (file.extension || '').toLowerCase();
        return ext === 'png' || ext === 'jpg' || ext === 'jpeg';
      });
    }
  }

  // Fetch total space data for File Usage Overview
  const totalSpace = await getTotalSpaceUsed();

  // Get current user
  const user = await getCurrentUser();

  // Ensure filteredDocuments is always defined
  if (!filteredDocuments) {
    filteredDocuments = files?.documents || [];
  }

  // Calculate total size in bytes
  const totalSizeBytes = filteredDocuments.reduce(
    (sum: number, file: UIFileDoc) => sum + (file.size || 0),
    0
  );
  // Format total size using convertFileSize
  const { convertFileSize } = await import('@/lib/utils');
  const totalSizeFormatted = convertFileSize({ sizeInBytes: totalSizeBytes });

  // Calculate contract count for contracts page
  const contractCount =
    type.toLowerCase() === 'contracts' ? contractDocuments.length : 0;

  return (
    <div className="page-container">
      <div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
        <h1 className="h1 capitalize sidebar-gradient-text">{type}</h1>
      </div>
      {/* File Usage Overview Section - Only show on uploads page */}
      {(!type || type.toLowerCase() === 'uploads') && (
        <section className="mb-8 w-full">
          <FileUsageOverview totalSpace={totalSpace} user={user} />
        </section>
      )}
      {type.toLowerCase() === 'contracts' ? (
        <ContractsViewProvider>
          <section className="w-full">
            <ContractsMetricsBar files={contractDocuments} />
            <ContractsTopControls
              files={contractDocuments}
              departments={uniqueDepartments}
              assignedManagers={uniqueAssignedManagers}
            />
            <ContractsControlBar />
          </section>

          {/* Render the files */}
          {filteredDocuments.length > 0 ? (
            <ContractsViewClient files={filteredDocuments} user={user} />
          ) : (
            <div className="text-center py-12">
              <Image
                src="/assets/icons/no-data.svg"
                alt="No contracts uploaded yet"
                width={250}
                height={250}
                className="mb-4 opacity-60"
              />
              <p className="body-1 text-slate-700">No contracts uploaded yet</p>
            </div>
          )}
        </ContractsViewProvider>
      ) : (
        <>
          <section className="w-full">
            <div className="total-size-section">
              <p className="body-1">
                Total: <span className="h5">{totalSizeFormatted}</span>
              </p>

              <div className="sort-container">
                <p className="body-1 hidden text-light-200 sm:block">
                  Sort by:
                </p>

                <Sort />
              </div>
            </div>

            {/* Storage Progress Bar - Shows total usage across all file types */}
            <StorageProgressBar totalSpace={totalSpace} />
          </section>

          {/* Render the files */}
          {filteredDocuments.length > 0 ? (
            <section className="file-list">
              {filteredDocuments.map((file: UIFileDoc) => (
                <Card
                  key={file.$id}
                  file={file}
                  status={file.status}
                  expirationDate={file.contractExpiryDate}
                  userRole={user?.role as 'executive' | 'admin' | 'manager'}
                />
              ))}
            </section>
          ) : (
            <div className="text-center py-12">
              <Image
                src="/assets/icons/no-data.svg"
                alt="No contracts uploaded yet"
                width={250}
                height={250}
                className="mb-4 opacity-60"
              />
              <p className="body-1 text-slate-700">No contracts uploaded yet</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Page;
