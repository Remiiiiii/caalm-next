import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query, ID } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';

export async function POST(request: NextRequest) {
  try {
    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.contractDraftsCollectionId ||
      !appwriteConfig.bucketId
    ) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    const { tablesDB, storage } = await createAdminClient();

    // Get all drafts
    const allDrafts = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.contractDraftsCollectionId,
      queries: [Query.limit(1000)], // Adjust limit as needed
    });

    const result = {
      total: allDrafts.total,
      optimized: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const draft of allDrafts.rows) {
      try {
        let needsUpdate = false;
        const updateData: any = {};

        // Optimize processedFileData
        if (draft.processedFileData) {
          try {
            const parsed = typeof draft.processedFileData === 'string'
              ? JSON.parse(draft.processedFileData)
              : draft.processedFileData;

            // Check if it has large fields that need optimization
            if (parsed.arrayBuffer || parsed.base64Content) {
              let bucketFileId = parsed.bucketFileId;

              // If no bucketFileId but has arrayBuffer, upload to storage
              if (!bucketFileId && parsed.arrayBuffer) {
                try {
                  const inputFile = InputFile.fromBuffer(
                    Buffer.from(parsed.arrayBuffer),
                    parsed.name
                  );

                  const bucketFile = await storage.createFile({
                    bucketId: appwriteConfig.bucketId,
                    fileId: ID.unique(),
                    file: inputFile,
                  });

                  bucketFileId = bucketFile.$id;
                } catch (uploadError: any) {
                  console.warn(`Failed to upload file for draft ${draft.$id}:`, uploadError.message);
                  // Skip this draft if upload fails
                  result.skipped++;
                  continue;
                }
              }

              // Create optimized version
              const optimized = {
                name: parsed.name,
                type: parsed.type,
                size: parsed.size,
                lastModified: parsed.lastModified,
                bucketFileId: bucketFileId || null,
              };

              updateData.processedFileData = JSON.stringify(optimized);
              needsUpdate = true;
            }
          } catch (error: any) {
            result.errors.push(`Error optimizing processedFileData for draft ${draft.$id}: ${error.message}`);
          }
        }

        // Optimize formData
        if (draft.formData) {
          try {
            const parsed = typeof draft.formData === 'string'
              ? JSON.parse(draft.formData)
              : draft.formData;

            // Remove empty values
            const optimized = Object.fromEntries(
              Object.entries(parsed).filter(([_, value]) => {
                if (value === null || value === undefined || value === '') return false;
                if (Array.isArray(value) && value.length === 0) return false;
                if (typeof value === 'object' && Object.keys(value).length === 0) return false;
                return true;
              })
            );

            const optimizedString = JSON.stringify(optimized);
            if (optimizedString.length < (typeof draft.formData === 'string' ? draft.formData.length : JSON.stringify(parsed).length)) {
              updateData.formData = optimizedString;
              needsUpdate = true;
            }
          } catch (error: any) {
            result.errors.push(`Error optimizing formData for draft ${draft.$id}: ${error.message}`);
          }
        }

        // Optimize extractedData
        if (draft.extractedData) {
          try {
            const parsed = typeof draft.extractedData === 'string'
              ? JSON.parse(draft.extractedData)
              : draft.extractedData;

            // Remove empty values
            const optimized = Object.fromEntries(
              Object.entries(parsed).filter(([_, value]) => {
                return value !== null && value !== undefined && value !== '';
              })
            );

            const optimizedString = JSON.stringify(optimized);
            if (optimizedString.length < (typeof draft.extractedData === 'string' ? draft.extractedData.length : JSON.stringify(parsed).length)) {
              updateData.extractedData = optimizedString;
              needsUpdate = true;
            }
          } catch (error: any) {
            result.errors.push(`Error optimizing extractedData for draft ${draft.$id}: ${error.message}`);
          }
        }

        // Update draft if needed
        if (needsUpdate) {
          await tablesDB.updateRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.contractDraftsCollectionId,
            rowId: draft.$id,
            data: updateData,
          });
          result.optimized++;
          console.log(`Optimized draft ${draft.$id}`);
        } else {
          result.skipped++;
        }
      } catch (error: any) {
        result.errors.push(`Error processing draft ${draft.$id}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Error optimizing drafts:', error);
    return NextResponse.json(
      {
        error: 'Failed to optimize drafts',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}











