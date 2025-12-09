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
      console.error('[get-by-ids] Database configuration missing:', {
        databaseId: appwriteConfig.databaseId,
        filesCollectionId: appwriteConfig.filesCollectionId,
      });
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    const adminClient = await createAdminClient();

    // Build queries for fetching files by IDs
    const queries = [Query.limit(100)];

    if (fileIds.length === 1) {
      queries.unshift(Query.equal('$id', fileIds[0]));
    } else {
      queries.unshift(Query.or(fileIds.map((id) => Query.equal('$id', id))));
    }

    // Fetch files by their IDs using the constructed queries
    // Using positional parameters to match the working pattern from users/get-by-ids
    const response = await adminClient.tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      queries
    );

    const files = response.rows.map((file: any) => {

      // Return all fields as they exist in the database
      // Handle null, undefined, and empty string values
      const result: {
        $id: string;
        name?: string | null;
        url?: string | null;
        type?: string | null;
        extension?: string | null;
        size?: number | null;
        bucketFileId?: string | null;
        owner?: string | null;
        accountId?: string | null;
        $createdAt?: string | null;
      } = {
        $id: file.$id || '',
      };

      // Always include all fields - set to actual value or null if missing/invalid
      // The client will convert null to undefined as needed
      result.name = file.name != null && file.name !== '' && file.name !== 'null' 
        ? String(file.name).trim() 
        : null;
      result.url = file.url != null && file.url !== '' && file.url !== 'null' 
        ? String(file.url).trim() 
        : null;
      result.type = file.type != null && file.type !== '' && file.type !== 'null' 
        ? String(file.type).trim() 
        : null;
      result.extension = file.extension != null && file.extension !== '' && file.extension !== 'null' 
        ? String(file.extension).trim() 
        : null;
      
      // Handle size specially - convert to number if valid
      if (file.size != null && file.size !== '' && file.size !== 'null' && file.size !== null) {
        const sizeNum = Number(file.size);
        result.size = !isNaN(sizeNum) && sizeNum >= 0 ? sizeNum : null;
      } else {
        result.size = null;
      }
      
      result.bucketFileId = file.bucketFileId != null && file.bucketFileId !== '' && file.bucketFileId !== 'null' 
        ? String(file.bucketFileId).trim() 
        : null;
      result.owner = file.owner != null && file.owner !== '' && file.owner !== 'null' 
        ? String(file.owner).trim() 
        : null;
      result.accountId = file.accountId != null && file.accountId !== '' && file.accountId !== 'null' 
        ? String(file.accountId).trim() 
        : null;
      result.$createdAt = file.$createdAt != null && file.$createdAt !== '' && file.$createdAt !== 'null' 
        ? String(file.$createdAt).trim() 
        : null;

      return result;
    });

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
