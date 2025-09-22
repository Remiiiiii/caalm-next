import { NextRequest, NextResponse } from 'next/server';
import {
  createApiAdminClient,
  createApiSessionClient,
} from '@/lib/appwrite/api-client';
import { appwriteConfig } from '@/lib/appwrite/config';
import { ID } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import { constructFileUrl, getFileType } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const department = formData.get('department') as string;
    const uploadId = formData.get('uploadId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate file size (50MB limit)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    // Get user session for authentication
    const { account } = await createApiSessionClient();
    let accountId: string;

    try {
      const session = await account.get();
      accountId = session.$id;
    } catch (error) {
      console.error('Authentication error:', error);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Upload file directly using Appwrite (not the server action)
    const { storage, tablesDB } = await createApiAdminClient();

    try {
      // Convert File to ArrayBuffer for InputFile.fromBuffer
      const arrayBuffer = await file.arrayBuffer();
      const inputFile = InputFile.fromBuffer(
        Buffer.from(arrayBuffer),
        file.name
      );

      // Upload to Appwrite storage
      const bucketFile = await storage.createFile(
        appwriteConfig.bucketId,
        ID.unique(),
        inputFile
      );

      const fileDocument = {
        type: getFileType(bucketFile.name).type,
        name: bucketFile.name,
        url: constructFileUrl(bucketFile.$id),
        extension: getFileType(bucketFile.name).extension,
        size: bucketFile.sizeOriginal,
        owner: userId,
        accountId,
        users: [],
        bucketFileId: bucketFile.$id,
      };

      const newFile = await tablesDB.createRow(
        appwriteConfig.databaseId,
        appwriteConfig.filesCollectionId,
        ID.unique(),
        fileDocument
      );

      if (!newFile) {
        // Clean up uploaded file if database creation fails
        await storage.deleteFile(appwriteConfig.bucketId, bucketFile.$id);
        throw new Error('File document creation failed');
      }

      return NextResponse.json({
        data: newFile,
        uploadId,
        message: 'File uploaded successfully',
      });
    } catch (uploadError) {
      console.error('Appwrite upload error:', uploadError);
      throw uploadError;
    }
  } catch (error) {
    console.error('File upload error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown error occurred during upload';

    return NextResponse.json(
      {
        error: 'Failed to upload file',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
