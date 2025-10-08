import { NextRequest, NextResponse } from 'next/server';
import { Client, Storage, Databases, ID } from 'node-appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

const client = new Client()
  .setEndpoint(appwriteConfig.endpointUrl!)
  .setProject(appwriteConfig.projectId!)
  .setKey(appwriteConfig.secretKey!);

const storage = new Storage(client);
const databases = new Databases(client);

export async function POST(request: NextRequest) {
  try {
    // Check if required Appwrite config is available
    if (
      !appwriteConfig.profilePicturesBucketId ||
      !appwriteConfig.databaseId ||
      !appwriteConfig.usersCollectionId
    ) {
      return NextResponse.json(
        {
          error:
            'Storage configuration is missing. Please check environment variables.',
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Delete existing profile picture if it exists
    try {
      const user = await databases.getDocument(
        appwriteConfig.databaseId!,
        appwriteConfig.usersCollectionId!,
        userId
      );

      if (user.profileImageId) {
        await storage.deleteFile(
          appwriteConfig.profilePicturesBucketId!,
          user.profileImageId
        );
      }
    } catch (error) {
      // User might not exist or no existing profile picture
      console.log('No existing profile picture to delete');
    }

    // Upload new file
    console.log('Uploading to bucket:', appwriteConfig.profilePicturesBucketId);
    const uploadedFile = await storage.createFile(
      appwriteConfig.profilePicturesBucketId!,
      ID.unique(),
      file
    );
    console.log('File uploaded with ID:', uploadedFile.$id);

    // Get file URL
    const fileUrl = storage.getFileView(
      appwriteConfig.profilePicturesBucketId!,
      uploadedFile.$id
    );

    // Update user document with new profile image
    await databases.updateDocument(
      appwriteConfig.databaseId!,
      appwriteConfig.usersCollectionId!,
      userId,
      {
        profileImageId: uploadedFile.$id,
        profileImage: fileUrl.toString(),
      }
    );

    return NextResponse.json({
      success: true,
      imageUrl: fileUrl.toString(),
      fileId: uploadedFile.$id,
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);

    let errorMessage = 'Failed to upload profile picture';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get user document to find profile image ID
    const user = await databases.getDocument(
      appwriteConfig.databaseId!,
      appwriteConfig.usersCollectionId!,
      userId
    );

    if (user.profileImageId) {
      // Delete file from storage
      await storage.deleteFile(
        appwriteConfig.profilePicturesBucketId!,
        user.profileImageId
      );

      // Update user document to remove profile image
      await databases.updateDocument(
        appwriteConfig.databaseId!,
        appwriteConfig.usersCollectionId!,
        userId,
        {
          profileImageId: null,
          profileImage: null,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile picture deleted successfully',
    });
  } catch (error) {
    console.error('Profile picture delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete profile picture' },
      { status: 500 }
    );
  }
}
