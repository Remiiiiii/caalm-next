import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId'); // Optional: clear for specific file

    const { tablesDB } = await createAdminClient();

    if (!appwriteConfig.databaseId || !appwriteConfig.filesCollectionId) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    const results = {
      total: 0,
      cleared: 0,
      failed: 0,
      errors: [] as string[],
    };

    if (fileId) {
      // Clear owner for specific file
      try {
        await tablesDB.updateRow({
          databaseId: appwriteConfig.databaseId,
          tableId: appwriteConfig.filesCollectionId,
          rowId: fileId,
          data: {
            owner: null,
          },
        });
        results.cleared = 1;
        results.total = 1;
      } catch (error: any) {
        results.failed = 1;
        results.total = 1;
        results.errors.push(`File ${fileId}: ${error?.message || 'Unknown error'}`);
      }
    } else {
      // Clear owners for all files (use with caution)
      const filesWithOwner = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.filesCollectionId,
        queries: [
          Query.isNotNull('owner'),
          Query.limit(1000),
        ],
      });

      results.total = filesWithOwner.total;
      const files = filesWithOwner.rows;

      const batchSize = 50;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (file) => {
            try {
              await tablesDB.updateRow({
                databaseId: appwriteConfig.databaseId,
                tableId: appwriteConfig.filesCollectionId,
                rowId: file.$id,
                data: {
                  owner: null,
                },
              });
              results.cleared++;
            } catch (error: any) {
              results.failed++;
              results.errors.push(
                `File ${file.$id}: ${error?.message || 'Unknown error'}`
              );
            }
          })
        );

        if (i + batchSize < files.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleared owner relationships: ${results.cleared} cleared, ${results.failed} failed out of ${results.total} total`,
      results,
    });
  } catch (error: any) {
    console.error('Clear owner error:', error);
    return NextResponse.json(
      {
        error: 'Failed to clear owner relationships',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

