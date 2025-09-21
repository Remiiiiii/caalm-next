import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/actions/file.actions';
import { createSessionClient } from '@/lib/appwrite';

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
    const { account } = await createSessionClient();
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

    // Upload file using the existing action
    const uploadedFile = await uploadFile({
      file,
      ownerId: userId,
      accountId,
      path: '/',
    });

    if (!uploadedFile) {
      throw new Error('File upload failed');
    }

    return NextResponse.json({
      data: uploadedFile,
      uploadId,
      message: 'File uploaded successfully',
    });
  } catch (error) {
    console.error('File upload error:', error);

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
