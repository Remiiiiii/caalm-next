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
    };

    // Reduce formData and extractedData to 8KB each (from 16KB)
    // This will free up another 16KB
    const attributesToReduce = [
      { key: 'formData', currentSize: 16384, newSize: 8192, required: true },
      { key: 'extractedData', currentSize: 16384, newSize: 8192, required: false },
    ];

    for (const attr of attributesToReduce) {
      try {
        result.steps.push(`\nReducing ${attr.key} from ${attr.currentSize} to ${attr.newSize} bytes...`);

        // Backup values
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

        // Delete old attribute
        await tablesDB.deleteColumn({
          databaseId: appwriteConfig.databaseId,
          tableId: CONTRACT_DRAFTS_COLLECTION_ID,
          key: attr.key,
        });
        result.steps.push(`✓ Deleted old ${attr.key}`);

        // Create new smaller attribute
        if (attr.required) {
          await databases.createStringAttribute(
            appwriteConfig.databaseId,
            CONTRACT_DRAFTS_COLLECTION_ID,
            attr.key,
            attr.newSize,
            true,
            undefined,
            false
          );
        } else {
          await databases.createStringAttribute(
            appwriteConfig.databaseId,
            CONTRACT_DRAFTS_COLLECTION_ID,
            attr.key,
            attr.newSize,
            false,
            '',
            false
          );
        }
        result.steps.push(`✓ Created new ${attr.key} (${attr.newSize} bytes)`);

        // Restore values
        let restored = 0;
        let truncated = 0;
        for (const [draftId, value] of Object.entries(backups)) {
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
            // Truncate if needed
            const truncatedValue = valueString.substring(0, attr.newSize - 100);
            await tablesDB.updateRow({
              databaseId: appwriteConfig.databaseId,
              tableId: CONTRACT_DRAFTS_COLLECTION_ID,
              rowId: draftId,
              data: { [attr.key]: truncatedValue },
            });
            truncated++;
          }
        }
        result.steps.push(`✓ Restored ${restored}, truncated ${truncated}`);
      } catch (error: any) {
        result.errors.push(`Error reducing ${attr.key}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Reduced attribute sizes to minimum',
      result,
    });
  } catch (error: any) {
    console.error('Error reducing to minimum:', error);
    return NextResponse.json(
      {
        error: 'Failed to reduce attribute sizes',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}



















