import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { ID, Query } from 'node-appwrite';
import CacheManager from '@/lib/services/cache-manager';
import { CACHE_KEYS } from '@/lib/services/cache-keys';
import { FileService } from './FileService';

/**
 * Draft Service
 * Handles draft CRUD operations
 */
export class DraftService {
  /**
   * Optimize processed file data by removing large binary fields
   */
  static optimizeProcessedFileData(
    processedFileData: any,
    bucketFileId: string | null
  ): any {
    if (!processedFileData) return null;

    const parsed =
      typeof processedFileData === 'string'
        ? JSON.parse(processedFileData)
        : processedFileData;

    return {
      name: parsed.name,
      type: parsed.type,
      size: parsed.size,
      lastModified: parsed.lastModified,
      bucketFileId: bucketFileId || parsed.bucketFileId || null,
    };
  }

  /**
   * Optimize form data by removing empty values
   */
  static optimizeFormData(formData: any): any {
    if (!formData || typeof formData !== 'object') return formData;

    return Object.fromEntries(
      Object.entries(formData).filter(([_, value]) => {
        if (value === null || value === undefined || value === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        if (typeof value === 'object' && Object.keys(value).length === 0)
          return false;
        return true;
      })
    );
  }

  /**
   * Optimize extracted data by removing empty values
   */
  static optimizeExtractedData(extractedData: any): any {
    if (!extractedData || typeof extractedData !== 'object')
      return extractedData;

    return Object.fromEntries(
      Object.entries(extractedData).filter(([_, value]) => {
        return value !== null && value !== undefined && value !== '';
      })
    );
  }

  /**
   * Create or update draft
   */
  static async saveDraft(
    ownerId: string,
    accountId: string,
    draftData: {
      draftId?: string;
      formData?: any;
      currentStep: number;
      processedFileData?: any;
      extractedData?: any;
      isCompleted?: boolean;
    }
  ) {
    const { tablesDB } = await createAdminClient();

    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.contractDraftsCollectionId
    ) {
      throw new Error('Database configuration missing');
    }

    // Optimize data
    let optimizedProcessedFileData = null;
    let bucketFileId: string | null = null;

    if (draftData.processedFileData) {
      const parsed =
        typeof draftData.processedFileData === 'string'
          ? JSON.parse(draftData.processedFileData)
          : draftData.processedFileData;

      // Upload to storage if user has progressed to step 2 or beyond
      if (
        draftData.currentStep > 1 &&
        parsed.arrayBuffer &&
        !parsed.bucketFileId
      ) {
        try {
          bucketFileId = await FileService.uploadFileToStorage(
            parsed.arrayBuffer,
            parsed.name
          );
        } catch (uploadError: any) {
          console.warn(
            'Failed to upload draft file to storage:',
            uploadError.message
          );
        }
      } else if (parsed.bucketFileId) {
        bucketFileId = parsed.bucketFileId;
      }

      optimizedProcessedFileData = this.optimizeProcessedFileData(
        parsed,
        bucketFileId
      );
    }

    const optimizedFormData = this.optimizeFormData(draftData.formData);
    const optimizedExtractedData = this.optimizeExtractedData(
      draftData.extractedData
    );

    // Create or update file row if needed
    let fileRow = null;
    if (draftData.processedFileData && draftData.currentStep > 1) {
      const parsed =
        typeof draftData.processedFileData === 'string'
          ? JSON.parse(draftData.processedFileData)
          : draftData.processedFileData;

      if (parsed && parsed.name) {
        fileRow = await FileService.createOrUpdateFileRow(ownerId, accountId, {
          name: parsed.name,
          size: parsed.size,
          bucketFileId: bucketFileId || parsed.bucketFileId || null,
          contractName: optimizedFormData?.contractName,
        });
      }
    }

    const draftPayload = {
      ownerId,
      accountId,
      formData: optimizedFormData ? JSON.stringify(optimizedFormData) : null,
      currentStep: draftData.currentStep,
      processedFileData: optimizedProcessedFileData
        ? JSON.stringify(optimizedProcessedFileData)
        : null,
      extractedData: optimizedExtractedData
        ? JSON.stringify(optimizedExtractedData)
        : null,
      progressPercentage: Math.round((draftData.currentStep / 10) * 100),
      lastSavedAt: new Date().toISOString(),
      isCompleted: draftData.isCompleted || false,
      fileId: fileRow?.$id || null,
    };

    if (draftData.draftId) {
      // Update existing draft
      // Preserve existing fileId if no new file row was created
      if (!fileRow) {
        try {
          const existingDraft = await tablesDB.getRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.contractDraftsCollectionId,
            rowId: draftData.draftId,
          });
          if (existingDraft.fileId && !fileRow) {
            (draftPayload as any).fileId = existingDraft.fileId;
          }
        } catch (error) {
          console.warn(
            'Could not fetch existing draft to preserve fileId:',
            error
          );
        }
      }

      return await tablesDB.updateRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.contractDraftsCollectionId,
        rowId: draftData.draftId,
        data: draftPayload,
      });
    } else {
      // Create new draft
      return await tablesDB.createRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.contractDraftsCollectionId,
        rowId: ID.unique(),
        data: draftPayload,
      });
    }
  }

  /**
   * Get drafts for owner
   */
  static async getDrafts(
    ownerId: string,
    limit: number = 100,
    offset: number = 0
  ) {
    const { tablesDB } = await createAdminClient();

    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.contractDraftsCollectionId
    ) {
      throw new Error('Database configuration missing');
    }

    const drafts = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.contractDraftsCollectionId,
      queries: [
        Query.equal('ownerId', ownerId),
        Query.equal('isCompleted', false),
        Query.orderDesc('lastSavedAt'),
        Query.limit(limit),
        Query.offset(offset),
        Query.select([
          '$id',
          'ownerId',
          'accountId',
          'formData',
          'currentStep',
          'progressPercentage',
          'lastSavedAt',
          'isCompleted',
          'processedFileData',
          'extractedData',
        ]),
      ],
    });

    // Parse JSON fields safely
    return drafts.rows.map((draft: any) => {
      let formData = null;
      let processedFileData = null;
      let extractedData = null;

      try {
        formData = draft.formData ? JSON.parse(draft.formData) : null;
      } catch (e) {
        console.warn('Failed to parse formData for draft:', draft.$id, e);
      }

      try {
        processedFileData = draft.processedFileData
          ? JSON.parse(draft.processedFileData)
          : null;
      } catch (e) {
        console.warn(
          'Failed to parse processedFileData for draft:',
          draft.$id,
          e
        );
      }

      try {
        extractedData = draft.extractedData
          ? JSON.parse(draft.extractedData)
          : null;
      } catch (e) {
        console.warn('Failed to parse extractedData for draft:', draft.$id, e);
      }

      return {
        ...draft,
        formData,
        processedFileData,
        extractedData,
      };
    });
  }

  /**
   * Get draft by ID
   */
  static async getDraftById(draftId: string) {
    const { tablesDB } = await createAdminClient();

    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.contractDraftsCollectionId
    ) {
      throw new Error('Database configuration missing');
    }

    return await tablesDB.getRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.contractDraftsCollectionId,
      rowId: draftId,
    });
  }

  /**
   * Delete draft and associated file
   */
  static async deleteDraft(draftId: string, ownerId?: string) {
    const { tablesDB } = await createAdminClient();

    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.contractDraftsCollectionId
    ) {
      throw new Error('Database configuration missing');
    }

    let draftOwnerId: string | null = ownerId || null;
    let fileId: string | null = null;

    try {
      const draft = await this.getDraftById(draftId);
      draftOwnerId = draft.ownerId as string;

      const processedFileData = draft.processedFileData
        ? JSON.parse(draft.processedFileData)
        : null;

      if (processedFileData && processedFileData.name) {
        const file = await FileService.findFileByName(
          draftOwnerId,
          processedFileData.name
        );
        if (file) {
          fileId = file.$id;
        }
      }
    } catch (error) {
      console.warn('Could not fetch draft:', error);
    }

    // Delete file if exists
    if (fileId) {
      try {
        await FileService.deleteFileRow(fileId, true);
        console.log(`Deleted file ${fileId} associated with draft ${draftId}`);
      } catch (fileDeleteError: any) {
        console.warn('Error deleting file:', fileDeleteError.message);
      }
    }

    // Delete the draft
    await tablesDB.deleteRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.contractDraftsCollectionId,
      rowId: draftId,
    });

    // Invalidate cache
    if (draftOwnerId) {
      try {
        await CacheManager.invalidate(
          CACHE_KEYS.contracts.drafts(draftOwnerId)
        );
      } catch (cacheError) {
        console.warn('Failed to invalidate cache:', cacheError);
      }
    }

    return { draftId, fileId: fileId || null };
  }

  /**
   * Mark draft as completed
   */
  static async markDraftAsCompleted(draftId: string) {
    const { tablesDB } = await createAdminClient();

    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.contractDraftsCollectionId
    ) {
      throw new Error('Database configuration missing');
    }

    await tablesDB.updateRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.contractDraftsCollectionId,
      rowId: draftId,
      data: {
        isCompleted: true,
      },
    });
  }

  /**
   * Find drafts by contract ID
   */
  static async findDraftsByContractId(contractId: string, ownerId?: string) {
    const { tablesDB } = await createAdminClient();

    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.contractDraftsCollectionId
    ) {
      throw new Error('Database configuration missing');
    }

    const queries = [Query.equal('contractId', contractId)];
    if (ownerId) {
      queries.push(Query.equal('ownerId', ownerId));
    }

    const draftsResponse = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.contractDraftsCollectionId,
      queries,
    });

    return draftsResponse.rows || [];
  }

  /**
   * Find drafts by file name
   */
  static async findDraftsByFileName(ownerId: string, fileName: string) {
    const { tablesDB } = await createAdminClient();

    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.contractDraftsCollectionId
    ) {
      throw new Error('Database configuration missing');
    }

    const allDraftsResponse = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.contractDraftsCollectionId,
      queries: [
        Query.equal('ownerId', ownerId),
        Query.orderDesc('lastSavedAt'),
        Query.limit(100),
      ],
    });

    return allDraftsResponse.rows.filter((draft: any) => {
      try {
        const fileData = draft.processedFileData
          ? JSON.parse(draft.processedFileData)
          : null;
        return fileData?.name === fileName;
      } catch {
        return false;
      }
    });
  }
}
