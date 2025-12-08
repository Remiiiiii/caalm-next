import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Databases } from 'node-appwrite';

const CONTRACT_DRAFTS_COLLECTION_ID = '692f4a86002ae8f45cae';

export async function POST(request: NextRequest) {
  try {
    if (!appwriteConfig.databaseId) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    const { databases, tablesDB } = await createAdminClient();

    const result: any = {
      steps: [] as string[],
      errors: [] as string[],
      attributes: [] as any[],
    };

    // Attributes to reduce: formData and extractedData from 65,535 to 16,384 (16KB)
    const attributesToReduce = [
      { key: 'formData', newSize: 16384, required: true },
      { key: 'extractedData', newSize: 16384, required: false },
    ];

    for (const attr of attributesToReduce) {
      try {
        result.steps.push(`\nProcessing ${attr.key}...`);

        // Step 1: Backup all values
        result.steps.push(`Step 1: Backing up ${attr.key} values...`);
        const allDrafts = await tablesDB.listRows({
          databaseId: appwriteConfig.databaseId,
          tableId: CONTRACT_DRAFTS_COLLECTION_ID,
          queries: [],
        });

        const backups: Record<string, any> = {};
        for (const draft of allDrafts.rows) {
          if (draft[attr.key]) {
            backups[draft.$id] = draft[attr.key];
          }
        }
        result.steps.push(`✓ Backed up ${Object.keys(backups).length} draft(s)`);

        // Step 2: Delete the old attribute
        result.steps.push(`Step 2: Deleting old ${attr.key} attribute...`);
        try {
          await tablesDB.deleteColumn({
            databaseId: appwriteConfig.databaseId,
            tableId: CONTRACT_DRAFTS_COLLECTION_ID,
            key: attr.key,
          });
          result.steps.push(`✓ Deleted old ${attr.key} attribute`);
        } catch (error: any) {
          result.errors.push(`Failed to delete ${attr.key}: ${error.message}`);
          throw error;
        }

        // Step 3: Create new attribute with smaller size
        result.steps.push(`Step 3: Creating new ${attr.key} attribute (${attr.newSize} bytes)...`);
        try {
          // For required attributes, don't provide a default value
          if (attr.required) {
            await databases.createStringAttribute(
              appwriteConfig.databaseId,
              CONTRACT_DRAFTS_COLLECTION_ID,
              attr.key,
              attr.newSize,
              true, // required
              undefined, // no default for required attributes
              false // not array
            );
          } else {
            await databases.createStringAttribute(
              appwriteConfig.databaseId,
              CONTRACT_DRAFTS_COLLECTION_ID,
              attr.key,
              attr.newSize,
              false, // not required
              '', // default for optional
              false // not array
            );
          }
          result.steps.push(`✓ Created new ${attr.key} attribute (${attr.newSize} bytes)`);
        } catch (error: any) {
          result.errors.push(`Failed to create new ${attr.key}: ${error.message}`);
          throw error;
        }

        // Step 4: Restore backed up values (only if they fit in new size)
        result.steps.push(`Step 4: Restoring ${attr.key} values...`);
        let restored = 0;
        let skipped = 0;
        for (const [draftId, value] of Object.entries(backups)) {
          try {
            // Check if value fits in new size
            const valueString = typeof value === 'string' ? value : JSON.stringify(value);
            if (valueString.length <= attr.newSize) {
              await tablesDB.updateRow({
                databaseId: appwriteConfig.databaseId,
                tableId: CONTRACT_DRAFTS_COLLECTION_ID,
                rowId: draftId,
                data: { [attr.key]: valueString },
              });
              restored++;
            } else {
              // Value is too large, truncate or skip
              const truncated = valueString.substring(0, attr.newSize - 100); // Leave some buffer
              await tablesDB.updateRow({
                databaseId: appwriteConfig.databaseId,
                tableId: CONTRACT_DRAFTS_COLLECTION_ID,
                rowId: draftId,
                data: { [attr.key]: truncated },
              });
              skipped++;
              result.steps.push(`⚠ Truncated ${attr.key} for draft ${draftId} (${valueString.length} -> ${truncated.length} bytes)`);
            }
          } catch (error: any) {
            result.errors.push(`Failed to restore draft ${draftId}: ${error.message}`);
          }
        }
        result.steps.push(`✓ Restored ${restored} draft(s), truncated ${skipped} draft(s)`);

        result.attributes.push({
          key: attr.key,
          oldSize: 65535,
          newSize: attr.newSize,
          restored,
          truncated: skipped,
        });
      } catch (error: any) {
        result.errors.push(`Error processing ${attr.key}: ${error.message}`);
        // Continue with next attribute even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully reduced string attribute sizes',
      result,
    });
  } catch (error: any) {
    console.error('Error reducing attribute sizes:', error);
    return NextResponse.json(
      {
        error: 'Failed to reduce attribute sizes',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

