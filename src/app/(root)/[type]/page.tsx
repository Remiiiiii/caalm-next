import React from 'react';
import Sort from '@/components/Sort';
import { getFiles, getTotalSpaceUsed } from '@/lib/actions/file.actions';
import { getCurrentUser } from '@/lib/actions/user.actions';
import Card from '@/components/Card';
import { getFileTypesParams } from '@/lib/utils';
import FileUsageOverview from '@/components/FileUsageOverview';
import { UIFileDoc } from '@/types/files';
import { createAdminClient } from '@/lib/appwrite/admin';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'appwrite';

const Page = async ({ searchParams, params }: SearchParamProps) => {
  const type = ((await params)?.type as string) || '';
  const searchText = ((await searchParams)?.query as string) || '';
  const sort = ((await searchParams)?.sort as string) || '';

  let files: { documents: UIFileDoc[] };
  let filteredDocuments: UIFileDoc[];

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
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.contractsCollectionId,
      queries: queries,
    });

    // Convert contract documents to UIFileDoc format for compatibility with existing components
    const contractDocuments = await Promise.all(
      contractsResult.rows.map(async (contract: any) => {
        // Try to get the associated file document for file-specific data
        let fileData = null;
        if (contract.fileId) {
          try {
            fileData = await databases.getDocument(
              appwriteConfig.databaseId,
              appwriteConfig.filesCollectionId,
              contract.fileId
            );
          } catch (error) {
            console.warn(
              'Could not fetch file data for contract:',
              contract.$id,
              error
            );
          }
        }

        // Create a UIFileDoc-compatible object using contract data as primary source
        const contractAsFile: UIFileDoc = {
          $id: contract.$id,
          $createdAt: contract.$createdAt,
          $updatedAt: contract.$updatedAt,
          $permissions: contract.$permissions,
          $collectionId: contract.$collectionId,
          $databaseId: contract.$databaseId,

          // Use contract data as primary source
          name: contract.contractName || contract.name || 'Untitled Contract',
          type: 'document',
          extension: fileData?.extension || 'pdf', // Default to pdf if not available
          url: fileData?.url || '',
          size: fileData?.size || 0,
          owner: contract.owner || fileData?.owner || '',
          users: contract.users || fileData?.users || [],

          // Contract-specific data from contracts collection
          contractId: contract.$id,
          contractName: contract.contractName,
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

          // File-specific data (fallback to file collection if available)
          bucketFileId: fileData?.bucketFileId || contract.bucketFileId,
        };

        return contractAsFile;
      })
    );

    files = { documents: contractDocuments };
    filteredDocuments = contractDocuments;
  } else {
    // Regular file handling for other types
    const types = getFileTypesParams(type) as FileType[];
    files = await getFiles({ types, searchText, sort });

    // If type is 'images', filter to only png, jpg, jpeg
    filteredDocuments = files.rows as UIFileDoc[];
    if (type.toLowerCase() === 'images') {
      filteredDocuments = files.rows.filter((file: UIFileDoc) => {
        const ext = (file.extension || '').toLowerCase();
        return ext === 'png' || ext === 'jpg' || ext === 'jpeg';
      });
    }
  }

  // Fetch total space data for File Usage Overview
  const totalSpace = await getTotalSpaceUsed();

  // Get current user
  const user = await getCurrentUser();

  // Calculate total size in bytes
  const totalSizeBytes = filteredDocuments.reduce(
    (sum: number, file: UIFileDoc) => sum + (file.size || 0),
    0
  );
  // Format total size using convertFileSize
  const { convertFileSize } = await import('@/lib/utils');
  const totalSizeFormatted = convertFileSize({ sizeInBytes: totalSizeBytes });

  return (
    <div className="page-container">
      <h1 className="h1 capitalize mr-auto">{type}</h1>
      {/* File Usage Overview Section - Only show on uploads page */}
      {(!type || type.toLowerCase() === 'uploads') && (
        <section className="mb-8 w-full">
          <FileUsageOverview totalSpace={totalSpace} user={user} />
        </section>
      )}
      <section className="w-full">
        <div className="total-size-section">
          <p className="body-1">
            Total: <span className="h5">{totalSizeFormatted}</span>
          </p>

          <div className="sort-container">
            <p className="body-1 hidden text-light-200 sm:block">Sort by:</p>

            <Sort />
          </div>
        </div>
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
        <p className="empty-list">No files uploaded yet</p>
      )}
    </div>
  );
};

export default Page;
