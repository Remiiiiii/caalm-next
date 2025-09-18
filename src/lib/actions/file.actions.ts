'use server';

import { createAdminClient, createSessionClient } from '@/lib/appwrite';
import { InputFile } from 'node-appwrite/file';
import { appwriteConfig } from '@/lib/appwrite/config';
import { ID, Models, Query } from 'node-appwrite';
import { constructFileUrl, getFileType, parseStringify } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { getCurrentUser, getUserById } from './user.actions';
import {
  createFileActivity,
  createContractActivity,
} from './recentActivity.actions';
import {
  triggerFileUploadNotification,
  triggerContractExpiryNotification,
  triggerContractRenewalNotification,
} from '@/lib/utils/notificationTriggers';

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

export const uploadFile = async ({
  file,
  ownerId,
  accountId,
  path: revalidatePathArg,
  contractMetadata,
}: UploadFileProps & { contractMetadata?: Record<string, unknown> }) => {
  const { storage, tablesDB } = await createAdminClient();

  try {
    // Convert File to ArrayBuffer for InputFile.fromBuffer
    const arrayBuffer = await file.arrayBuffer();
    const inputFile = InputFile.fromBuffer(Buffer.from(arrayBuffer), file.name);

    // Always upload to Appwrite storage
    const bucketFile = await storage.createFile(
      appwriteConfig.bucketId,
      ID.unique(),
      inputFile
    );

    const fileDocument = {
      type: getFileType(bucketFile.name).type,
      name: bucketFile.name,
      url: constructFileUrl(bucketFile.$id),
      extension: getFileType(bucketFile.name).extension,
      size: bucketFile.sizeOriginal,
      owner: ownerId,
      accountId,
      users: [],
      bucketFileId: bucketFile.$id,
    };

    const newFile = await tablesDB
      .createRow(
        appwriteConfig.databaseId,
        appwriteConfig.filesCollectionId,
        ID.unique(),
        fileDocument
      )
      .catch(async (error: unknown) => {
        await storage.deleteFile(appwriteConfig.bucketId, bucketFile.$id);
        handleError(error, 'Failed to create file document');
      });

    if (!newFile) {
      throw new Error('File document creation failed');
    }

    // Check if filename contains "contract" (case-insensitive) or if contractMetadata is provided
    if (
      bucketFile.name.toLowerCase().includes('contract') ||
      contractMetadata
    ) {
      // Add to Contracts collection as well
      let contractExpiryDate: string | undefined = undefined;
      let status: string = 'pending-review'; // Default to pending-review

      // Use provided metadata or extract from file
      if (contractMetadata) {
        console.log('📋 Contract metadata received:', contractMetadata);

        // Use provided contract metadata
        contractExpiryDate =
          typeof contractMetadata.expiryDate === 'string'
            ? contractMetadata.expiryDate
            : undefined;
        status =
          typeof contractMetadata.expiryDate === 'string'
            ? 'active'
            : 'action-required';
      } else {
        // Fallback to extraction for files with "contract" in name
        try {
          const formData = new FormData();
          const fileForFormData = new File([arrayBuffer], bucketFile.name, {
            type: file.type,
          });
          formData.append('file', fileForFormData);
          const response = await fetch(
            'http://localhost:3000/api/extract-expiry',
            {
              method: 'POST',
              body: formData,
            }
          );
          const data = await response.json();
          contractExpiryDate = data.expiryDate;
          if (!contractExpiryDate) {
            contractExpiryDate = new Date().toISOString().split('T')[0];
            status = 'action-required';
          }
        } catch (error) {
          console.error('Error extracting contract expiry date:', error);
          contractExpiryDate = new Date().toISOString().split('T')[0];
          status = 'action-required';
        }
      }

      const contractDocument = {
        contractName: contractMetadata?.contractName || bucketFile.name,
        contractExpiryDate,
        status,
        amount: contractMetadata?.amount
          ? parseFloat(String(contractMetadata.amount))
          : undefined,
        daysUntilExpiry: (() => {
          if (contractExpiryDate) {
            try {
              const expiryDate = new Date(contractExpiryDate);
              const today = new Date();
              const timeDiff = expiryDate.getTime() - today.getTime();
              const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
              return daysDiff;
            } catch (error) {
              console.error('Error calculating days until expiry:', error);
              return undefined;
            }
          }
          return undefined;
        })(),
        compliance: (() => {
          const compliance = contractMetadata?.compliance;
          if (typeof compliance === 'string') {
            // Map frontend compliance levels to database enum values
            const complianceMapping: Record<string, string> = {
              'Low Risk': 'up-to-date',
              'Medium Risk': 'action-required',
              'High Risk': 'action-required',
              'Critical Risk': 'non-compliant',
            };
            return complianceMapping[compliance] || 'action-required';
          }
          return 'action-required';
        })(),
        assignedManagers: await (async () => {
          const managerIds =
            (contractMetadata?.assignedManagers as string[]) || [];
          if (managerIds.length === 0) return [];

          // Fetch full names for each manager ID
          const managerNames: string[] = [];
          for (const managerId of managerIds) {
            try {
              const user = await getUserById(managerId);
              if (user && user.fullName) {
                managerNames.push(user.fullName);
              } else {
                // Fallback to ID if name not found
                managerNames.push(managerId);
              }
            } catch (error) {
              console.error(`Failed to fetch manager ${managerId}:`, error);
              // Fallback to ID if fetch fails
              managerNames.push(managerId);
            }
          }

          return managerNames;
        })(),
        department: contractMetadata?.assignToDepartment || undefined,
        contractType: (() => {
          const contractType = contractMetadata?.contractType;
          if (typeof contractType === 'string') {
            // Map frontend values to database enum values
            const typeMapping: Record<string, string> = {
              'Service Agreement': 'Service_Agreement',
              'Purchase Order': 'Purchase_Order',
              'License Agreement': 'License_Agreement',
              NDA: 'NDA_',
              'Employment Contract': 'Employment_Contract',
              'Vendor Contract': 'Vendor_Contract',
              'Lease Agreement': 'Lease_Agreement',
              'Consulting Agreement': 'Consulting_Agreement',
              Other: 'Other',
            };
            return typeMapping[contractType] || 'Other';
          }
          return 'Other';
        })(),
        vendor: contractMetadata?.vendor || undefined,
        contractNumber: contractMetadata?.contractNumber || undefined,
        priority: (() => {
          const priority = contractMetadata?.priority;
          if (typeof priority === 'string') {
            // Map frontend priority values to database enum values
            const priorityMapping: Record<string, string> = {
              low: 'Low',
              medium: 'Medium',
              high: 'High',
              urgent: 'Urgent',
            };
            return priorityMapping[priority.toLowerCase()] || 'Medium';
          }
          return 'Medium';
        })(),
        description: contractMetadata?.description || undefined,
        fileId: newFile.$id,
        fileRef: newFile.$id,
      };

      const contract = await tablesDB.createRow(
        appwriteConfig.databaseId,
        appwriteConfig.contractsCollectionId,
        ID.unique(),
        contractDocument
      );

      // Save all contract metadata in the file document for easy access
      const fileUpdateData = {
        contractId: contract.$id,
        contractExpiryDate: contractExpiryDate,
        status: status,
        contractName: contractDocument.contractName,
        contractType: contractDocument.contractType,
        amount: contractDocument.amount,
        vendor: contractDocument.vendor,
        contractNumber: contractDocument.contractNumber,
        priority: contractDocument.priority,
        compliance: contractDocument.compliance,
        department: contractDocument.department,
        assignedManagers: contractDocument.assignedManagers,
      };

      console.log('📝 Updating file document with contract metadata:', {
        fileId: newFile.$id,
        updateData: fileUpdateData,
      });

      await tablesDB.updateRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.filesCollectionId,
        rowId: newFile.$id,
        data: fileUpdateData,
      });

      console.log(
        '✅ File document updated successfully with contract metadata'
      );

      // Trigger contract expiry notification if expiry date is set
      if (contractExpiryDate) {
        try {
          const expiryDate = new Date(contractExpiryDate);
          const today = new Date();
          const daysUntilExpiry = Math.ceil(
            (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysUntilExpiry <= 90) {
            // Only notify if within 90 days
            await triggerContractExpiryNotification(
              ownerId,
              bucketFile.name,
              contractExpiryDate,
              daysUntilExpiry
            );
          }
        } catch (error) {
          console.error(
            'Failed to trigger contract expiry notification:',
            error
          );
          // Don't throw error here as the contract creation was successful
        }
      }
    }

    // Create a recent activity for the file upload
    try {
      await createFileActivity(
        'File Uploaded',
        bucketFile.name,
        ownerId,
        'User', // We'll get the actual user name later if needed
        'General' // We'll get the actual department later if needed
      );
    } catch (error) {
      console.error('Failed to create file upload activity:', error);
      // Don't throw error here as the file upload was successful
    }

    // Trigger file upload notification
    try {
      await triggerFileUploadNotification(
        ownerId,
        bucketFile.name,
        getFileType(bucketFile.name).type,
        bucketFile.sizeOriginal
      );
    } catch (error) {
      console.error('Failed to trigger file upload notification:', error);
      // Don't throw error here as the file upload was successful
    }

    revalidatePath(revalidatePathArg);
    return parseStringify(newFile);
  } catch (error) {
    handleError(error, 'Failed to upload file');
  }
};

const createQueries = (
  currentUser: Models.Document,
  types: string[],
  searchText: string,
  sort: string,
  limit?: number
) => {
  // 'owner' is a relationship attribute (not a string or array)
  const queries = [Query.equal('owner', [currentUser.$id])];

  if (types.length > 0) queries.push(Query.equal('type', types));
  if (searchText) queries.push(Query.contains('name', searchText));
  if (limit) queries.push(Query.limit(limit));

  if (sort) {
    const [sortBy, orderBy] = sort.split('-');
    queries.push(
      orderBy === 'asc' ? Query.orderAsc(sortBy) : Query.orderDesc(sortBy)
    );
  }

  return queries;
};

export const getFiles = async ({
  types = [],
  searchText = '',
  sort = '$createdAt-desc',
  limit,
}: GetFilesProps) => {
  const { tablesDB } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      console.error('getCurrentUser returned null/undefined in getFiles');
      return { documents: [] };
    }

    const queries = createQueries(currentUser, types, searchText, sort, limit);

    const files = await tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      queries
    );

    // Defensive: always return a plain object with a documents array
    const plain = parseStringify(files);
    if (!plain || typeof plain !== 'object' || !Array.isArray(plain.rows)) {
      return { documents: [] };
    }
    return plain;
  } catch (error) {
    handleError(error, 'Failed to get files');
    // Defensive: always return a plain object
    return { documents: [] };
  }
};

export const renameFile = async ({
  fileId,
  name,
  extension,
  path,
}: RenameFileProps) => {
  const { tablesDB } = await createAdminClient();

  try {
    const newName = `${name}.${extension}`;
    const updatedFile = await tablesDB.updateRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesCollectionId,
      rowId: fileId,
      data: { name: newName },
    });

    revalidatePath(path);
    return parseStringify(updatedFile);
  } catch (error) {
    handleError(error, 'Failed to rename file');
  }
};

export const updateFileUsers = async ({
  fileId,
  emails,
  path,
}: UpdateFileUsersProps) => {
  const { tablesDB } = await createAdminClient();

  try {
    const updatedFile = await tablesDB.updateRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesCollectionId,
      rowId: fileId,
      data: { users: emails },
    });

    revalidatePath(path);
    return parseStringify(updatedFile);
  } catch (error) {
    handleError(error, 'Failed to rename file');
  }
};

export const deleteFile = async ({
  fileId,
  bucketFileId,
  path,
}: DeleteFileProps) => {
  const { tablesDB, storage } = await createAdminClient();

  try {
    console.log('Deleting fileId:', fileId);

    // Start all operations in parallel for better performance
    const operations = [
      // 1. Find and delete contract document (if exists)
      tablesDB
        .listRows({
          databaseId: appwriteConfig.databaseId,
          tableId: appwriteConfig.contractsCollectionId,
          queries: [Query.equal('fileId', fileId)],
        })
        .then(async (contractDocs) => {
          if (contractDocs.rows.length > 0) {
            const contractId = contractDocs.rows[0].$id;
            return tablesDB.deleteRow({
              databaseId: appwriteConfig.databaseId,
              tableId: appwriteConfig.contractsCollectionId,
              rowId: contractId,
            });
          }
          return null;
        }),

      // 2. Delete the file document
      tablesDB.deleteRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.filesCollectionId,
        rowId: fileId,
      }),

      // 3. Delete the storage file
      storage.deleteFile(appwriteConfig.bucketId, bucketFileId),
    ];

    // Execute all operations in parallel
    await Promise.all(operations);

    revalidatePath(path);
    return parseStringify({ status: 'success' });
  } catch (error) {
    handleError(error, 'Failed to delete file');
  }
};

export async function getTotalSpaceUsed() {
  try {
    const { tablesDB } = await createAdminClient();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.error(
        'getCurrentUser returned null/undefined in getTotalSpaceUsed'
      );
      return parseStringify({
        image: { size: 0, latestDate: '' },
        document: { size: 0, latestDate: '' },
        video: { size: 0, latestDate: '' },
        audio: { size: 0, latestDate: '' },
        other: { size: 0, latestDate: '' },
        used: 0,
        all: 2 * 1024 * 1024 * 1024,
      });
    }

    const files = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesCollectionId,
      queries: [Query.equal('owner', [currentUser.$id])],
    });

    const totalSpace = {
      image: { size: 0, latestDate: '' },
      document: { size: 0, latestDate: '' },
      video: { size: 0, latestDate: '' },
      audio: { size: 0, latestDate: '' },
      other: { size: 0, latestDate: '' },
      used: 0,
      all: 2 * 1024 * 1024 * 1024 /* 2GB available bucket storage */,
    };

    files.rows.forEach((file) => {
      const fileType = file.type as FileType;
      totalSpace[fileType].size += file.size;
      totalSpace.used += file.size;

      if (
        !totalSpace[fileType].latestDate ||
        new Date(file.$updatedAt) > new Date(totalSpace[fileType].latestDate)
      ) {
        totalSpace[fileType].latestDate = file.$updatedAt;
      }
    });

    return parseStringify(totalSpace);
  } catch (error) {
    handleError(error, 'Error calculating total space used:, ');
  }
}

export interface AssignContractProps {
  fileId: string;
  managerAccountIds: string[];
  path: string;
  fileDocumentId?: string; // Add file document ID for updating isContract
}

export const assignContract = async ({
  fileId,
  managerAccountIds,
  path,
  fileDocumentId,
}: AssignContractProps) => {
  const { tablesDB } = await createAdminClient();
  try {
    // Fetch the contract document from the contracts collection
    let contractDoc;
    try {
      contractDoc = await tablesDB.getRow(
        appwriteConfig.databaseId,
        appwriteConfig.contractsCollectionId,
        fileId
      );
    } catch (error) {
      console.error('Contract document not found with ID:', fileId, error);
      console.error('Available collections:', {
        databaseId: appwriteConfig.databaseId,
        contractsCollectionId: appwriteConfig.contractsCollectionId,
        fileId: fileId,
        fileDocumentId: fileDocumentId,
      });

      // Try to find the contract by fileId in the contracts collection
      try {
        const contracts = await tablesDB.listRows({
          databaseId: appwriteConfig.databaseId,
          tableId: appwriteConfig.contractsCollectionId,
          queries: [Query.equal('fileId', fileDocumentId || '')],
        });

        if (contracts.rows.length > 0) {
          contractDoc = contracts.rows[0];
          console.log('Found contract by fileId:', contractDoc);
        } else {
          throw new Error('No contract found with matching fileId');
        }
      } catch (searchError) {
        console.error('Failed to search for contract by fileId:', searchError);
        throw new Error(
          `Contract document not found. Please ensure the file is properly uploaded as a contract.`
        );
      }
    }

    // Only allow assignment if contractName/title contains 'Contract'
    if (!contractDoc.contractName.toLowerCase().includes('contract')) {
      throw new Error('Document is not a contract and cannot be assigned.');
    }

    // Update the contract document: assign manager(s)
    const updatedContract = await tablesDB.updateRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.contractsCollectionId,
      rowId: contractDoc.$id, // Use the actual contract document ID
      data: {
        assignedManagers: managerAccountIds,
      },
    });

    // Update the file document: set isContract true (if fileDocumentId is provided)
    if (fileDocumentId) {
      await tablesDB.updateRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.filesCollectionId,
        rowId: fileDocumentId,
        data: {
          isContract: true,
        },
      });
    }
    revalidatePath(path);
    return parseStringify({
      contract: updatedContract,
      contractId: contractDoc.$id,
    });
  } catch (error) {
    handleError(error, 'Failed to assign contract');
  }
};

// Fetch allowed contract status enums from the database
export const getContractStatusEnums = async () => {
  const { tablesDB } = await createAdminClient();
  const databaseId = appwriteConfig.databaseId;
  const tableId = appwriteConfig.contractsCollectionId;
  const attrKey = 'status';
  try {
    // Type assertion to fix linter error
    const attr = (await tablesDB.getColumn({
      databaseId,
      tableId,
      key: attrKey,
    })) as { elements?: string[] };

    return attr.elements || [];
  } catch (error) {
    handleError(error, 'Failed to fetch contract status enums');
  }
};

// Update contract status by fileId
export const contractStatus = async ({
  fileId,
  status,
  path,
}: {
  fileId: string;
  status: string;
  path: string;
}) => {
  const { tablesDB } = await createAdminClient();
  try {
    // Update the contract document's status
    const updated = await tablesDB.updateRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.contractsCollectionId,
      rowId: fileId,
      data: { status },
    });

    // Create a recent activity for the contract status change
    try {
      await createContractActivity(
        `Contract ${status.replace('-', ' ')}`,
        updated.contractName || 'Contract',
        fileId,
        'User', // We'll get the actual user name later if needed
        'User' // We'll get the actual user name later if needed
      );
    } catch (error) {
      console.error('Failed to create contract status activity:', error);
      // Don't throw error here as the status update was successful
    }

    // Trigger contract renewal notification if status is 'renewed'
    if (status === 'renewed' && updated.contractExpiryDate) {
      try {
        await triggerContractRenewalNotification(
          updated.owner || 'system', // Use owner if available, otherwise 'system'
          updated.contractName || 'Contract',
          updated.contractExpiryDate
        );
      } catch (error) {
        console.error(
          'Failed to trigger contract renewal notification:',
          error
        );
        // Don't throw error here as the status update was successful
      }
    }

    revalidatePath(path);
    return parseStringify(updated);
  } catch (error) {
    handleError(error, 'Failed to update contract status');
  }
};

export const getContracts = async () => {
  const { tablesDB } = await createAdminClient();
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.error('getCurrentUser returned null/undefined in getContracts');
      return parseStringify({ documents: [], total: 0 });
    }
    // Fetch contracts where file owner matches current user
    // (Assumes you want contracts for the user's files)
    const contracts = await tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.contractsCollectionId
    );
    return parseStringify(contracts);
  } catch (error) {
    handleError(error, 'Failed to get contracts');
  }
};

// Get contracts assigned to a specific manager
export const getContractsForManager = async (managerAccountId: string) => {
  const { tablesDB } = await createAdminClient();
  try {
    // Fetch contracts where the manager's accountId is in the assignedManagers array
    const contracts = await tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.contractsCollectionId,
      [Query.search('assignedManagers', managerAccountId)]
    );
    return parseStringify(contracts.rows);
  } catch (error) {
    handleError(error, 'Failed to get contracts for manager');
  }
};

export const getTotalContractsCount = async () => {
  const { tablesDB } = await createAdminClient();
  try {
    const contracts = await tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.contractsCollectionId,
      []
    );
    return contracts.total;
  } catch (error) {
    console.error('Failed to fetch total contracts count:', error);
    return 0;
  }
};

export const getExpiringContractsCount = async () => {
  const { tablesDB } = await createAdminClient();
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const contracts = await tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.contractsCollectionId,
      [
        Query.lessThanEqual(
          'contractExpiryDate',
          thirtyDaysFromNow.toISOString().split('T')[0]
        ),
        Query.greaterThan(
          'contractExpiryDate',
          new Date().toISOString().split('T')[0]
        ),
      ]
    );
    return contracts.total;
  } catch (error) {
    console.error('Failed to fetch expiring contracts count:', error);
    return 0;
  }
};

// Get contracts filtered by user's division
export const getContractsByUserDivision = async (userDivision: string) => {
  const { tablesDB } = await createAdminClient();
  try {
    // Get all contracts
    const contracts = await tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.contractsCollectionId,
      []
    );

    // Filter contracts where assigned managers belong to the user's division
    const filteredContracts = [];

    for (const contract of contracts.rows) {
      if (
        contract.assignedManagers &&
        Array.isArray(contract.assignedManagers)
      ) {
        // Check if any assigned manager belongs to the user's division
        for (const managerName of contract.assignedManagers) {
          // Get manager by name to check their division
          const managers = await tablesDB.listRows(
            appwriteConfig.databaseId,
            appwriteConfig.usersCollectionId,
            [
              Query.equal('fullName', managerName),
              Query.equal('role', 'manager'),
            ]
          );

          if (managers.rows.length > 0) {
            const manager = managers.rows[0];
            if (manager.division === userDivision) {
              filteredContracts.push(contract);
              break; // Found a manager from this division, no need to check others
            }
          }
        }
      }
    }

    return parseStringify(filteredContracts);
  } catch (error) {
    console.error('Failed to get contracts by user division:', error);
    return [];
  }
};
