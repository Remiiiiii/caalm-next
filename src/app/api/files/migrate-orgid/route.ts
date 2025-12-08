import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';
import { getUserDefaultOrganization } from '@/lib/rbac/permissions';

export async function POST(request: NextRequest) {
  try {
    const { tablesDB } = await createAdminClient();

    if (!appwriteConfig.databaseId || !appwriteConfig.filesCollectionId) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    // Fetch all files missing orgId
    // Try isNull query first, fallback to fetching all if needed
    let filesWithoutOrgId;
    try {
      filesWithoutOrgId = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.filesCollectionId,
        queries: [
          Query.isNull('orgId'),
          Query.limit(1000), // Process in batches
        ],
      });
    } catch (error) {
      // Fallback: fetch all files and filter in memory
      console.log('isNull query failed, fetching all files and filtering...');
      const allFiles = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.filesCollectionId,
        queries: [Query.limit(1000)],
      });
      filesWithoutOrgId = {
        ...allFiles,
        rows: allFiles.rows.filter(
          (file: any) => !file.orgId || file.orgId === '' || file.orgId === null
        ),
        total: allFiles.rows.filter(
          (file: any) => !file.orgId || file.orgId === '' || file.orgId === null
        ).length,
      };
    }

    const totalFiles = filesWithoutOrgId.total;
    const files = filesWithoutOrgId.rows;

    console.log(`Found ${totalFiles} files missing orgId`);

    const results = {
      total: totalFiles,
      updated: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process files in batches to avoid overwhelming the system
    const batchSize = 50;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (file) => {
          try {
            // Get the owner's default organization
            const ownerId = file.owner || file.accountId;
            if (!ownerId) {
              results.failed++;
              results.errors.push(
                `File ${file.$id}: No owner or accountId found`
              );
              return;
            }

            const defaultOrg = await getUserDefaultOrganization(ownerId);
            if (!defaultOrg?.orgId) {
              results.failed++;
              results.errors.push(
                `File ${file.$id}: No organization found for user ${ownerId}`
              );
              return;
            }

            // Update the file with orgId
            await tablesDB.updateRow({
              databaseId: appwriteConfig.databaseId!,
              tableId: appwriteConfig.filesCollectionId!,
              rowId: file.$id,
              data: {
                orgId: defaultOrg.orgId,
              },
            });

            results.updated++;
            console.log(
              `Updated file ${file.$id} with orgId: ${defaultOrg.orgId}`
            );
          } catch (error: any) {
            results.failed++;
            const errorMsg = `File ${file.$id}: ${
              error?.message || 'Unknown error'
            }`;
            results.errors.push(errorMsg);
            console.error(errorMsg, error);
          }
        })
      );

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < files.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration completed: ${results.updated} updated, ${results.failed} failed out of ${results.total} total`,
      results,
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        error: 'Migration failed',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check how many files need migration
export async function GET() {
  try {
    const { tablesDB } = await createAdminClient();

    if (!appwriteConfig.databaseId || !appwriteConfig.filesCollectionId) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    // Count files missing orgId
    let filesWithoutOrgId;
    try {
      filesWithoutOrgId = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.filesCollectionId,
        queries: [Query.isNull('orgId'), Query.limit(1)],
      });
    } catch (error) {
      // Fallback: fetch sample and check
      const sampleFiles = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.filesCollectionId,
        queries: [Query.limit(100)],
      });
      const missingCount = sampleFiles.rows.filter(
        (file: any) => !file.orgId || file.orgId === '' || file.orgId === null
      ).length;
      filesWithoutOrgId = {
        total: missingCount > 0 ? sampleFiles.total : 0,
        rows: [],
      };
    }

    // Get total file count
    const allFiles = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesCollectionId,
      queries: [Query.limit(1)],
    });

    return NextResponse.json({
      totalFiles: allFiles.total,
      filesMissingOrgId: filesWithoutOrgId.total,
      needsMigration: filesWithoutOrgId.total > 0,
    });
  } catch (error: any) {
    console.error('Migration check error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check migration status',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
