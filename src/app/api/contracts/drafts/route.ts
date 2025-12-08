import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { ID, Query } from 'node-appwrite';
import CacheManager from '@/lib/services/cache-manager';
import { CACHE_KEYS, CACHE_TTLS } from '@/lib/services/cache-keys';
import { getUserDefaultOrganization } from '@/lib/rbac/permissions';
import { getFileType } from '@/lib/utils';

const FILES_COLLECTION_ID = '6934a3120033b4a5c4da';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ownerId,
      accountId,
      formData,
      currentStep,
      processedFileData,
      extractedData,
    } = body;

    if (!ownerId || !accountId) {
      return NextResponse.json(
        { error: 'Owner ID and Account ID are required' },
        { status: 400 }
      );
    }

    const { tablesDB } = await createAdminClient();

    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.contractDraftsCollectionId
    ) {
      console.error('Database configuration missing:', {
        databaseId: appwriteConfig.databaseId,
        collectionId: appwriteConfig.contractDraftsCollectionId,
      });
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    // Optimize processedFileData: Remove arrayBuffer and base64Content to reduce size
    // Upload file to storage and store only bucketFileId + metadata
    let optimizedProcessedFileData = null;
    let bucketFileId: string | null = null;

    if (processedFileData) {
      try {
        const parsed =
          typeof processedFileData === 'string'
            ? JSON.parse(processedFileData)
            : processedFileData;

        // If file has arrayBuffer, upload it to storage and get bucketFileId
        if (parsed.arrayBuffer && !parsed.bucketFileId) {
          try {
            const { storage } = await createAdminClient();
            const inputFile = InputFile.fromBuffer(
              Buffer.from(parsed.arrayBuffer),
              parsed.name
            );

            const bucketFile = await storage.createFile({
              bucketId: appwriteConfig.bucketId!,
              fileId: ID.unique(),
              file: inputFile,
            });

            bucketFileId = bucketFile.$id;
            console.log(`Uploaded draft file to storage: ${bucketFileId}`);
          } catch (uploadError: any) {
            console.warn(
              'Failed to upload draft file to storage:',
              uploadError.message
            );
            // Continue without bucketFileId - file will need to be re-uploaded on resume
          }
        } else if (parsed.bucketFileId) {
          // Already has bucketFileId from previous save
          bucketFileId = parsed.bucketFileId;
        }

        // Store only essential metadata, exclude large binary data
        optimizedProcessedFileData = {
          name: parsed.name,
          type: parsed.type,
          size: parsed.size,
          lastModified: parsed.lastModified,
          bucketFileId: bucketFileId || parsed.bucketFileId || null,
          // fileId will be added after file row is created
          // Exclude: arrayBuffer, base64Content (too large for database storage)
        };
      } catch (error) {
        console.warn('Error optimizing processedFileData:', error);
        // Fallback: try to extract at least the name
        if (processedFileData && typeof processedFileData === 'object') {
          optimizedProcessedFileData = {
            name: processedFileData.name,
            type: processedFileData.type,
            size: processedFileData.size,
            bucketFileId: processedFileData.bucketFileId || null,
          };
        }
      }
    }

    // Optimize formData: Remove empty/null/undefined values to reduce size
    let optimizedFormData = formData;
    if (formData && typeof formData === 'object') {
      optimizedFormData = Object.fromEntries(
        Object.entries(formData).filter(([_, value]) => {
          // Keep only non-empty values
          if (value === null || value === undefined || value === '')
            return false;
          if (Array.isArray(value) && value.length === 0) return false;
          if (typeof value === 'object' && Object.keys(value).length === 0)
            return false;
          return true;
        })
      );
    }

    // Optimize extractedData: Remove empty values
    let optimizedExtractedData = extractedData;
    if (extractedData && typeof extractedData === 'object') {
      optimizedExtractedData = Object.fromEntries(
        Object.entries(extractedData).filter(([_, value]) => {
          return value !== null && value !== undefined && value !== '';
        })
      );
    }

    // Create/update file row BEFORE draft creation so we can store fileId in draft
    // Note: Contracts are only created when form is successfully submitted via uploadFile
    let fileRow = null;

    if (processedFileData) {
      try {
        // Parse processedFileData if it's a string
        const fileData =
          typeof processedFileData === 'string'
            ? JSON.parse(processedFileData)
            : processedFileData;

        if (fileData && fileData.name) {
          // Check if file already exists for this draft
          const existingFiles = await tablesDB.listRows({
            databaseId: appwriteConfig.databaseId!,
            tableId: FILES_COLLECTION_ID,
            queries: [
              Query.equal('owner', ownerId),
              Query.equal('name', fileData.name),
              Query.orderDesc('$createdAt'),
              Query.limit(1),
            ],
          });

          // Get user's default organization
          const defaultOrg = await getUserDefaultOrganization(ownerId);
          if (!defaultOrg) {
            console.warn(
              'Could not get default organization for file creation'
            );
          }

          const fileType = getFileType(fileData.name);

          if (existingFiles.total === 0) {
            // Create new file entry
            const fileDocument: any = {
              name: fileData.name,
              type: fileType.type,
              extension: fileType.extension,
              size: fileData.size || 0,
              owner: ownerId,
              accountId,
              users: [],
              orgId: defaultOrg?.orgId || 'default_organization',
              url: '', // Placeholder - will be updated when file is uploaded
              bucketFileId: '', // Placeholder - will be updated when file is uploaded
              isContract: true,
            };

            // Add contract metadata from formData if available
            if (
              formData &&
              typeof formData === 'object' &&
              formData.contractName
            ) {
              fileDocument.contractName = formData.contractName;
            }

            fileRow = await tablesDB.createRow({
              databaseId: appwriteConfig.databaseId!,
              tableId: FILES_COLLECTION_ID,
              rowId: ID.unique(),
              data: fileDocument,
            });

            console.log('File row created in Files collection:', fileRow.$id);
          } else {
            // Update existing file entry with latest formData
            fileRow = existingFiles.rows[0];
            const updateData: any = {};

            if (formData && typeof formData === 'object') {
              if (formData.contractName) {
                updateData.contractName = formData.contractName;
              }
            }

            if (Object.keys(updateData).length > 0) {
              try {
                fileRow = await tablesDB.updateRow({
                  databaseId: appwriteConfig.databaseId!,
                  tableId: FILES_COLLECTION_ID,
                  rowId: fileRow.$id,
                  data: updateData,
                });
                console.log(
                  'File row updated in Files collection:',
                  fileRow.$id
                );
              } catch (updateError: any) {
                console.warn('Could not update file row:', updateError.message);
              }
            }
          }
        }
      } catch (fileError: any) {
        // Don't fail the draft save if file creation fails
        console.error('Error creating file row:', {
          error: fileError.message,
          code: fileError.code,
          type: fileError.type,
        });
      }
    }

    // Now create draftData with fileId as a separate attribute (more efficient for querying)
    const draftData = {
      ownerId,
      accountId,
      formData: optimizedFormData ? JSON.stringify(optimizedFormData) : null,
      currentStep,
      processedFileData: optimizedProcessedFileData
        ? JSON.stringify(optimizedProcessedFileData)
        : null,
      extractedData: optimizedExtractedData
        ? JSON.stringify(optimizedExtractedData)
        : null,
      progressPercentage: Math.round((currentStep / 10) * 100),
      lastSavedAt: new Date().toISOString(),
      isCompleted: body.isCompleted || false,
      // Store fileId from Files table to enable efficient draft deletion after contract upload
      fileId: fileRow?.$id || null,
    };

    console.log('Saving draft:', {
      databaseId: appwriteConfig.databaseId,
      collectionId: appwriteConfig.contractDraftsCollectionId,
      ownerId,
      accountId,
      currentStep,
      progressPercentage: draftData.progressPercentage,
      hasFormData: !!formData,
      hasProcessedFileData: !!processedFileData,
      fileId: draftData.fileId,
      fileRowId: fileRow?.$id || null,
    });

    // Check if draftId is provided - if so, update existing draft
    // Otherwise, create a new draft (each file upload creates a new draft)
    const { draftId } = body;

    let draft;
    try {
      if (draftId) {
        // Update existing draft
        console.log('Updating existing draft:', draftId);
        
        // If fileRow exists, update fileId; otherwise preserve existing fileId
        if (fileRow) {
          draftData.fileId = fileRow.$id;
        } else {
          // Get existing draft to preserve fileId if it exists
          try {
            const existingDraft = await tablesDB.getRow({
              databaseId: appwriteConfig.databaseId,
              tableId: appwriteConfig.contractDraftsCollectionId,
              rowId: draftId,
            });
            // Preserve existing fileId if no new file row was created
            if (existingDraft.fileId && !fileRow) {
              draftData.fileId = existingDraft.fileId;
            }
          } catch (error) {
            // If we can't get the existing draft, continue with null fileId
            console.warn('Could not fetch existing draft to preserve fileId:', error);
          }
        }
        
        draft = await tablesDB.updateRow({
          databaseId: appwriteConfig.databaseId,
          tableId: appwriteConfig.contractDraftsCollectionId,
          rowId: draftId,
          data: draftData,
        });
      } else {
        // Create new draft (every file upload creates a new draft)
        console.log('Creating new draft');
        draft = await tablesDB.createRow({
          databaseId: appwriteConfig.databaseId,
          tableId: appwriteConfig.contractDraftsCollectionId,
          rowId: ID.unique(),
          data: draftData,
        });
      }
      console.log('Draft saved successfully:', draft.$id);
    } catch (dbError: any) {
      console.error('Database error saving draft:', {
        error: dbError.message,
        code: dbError.code,
        type: dbError.type,
        response: dbError.response,
      });
      throw dbError;
    }

    // Invalidate cache for this owner's drafts to ensure fresh data
    try {
      await CacheManager.invalidate(CACHE_KEYS.contracts.drafts(ownerId));
    } catch (cacheError) {
      // Don't fail the request if cache invalidation fails
      console.warn('Failed to invalidate cache:', cacheError);
    }

    return NextResponse.json({
      success: true,
      draft,
      fileRow: fileRow ? { $id: fileRow.$id } : null,
      message: 'Draft saved successfully',
    });
  } catch (error: any) {
    console.error('Error saving draft:', {
      message: error?.message,
      code: error?.code,
      type: error?.type,
      response: error?.response,
      stack: error?.stack,
      name: error?.name,
      fullError: error,
    });

    // Extract error message from various possible error formats
    let errorMessage = 'Failed to save draft';
    if (error?.message) {
      errorMessage = error.message;
    } else if (error?.response?.message) {
      errorMessage = error.response.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details:
          process.env.NODE_ENV === 'development'
            ? {
                code: error?.code,
                type: error?.type,
              }
            : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId');

    if (!ownerId) {
      return NextResponse.json(
        { error: 'Owner ID is required' },
        { status: 400 }
      );
    }

    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.contractDraftsCollectionId
    ) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    // Use cache for lightning-fast response
    const cacheKey = CACHE_KEYS.contracts.drafts(ownerId);
    const databaseId = appwriteConfig.databaseId;
    const tableId = appwriteConfig.contractDraftsCollectionId;
    const cachedData = await CacheManager.withCache(
      'contracts/drafts',
      cacheKey,
      async () => {
        const { tablesDB } = await createAdminClient();

        // Optimize query - only select necessary fields for faster response
        const drafts = await tablesDB.listRows({
          databaseId,
          tableId,
          queries: [
            Query.equal('ownerId', ownerId),
            Query.equal('isCompleted', false),
            Query.orderDesc('lastSavedAt'),
            Query.limit(100),
            // Only select fields needed for the list view
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

        // Filter out completed drafts and parse JSON fields
        const activeDrafts = drafts.rows
          .filter((draft: any) => !draft.isCompleted)
          .map((draft: any) => ({
            ...draft,
            formData: draft.formData ? JSON.parse(draft.formData) : null,
            processedFileData: draft.processedFileData
              ? JSON.parse(draft.processedFileData)
              : null,
            extractedData: draft.extractedData
              ? JSON.parse(draft.extractedData)
              : null,
          }));

        return activeDrafts;
      },
      CACHE_TTLS.medium
    );

    return NextResponse.json(
      {
        success: true,
        drafts: cachedData,
      },
      {
        headers: {
          'Cache-Control': `s-maxage=${CACHE_TTLS.medium}, stale-while-revalidate`,
          'X-Cache': 'HIT',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching drafts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch drafts' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get('draftId');
    const ownerId = searchParams.get('ownerId');

    if (!draftId) {
      return NextResponse.json(
        { error: 'Draft ID is required' },
        { status: 400 }
      );
    }

    const { tablesDB } = await createAdminClient();

    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.contractDraftsCollectionId
    ) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    const FILES_COLLECTION_ID = '6934a3120033b4a5c4da';
    const CONTRACTS_COLLECTION_ID = '6912e5a400789ef12345';

    // Get draft to find associated file
    // Note: We don't look for contracts because contracts are only created
    // when the form is successfully submitted via uploadFile, not during drafts.
    let draft: any;
    let draftOwnerId: string | null = ownerId;
    let fileId: string | null = null;

    try {
      draft = await tablesDB.getRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.contractDraftsCollectionId,
        rowId: draftId,
      });
      draftOwnerId = draft.ownerId as string;

      // Parse processedFileData to get file name
      const processedFileData = draft.processedFileData
        ? JSON.parse(draft.processedFileData)
        : null;

      if (processedFileData && processedFileData.name) {
        // Find the file entry in Files collection
        try {
          const files = await tablesDB.listRows({
            databaseId: appwriteConfig.databaseId,
            tableId: FILES_COLLECTION_ID,
            queries: [
              Query.equal('owner', draftOwnerId),
              Query.equal('name', processedFileData.name),
              Query.limit(1),
            ],
          });

          if (files.total > 0) {
            fileId = files.rows[0].$id;
          }
        } catch (fileError: any) {
          console.warn('Could not find file for draft:', fileError.message);
        }
      }
    } catch (error) {
      // If we can't get the draft, proceed with deletion anyway
      console.warn('Could not fetch draft:', error);
    }

    // Delete file entry (if exists)
    if (fileId) {
      try {
        // Clear owner relationship first to avoid two-way relationship constraint issues
        try {
          const fileDoc = await tablesDB.getRow({
            databaseId: appwriteConfig.databaseId,
            tableId: FILES_COLLECTION_ID,
            rowId: fileId,
          });
          if (fileDoc.owner) {
            await tablesDB.updateRow({
              databaseId: appwriteConfig.databaseId,
              tableId: FILES_COLLECTION_ID,
              rowId: fileId,
              data: { owner: null },
            });
            console.log('Cleared owner relationship before file deletion');
          }
        } catch (clearError: any) {
          console.warn(
            'Could not clear owner relationship:',
            clearError.message
          );
          // Continue with deletion
        }

        await tablesDB.deleteRow({
          databaseId: appwriteConfig.databaseId,
          tableId: FILES_COLLECTION_ID,
          rowId: fileId,
        });
        console.log(`Deleted file ${fileId} associated with draft ${draftId}`);
      } catch (fileDeleteError: any) {
        // Log but don't fail - file might have been deleted already
        console.warn('Error deleting file:', fileDeleteError.message);
      }
    }

    // Delete the draft
    await tablesDB.deleteRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.contractDraftsCollectionId,
      rowId: draftId,
    });

    // Invalidate cache for this owner's drafts
    if (draftOwnerId) {
      try {
        await CacheManager.invalidate(
          CACHE_KEYS.contracts.drafts(draftOwnerId)
        );
      } catch (cacheError) {
        // Don't fail the request if cache invalidation fails
        console.warn('Failed to invalidate cache:', cacheError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Draft deleted successfully',
      deleted: {
        draft: draftId,
        file: fileId || null,
      },
    });
  } catch (error: any) {
    console.error('Error deleting draft:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete draft' },
      { status: 500 }
    );
  }
}
