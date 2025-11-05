import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';

export async function POST(request: NextRequest) {
  try {
    const { fileIds } = await request.json();

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or empty fileIds array' },
        { status: 400 }
      );
    }

    // Validate configuration
    if (!appwriteConfig.databaseId || !appwriteConfig.filesCollectionId) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    const { tablesDB } = await createAdminClient();

    // Fetch files by their IDs using Query.or
    const response = await tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      [Query.or(fileIds.map((id) => Query.equal('$id', id))), Query.limit(100)]
    );

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
  } catch (error) {
    console.error('Error fetching files by IDs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}
