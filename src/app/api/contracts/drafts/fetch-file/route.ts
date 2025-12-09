import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bucketFileId } = body;

    if (!bucketFileId) {
      return NextResponse.json(
        { error: 'bucketFileId is required' },
        { status: 400 }
      );
    }

    if (!appwriteConfig.bucketId) {
      return NextResponse.json(
        { error: 'Bucket configuration missing' },
        { status: 500 }
      );
    }

    const { storage } = await createAdminClient();

    // Get file from storage
    const file = await storage.getFile({
      bucketId: appwriteConfig.bucketId,
      fileId: bucketFileId,
    });

    // Download file content
    const fileContent = await storage.getFileDownload({
      bucketId: appwriteConfig.bucketId,
      fileId: bucketFileId,
    });

    // Convert to ArrayBuffer
    const arrayBuffer = await fileContent.arrayBuffer();

    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        type: file.mimeType,
        size: file.sizeOriginal,
        lastModified: file.$updatedAt ? new Date(file.$updatedAt).getTime() : Date.now(),
        arrayBuffer: Array.from(new Uint8Array(arrayBuffer)), // Convert to array for JSON
        bucketFileId: file.$id,
      },
    });
  } catch (error: any) {
    console.error('Error fetching file from storage:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch file from storage',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}




