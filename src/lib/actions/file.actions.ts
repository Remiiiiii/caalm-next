'use server';

import { createAdminClient, createSessionClient } from '@/lib/appwrite';
import { InputFile } from 'node-appwrite/file';
import { appwriteConfig } from '@/lib/appwrite/config';
import { ID, Models, Query } from 'node-appwrite';
import { constructFileUrl, getFileType, parseStringify } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './user.actions';
import fs from 'fs';
import path from 'path';

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

export const uploadFile = async ({
  file,
  ownerId,
  accountId,
  path: revalidatePathArg,
}: UploadFileProps) => {
  const { storage, databases } = await createAdminClient();

  try {
    const inputFile = InputFile.fromBuffer(file, file.name);

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

    const newFile = await databases
      .createDocument(
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

    // Check if filename contains "contract" (case-insensitive)
    if (bucketFile.name.toLowerCase().includes('contract')) {
      // Add to Contracts collection as well
      // 1. Extract expiry date from file using your /api/extract-expiry endpoint
      let contractExpiryDate: string | undefined = undefined;
      let status: string = 'pending-review'; // Default to pending-review
      if (bucketFile.name.toLowerCase().includes('contract')) {
        try {
          // Call your API endpoint to extract the expiry date
          const formData = new FormData();
          formData.append('file', file, bucketFile.name);
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
        } catch {
          contractExpiryDate = new Date().toISOString().split('T')[0]; // fallback
          status = 'action-required';
        }

        const contractDocument = {
          contractName: bucketFile.name,
          contractExpiryDate,
          status,
          amount: undefined,
          daysUntilExpiry: undefined,
          compliance: undefined,
          assignedManagers: [],
          fileId: newFile.$id, // Save file.$id in the contract document
          fileRef: newFile.$id,
        };
        const contract = await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.contractsCollectionId,
          ID.unique(),
          contractDocument
        );
        // Save contract.$id in the file document, or file.$id in the contract document
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.filesCollectionId,
          newFile.$id,
          { contractId: contract.$id }
        );
      }
    } else {
      // Save file to /uploads directory
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir);
      }
      const filePath = path.join(uploadsDir, bucketFile.name);
      // Ensure file is a Buffer or convert from ArrayBuffer
      let fileBuffer: Buffer;
      if (Buffer.isBuffer(file)) {
        fileBuffer = file;
      } else if (file instanceof ArrayBuffer) {
        fileBuffer = Buffer.from(file);
      } else if (file instanceof Uint8Array) {
        fileBuffer = Buffer.from(file);
      } else if (
        typeof file === 'object' &&
        file !== null &&
        'buffer' in file &&
        file.buffer instanceof ArrayBuffer
      ) {
        // For typed arrays with a buffer property
        fileBuffer = Buffer.from(file.buffer);
      } else {
        throw new Error('Unsupported file type for saving to disk');
      }
      fs.writeFileSync(filePath, fileBuffer);
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
  const { databases } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) throw new Error('User not found');

    const queries = createQueries(currentUser, types, searchText, sort, limit);

    const files = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      queries
    );

    // Defensive: always return a plain object with a documents array
    const plain = parseStringify(files);
    if (
      !plain ||
      typeof plain !== 'object' ||
      !Array.isArray(plain.documents)
    ) {
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
  const { databases } = await createAdminClient();

  try {
    const newName = `${name}.${extension}`;
    const updatedFile = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
      { name: newName }
    );

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
  const { databases } = await createAdminClient();

  try {
    const updatedFile = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
      { users: emails }
    );

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
  const { databases, storage } = await createAdminClient();

  try {
    console.log('Deleting fileId:', fileId);
    // 1. Delete the contract document linked to this file
    const contractDocs = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.contractsCollectionId,
      [Query.equal('fileId', fileId)]
    );
    if (contractDocs.documents.length > 0) {
      const contractId = contractDocs.documents[0].$id;
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.contractsCollectionId,
        contractId
      );
    }

    // 2. Delete the file document
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId
    );

    // Always attempt to delete the storage file
    await storage.deleteFile(appwriteConfig.bucketId, bucketFileId);

    revalidatePath(path);
    return parseStringify({ status: 'success' });
  } catch (error) {
    handleError(error, 'Failed to rename file');
  }
};

export async function getTotalSpaceUsed() {
  try {
    const { databases } = await createSessionClient();
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('User is not authenticated.');

    const files = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      [Query.equal('owner', [currentUser.$id])]
    );

    const totalSpace = {
      image: { size: 0, latestDate: '' },
      document: { size: 0, latestDate: '' },
      video: { size: 0, latestDate: '' },
      audio: { size: 0, latestDate: '' },
      other: { size: 0, latestDate: '' },
      used: 0,
      all: 2 * 1024 * 1024 * 1024 /* 2GB available bucket storage */,
    };

    files.documents.forEach((file) => {
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
}

export const assignContract = async ({
  fileId,
  managerAccountIds,
  path,
}: AssignContractProps) => {
  const { databases } = await createAdminClient();
  try {
    // Fetch the contract document from the contracts collection
    const contractDoc = await databases.getDocument(
      appwriteConfig.databaseId,
      'contracts',
      fileId
    );
    // Only allow assignment if contractName/title contains 'Contract'
    if (!contractDoc.contractName.toLowerCase().includes('contract')) {
      throw new Error('Document is not a contract and cannot be assigned.');
    }
    // Update the contract document: set isContract true and assign manager(s)
    const updatedContract = await databases.updateDocument(
      appwriteConfig.databaseId,
      'contracts',
      fileId,
      {
        isContract: true,
        assignedManagers: managerAccountIds,
      }
    );
    revalidatePath(path);
    return parseStringify(updatedContract);
  } catch (error) {
    handleError(error, 'Failed to assign contract');
  }
};

// Fetch allowed contract status enums from the database
export const getContractStatusEnums = async () => {
  const { databases } = await createAdminClient();
  const databaseId = appwriteConfig.databaseId;
  const collectionId = appwriteConfig.contractsCollectionId;
  const attrKey = 'status';
  try {
    // Type assertion to fix linter error
    const attr = (await databases.getAttribute(
      databaseId,
      collectionId,
      attrKey
    )) as { elements?: string[] };
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
  const { databases } = await createAdminClient();
  try {
    // Update the contract document's status
    const updated = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.contractsCollectionId,
      fileId,
      { status }
    );
    revalidatePath(path);
    return parseStringify(updated);
  } catch (error) {
    handleError(error, 'Failed to update contract status');
  }
};

export const getContracts = async () => {
  const { databases } = await createAdminClient();
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('User not found');
    // Fetch contracts where file owner matches current user
    // (Assumes you want contracts for the user's files)
    const contracts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.contractsCollectionId
    );
    return parseStringify(contracts);
  } catch (error) {
    handleError(error, 'Failed to get contracts');
  }
};
