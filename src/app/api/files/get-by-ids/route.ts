import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';

export async function POST(request: NextRequest) {
  try {
    const { fileIds } = await request.json();

    console.log('[get-by-ids] Received fileIds:', fileIds);

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      console.error('[get-by-ids] Invalid or empty fileIds array');
      return NextResponse.json(
        { error: 'Invalid or empty fileIds array' },
        { status: 400 }
      );
    }

    // Validate configuration
    if (!appwriteConfig.databaseId || !appwriteConfig.filesCollectionId) {
      console.error('[get-by-ids] Database configuration missing:', {
        databaseId: appwriteConfig.databaseId,
        filesCollectionId: appwriteConfig.filesCollectionId,
      });
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    console.log('[get-by-ids] Creating admin client...');
    const adminClient = await createAdminClient();
    console.log('[get-by-ids] Admin client created successfully');

    // Build queries for fetching files by IDs
    const queries = [Query.limit(100)];

    if (fileIds.length === 1) {
      queries.unshift(Query.equal('$id', fileIds[0]));
    } else {
      queries.unshift(Query.or(fileIds.map((id) => Query.equal('$id', id))));
    }

    console.log('[get-by-ids] Fetching files with queries:', {
      databaseId: appwriteConfig.databaseId,
      collectionId: appwriteConfig.filesCollectionId,
      fileIdsCount: fileIds.length,
    });

    // Fetch files by their IDs using the constructed queries
    // Using positional parameters to match the working pattern from users/get-by-ids
    const response = await adminClient.tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      queries
    );

    console.log('[get-by-ids] Files fetched successfully:', {
      count: response.rows.length,
    });

    const files = response.rows.map((file: any) => ({
      $id: file.$id,
      name: file.name,
      url: file.url,
      type: file.type,
      extension: file.extension,
      size: file.size,
      bucketFileId: file.bucketFileId,
      owner: file.owner,
      accountId: file.accountId,
      $createdAt: file.$createdAt,
    }));

    return NextResponse.json(files);
  } catch (error: any) {
    console.error('[get-by-ids] Error fetching files by IDs:', {
      message: error?.message,
      code: error?.code,
      type: error?.type,
      stack: error?.stack,
      error: error,
    });

    // Return more specific error information
    const errorMessage =
      error?.message || error?.code || 'Failed to fetch files';
    return NextResponse.json(
      { error: errorMessage, details: error?.type || 'Unknown error' },
      { status: 500 }
    );
  }
}
