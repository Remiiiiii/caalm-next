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

    // Log the first file to see its structure
    if (response.rows.length > 0) {
      console.log('[get-by-ids] Sample file from database:', {
        $id: response.rows[0].$id,
        keys: Object.keys(response.rows[0]),
        name: response.rows[0].name,
        size: response.rows[0].size,
        extension: response.rows[0].extension,
        url: response.rows[0].url,
        type: response.rows[0].type,
        fullRow: response.rows[0],
      });
    }

    const files = response.rows.map((file: any) => {
      // Log each file's raw data to understand what we're getting
      console.log('[get-by-ids] Processing file row:', {
        $id: file.$id,
        name: file.name,
        nameType: typeof file.name,
        nameValue: file.name,
        size: file.size,
        sizeType: typeof file.size,
        sizeValue: file.size,
        extension: file.extension,
        extensionValue: file.extension,
        url: file.url,
        urlValue: file.url,
        type: file.type,
        typeValue: file.type,
        allKeys: Object.keys(file),
        fullFile: JSON.parse(JSON.stringify(file)), // Deep clone for logging
      });

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

      console.log('[get-by-ids] Processed file result:', result);
      return result;
    });

    console.log('[get-by-ids] Returning files:', files);
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
