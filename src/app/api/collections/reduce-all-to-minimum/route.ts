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

    // Reduce all string attributes to absolute minimum
    const attributesToReduce = [
      { key: 'processedFileData', currentSize: 5120, newSize: 2048 }, // 5KB -> 2KB
      { key: 'formData', currentSize: 4096, newSize: 2048 }, // 4KB -> 2KB
      { key: 'extractedData', currentSize: 4096, newSize: 2048 }, // 4KB -> 2KB
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
        const isRequired = attr.key === 'formData';
        if (isRequired) {
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

        // Restore values (truncate if needed)
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
      message: 'Reduced all string attributes to minimum (2KB each)',
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





